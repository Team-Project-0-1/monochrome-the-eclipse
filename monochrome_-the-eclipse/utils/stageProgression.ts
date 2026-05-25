import { stageData } from '../data/dataStages';
import { monsterData } from '../data/dataMonsters';

export const DOCUMENTED_STAGE_COUNT = 3;

export const isStagePlayable = (stageNumber: number): boolean => {
  const stage = stageData[stageNumber as keyof typeof stageData];
  if (!stage) return false;

  const combatPoolReady =
    stage.combatPool.length > 0 &&
    stage.combatPool.every((monsterKey) => Boolean(monsterData[monsterKey]));

  return combatPoolReady && Boolean(monsterData[stage.miniboss]) && Boolean(monsterData[stage.boss]);
};

export const isDocumentedFinalStage = (stageNumber: number): boolean => (
  stageNumber >= DOCUMENTED_STAGE_COUNT
);
