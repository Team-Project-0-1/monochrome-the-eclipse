import { stageData } from '../data/dataStages';
import { monsterData, monsterPatterns } from '../data/dataMonsters';
import { isStagePlayable } from './stageProgression';

export interface ContentValidationIssue {
  severity: 'warning' | 'error';
  scope: string;
  message: string;
}

export const validateContentManifest = (): ContentValidationIssue[] => {
  const issues: ContentValidationIssue[] = [];

  Object.entries(stageData).forEach(([stageNumber, stage]) => {
    const scope = `Stage ${stageNumber}: ${stage.name}`;

    if (!isStagePlayable(Number(stageNumber))) {
      issues.push({
        severity: 'warning',
        scope,
        message: '문서상 존재하지만 플레이 가능한 몬스터/미니보스/보스 데이터가 아직 완성되지 않았습니다.',
      });
      return;
    }

    [...stage.combatPool, stage.miniboss, stage.boss].forEach((monsterKey) => {
      const monster = monsterData[monsterKey];
      if (!monster) {
        issues.push({
          severity: 'error',
          scope,
          message: `몬스터 '${monsterKey}' 데이터가 없습니다.`,
        });
        return;
      }

      monster.patterns.forEach((patternKey) => {
        if (!monsterPatterns[patternKey]) {
          issues.push({
            severity: 'error',
            scope: `${scope} / ${monster.name}`,
            message: `패턴 '${patternKey}' 구현이 없습니다.`,
          });
        }
      });
    });
  });

  return issues;
};
