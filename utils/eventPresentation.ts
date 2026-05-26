import { CharacterClass, EventChoice } from '../types';

export interface EventResourceState {
  echoRemnants: number;
  senseFragments: number;
  memoryPieces: number;
}

export interface EventChoicePresentation {
  locked: boolean;
  requirementLabel: string | null;
  oddsLabel: string;
  riskLabel: string;
  rewardLabel: string;
}

const outcomeLabels: Record<string, string> = {
  combat: '전투 발생',
  curse: '저주',
  damage: '피해',
  echoRemnants: '에코',
  memoryPieces: '기억',
  reserveCoinsGained: '예비 동전',
  senseFragments: '감각',
};

const classLabels: Record<CharacterClass, string> = {
  [CharacterClass.WARRIOR]: '전사',
  [CharacterClass.ROGUE]: '추적자',
  [CharacterClass.TANK]: '수호자',
  [CharacterClass.MAGE]: '마도사',
};

const resourceLabels: Record<keyof EventResourceState, string> = {
  echoRemnants: '에코',
  senseFragments: '감각',
  memoryPieces: '기억',
};

const summarizeOutcome = (outcome: { [key: string]: any } | null | undefined, fallback: string): string => {
  if (!outcome) return fallback;

  const labels = Object.keys(outcome)
    .filter((key) => key !== 'message' && key !== 'followUp')
    .map((key) => outcomeLabels[key] ?? key);

  return labels.length > 0 ? labels.slice(0, 2).join(' / ') : fallback;
};

export const getEventChoicePresentation = (
  choice: EventChoice,
  playerClass: CharacterClass,
  resources?: EventResourceState,
): EventChoicePresentation => {
  const classLocked = Boolean(choice.requiredSense && choice.requiredSense !== playerClass);
  const missingResource = choice.requiredResources && resources
    ? (Object.entries(choice.requiredResources) as [keyof EventResourceState, number][])
        .find(([key, value]) => (resources[key] ?? 0) < value)
    : null;
  const locked = classLocked || Boolean(missingResource);
  const requirementParts = [
    choice.requiredSense ? `${classLabels[choice.requiredSense]} 필요` : null,
    missingResource ? `${resourceLabels[missingResource[0]]} ${missingResource[1]} 필요` : null,
  ].filter(Boolean);
  const requirementLabel = requirementParts.length > 0 ? requirementParts.join(' / ') : null;

  if (choice.guaranteed) {
    return {
      locked,
      requirementLabel,
      oddsLabel: '확정',
      riskLabel: '위험 낮음',
      rewardLabel: summarizeOutcome(choice.result, '결과 확인'),
    };
  }

  const baseRate = choice.baseSuccessRate ?? 0;
  const bonus = choice.senseBonus?.[playerClass] ?? 0;
  const successRate = Math.min(100, Math.max(0, baseRate + bonus));

  return {
    locked,
    requirementLabel,
    oddsLabel: `${successRate}%`,
    riskLabel: summarizeOutcome(choice.failure, '실패 가능'),
    rewardLabel: summarizeOutcome(choice.success, '보상 가능'),
  };
};
