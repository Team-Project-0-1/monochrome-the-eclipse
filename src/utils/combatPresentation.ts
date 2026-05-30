import {
  CharacterClass,
  CoinFace,
  CombatEffect as CombatEffectData,
  DetectedPattern,
  EnemyCharacter,
  EnemyIntent,
  PatternType,
  PlayerCharacter,
  StatusEffectType,
} from '../types';

export type SkillMotionToken = 'skill' | 'strike' | 'guard' | 'ultimate';
export type CombatResultTone = 'player' | 'enemy' | 'system' | 'status';

export interface CombatResultBanner {
  id: number;
  tone: CombatResultTone;
  title: string;
  detail: string;
}

export interface PatternGroup {
  type: PatternType;
  face?: CoinFace;
  patterns: DetectedPattern[];
}

export const patternLabels: Record<PatternType, string> = {
  [PatternType.PAIR]: '2연',
  [PatternType.TRIPLE]: '3연',
  [PatternType.QUAD]: '4연',
  [PatternType.PENTA]: '5연',
  [PatternType.UNIQUE]: '유일',
  [PatternType.AWAKENING]: '각성',
};

export const patternOrder: Record<PatternType, number> = {
  [PatternType.PAIR]: 1,
  [PatternType.TRIPLE]: 2,
  [PatternType.QUAD]: 3,
  [PatternType.PENTA]: 4,
  [PatternType.UNIQUE]: 5,
  [PatternType.AWAKENING]: 6,
};

export const statusLabels: Record<StatusEffectType, string> = {
  [StatusEffectType.AMPLIFY]: '증폭',
  [StatusEffectType.RESONANCE]: '공명',
  [StatusEffectType.MARK]: '표식',
  [StatusEffectType.BLEED]: '출혈',
  [StatusEffectType.COUNTER]: '반격',
  [StatusEffectType.SHATTER]: '분쇄',
  [StatusEffectType.CURSE]: '저주',
  [StatusEffectType.SEAL]: '봉인',
  [StatusEffectType.PURSUIT]: '추적',
};

export const characterClassTokens: Record<CharacterClass, string> = {
  [CharacterClass.WARRIOR]: 'warrior',
  [CharacterClass.ROGUE]: 'rogue',
  [CharacterClass.TANK]: 'tank',
  [CharacterClass.MAGE]: 'mage',
};

export const faceLabel = (face?: CoinFace | null) => {
  if (face === CoinFace.HEADS) return '앞면';
  if (face === CoinFace.TAILS) return '뒷면';
  return '혼합';
};

export const faceClass = (face?: CoinFace | null) => {
  if (face === CoinFace.HEADS) return 'is-heads';
  if (face === CoinFace.TAILS) return 'is-tails';
  return 'is-mixed';
};

export const getIntentPatternLabel = (intent: EnemyIntent | null | undefined, enemy?: EnemyCharacter | null): string | null => {
  const indices = intent?.sourceCoinIndices ?? [];
  if (indices.length === 0) return null;

  const matchingPattern = intent?.sourcePatternType
    ? { type: intent.sourcePatternType, face: intent.sourcePatternFace }
    : enemy?.detectedPatterns.find(pattern => (
        pattern.indices.length === indices.length &&
        pattern.indices.every((index, position) => indices[position] === index)
      ));

  if (!matchingPattern) return `${indices.length}개`;

  return `${patternLabels[matchingPattern.type]} ${faceLabel(matchingPattern.face)}`;
};

export const getEffectAmount = (effect: CombatEffectData, key = 'amount') => {
  const value = Number(effect.data?.[key] ?? effect.data?.value ?? 0);
  return Number.isFinite(value) ? value : 0;
};

export const isPositiveDamage = (effect: CombatEffectData) => (
  effect.type === 'damage' && getEffectAmount(effect) > 0
);

export const getSkillMotionToken = (effect?: CombatEffectData): SkillMotionToken => {
  if (!effect || effect.type !== 'skill') return 'skill';

  const name = String(effect.data?.name ?? '');
  if (/방어|막|갑주|유지|재정비|후퇴|교체|고정|회복|보호|수비/.test(name)) return 'guard';
  if (/각성|해방|파멸|전탄|폭풍|저주|이클립스|궁극/.test(name)) return 'ultimate';
  if (/추적|사격|탄환|일격|돌진|타격|강타|참격|공격|베기|소리|굽쇠/.test(name)) return 'strike';

  return 'skill';
};

export const getEffectBanner = (effect: CombatEffectData): CombatResultBanner | null => {
  if (effect.type === 'skill') {
    return {
      id: effect.id,
      tone: effect.target === 'player' ? 'player' : 'enemy',
      title: String(effect.data?.name ?? '기술 발동'),
      detail: effect.target === 'player' ? '플레이어 기술' : '적 행동',
    };
  }

  if (effect.type === 'damage') {
    const amount = getEffectAmount(effect);
    if (amount <= 0) return null;
    return {
      id: effect.id,
      tone: effect.target === 'enemy' ? 'player' : 'enemy',
      title: effect.target === 'enemy' ? `적에게 ${amount} 피해` : `${amount} 피해 받음`,
      detail: effect.target === 'enemy' ? '공격 성공' : '방어 필요',
    };
  }

  if (effect.type === 'heal' || effect.type === 'defense') {
    const amount = getEffectAmount(effect);
    return {
      id: effect.id,
      tone: effect.type === 'heal' ? 'player' : 'system',
      title: effect.type === 'heal' ? `체력 +${amount}` : `방어 +${amount}`,
      detail: effect.target === 'player' ? '플레이어 강화' : '적 강화',
    };
  }

  if (effect.type === 'status') {
    const statusType = effect.data?.statusType as StatusEffectType | undefined;
    const label = statusType ? statusLabels[statusType] : '상태 변화';
    const value = getEffectAmount(effect, 'value');
    return {
      id: effect.id,
      tone: 'status',
      title: `${label} ${value >= 0 ? '+' : ''}${value}`,
      detail: effect.target === 'player' ? '플레이어 상태' : '적 상태',
    };
  }

  return null;
};

export const hpPercent = (current: number, max: number) => {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
};

/**
 * HP 비율(0~100)을 디자인 토큰 색상으로 변환한다.
 * 탐험(HealthBar)과 전투(CombatOverheadVitals)가 공유하는 단일 정의로,
 * 두 화면이 같은 체력 색상 언어(안전 → 거래 → 위험)를 잇도록 한다.
 *
 *   > 60% : safe (초록)
 *   30~60% : trade (호박)
 *   <= 30% : danger (적)
 */
export const resolveHpColor = (percentage: number): string => {
  if (percentage > 60) return 'var(--color-tone-safe)';
  if (percentage > 30) return 'var(--color-tone-trade)';
  return 'var(--color-tone-danger)';
};

export const formatTier = (tier: EnemyCharacter['tier']) => {
  if (tier === 'boss') return '보스';
  if (tier === 'miniboss') return '정예';
  return '일반';
};

export const getSpriteRow = (
  character: PlayerCharacter | EnemyCharacter,
  isPlayer: boolean,
  combatEffects: CombatEffectData[],
) => {
  if (character.currentHp <= 0) return character.spriteAnimations?.death ?? 3;

  const ownerTarget = isPlayer ? 'player' : 'enemy';
  const opponentTarget = isPlayer ? 'enemy' : 'player';
  const isUsingSkill = combatEffects.some(effect => effect.type === 'skill' && effect.target === ownerTarget);
  if (isUsingSkill) return character.spriteAnimations?.skill ?? 2;

  const isAttacking = combatEffects.some(effect => effect.type === 'damage' && effect.target === opponentTarget);
  if (isAttacking) return character.spriteAnimations?.attack ?? 1;

  return character.spriteAnimations?.idle ?? 0;
};
