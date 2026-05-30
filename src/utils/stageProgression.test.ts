import { describe, it, expect } from 'vitest';
import {
  isStagePlayable,
  isDocumentedFinalStage,
  DOCUMENTED_STAGE_COUNT,
} from './stageProgression';
import { stageData } from '../data/dataStages';

const documentedStages = Object.keys(stageData).map(Number);

describe('isStagePlayable', () => {
  // Regression guard: every documented stage must keep a complete monster set
  // (combat pool + miniboss + boss all present in monsterData). Adding a stage
  // with missing data, or deleting a referenced monster, fails here.
  it.each(documentedStages)('stage %i has a complete, playable monster set', (stageNumber) => {
    expect(isStagePlayable(stageNumber)).toBe(true);
  });

  it('returns false for stage numbers with no data', () => {
    expect(isStagePlayable(0)).toBe(false);
    expect(isStagePlayable(99)).toBe(false);
    expect(isStagePlayable(-1)).toBe(false);
  });
});

describe('isDocumentedFinalStage', () => {
  it.each([
    [DOCUMENTED_STAGE_COUNT - 1, false],
    [DOCUMENTED_STAGE_COUNT, true],
    [DOCUMENTED_STAGE_COUNT + 1, true],
  ] as const)('stage %i → finalStage=%s', (stageNumber, expected) => {
    expect(isDocumentedFinalStage(stageNumber)).toBe(expected);
  });
});

describe('DOCUMENTED_STAGE_COUNT', () => {
  it('matches the number of stages defined in stageData', () => {
    expect(DOCUMENTED_STAGE_COUNT).toBe(documentedStages.length);
  });
});
