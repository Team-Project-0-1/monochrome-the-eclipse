import { describe, it, expect } from 'vitest';
import { summarizeRunHistory } from './runStats';
import { CharacterClass, type RunRecord } from '../types';

const run = (o: Partial<RunRecord> & Pick<RunRecord, 'outcome'>): RunRecord => ({
  ts: 0,
  characterClass: CharacterClass.WARRIOR,
  finalStage: 1,
  finalTurn: 1,
  echoCollected: 0,
  ...o,
});

describe('summarizeRunHistory', () => {
  it('returns zeroed summary for an empty history', () => {
    const s = summarizeRunHistory([]);
    expect(s.total).toBe(0);
    expect(s.overall).toEqual({ wins: 0, losses: 0, winrate: 0 });
    expect(s.winrateByCharacter).toEqual({});
    expect(s.deathsByStage).toEqual({});
    expect(s.lastRun).toBeNull();
  });

  it('computes winrate per character (rounded 0~100)', () => {
    const s = summarizeRunHistory([
      run({ outcome: 'victory', characterClass: CharacterClass.WARRIOR }),
      run({ outcome: 'death', characterClass: CharacterClass.WARRIOR, finalStage: 2 }),
      run({ outcome: 'death', characterClass: CharacterClass.WARRIOR, finalStage: 2 }),
      run({ outcome: 'victory', characterClass: CharacterClass.MAGE }),
    ]);
    // WARRIOR: 1 win / 3 → 33%
    expect(s.winrateByCharacter[CharacterClass.WARRIOR]).toEqual({ wins: 1, losses: 2, winrate: 33 });
    // MAGE: 1 win / 1 → 100%
    expect(s.winrateByCharacter[CharacterClass.MAGE]).toEqual({ wins: 1, losses: 0, winrate: 100 });
    // overall: 2 wins / 4 runs → 50%
    expect(s.overall).toEqual({ wins: 2, losses: 2, winrate: 50 });
  });

  it('reports winrate 0 (not NaN) when a character only lost', () => {
    const s = summarizeRunHistory([run({ outcome: 'death', characterClass: CharacterClass.TANK })]);
    expect(s.winrateByCharacter[CharacterClass.TANK]).toEqual({ wins: 0, losses: 1, winrate: 0 });
  });

  it('counts deathsByStage for deaths only (victories excluded)', () => {
    const s = summarizeRunHistory([
      run({ outcome: 'death', finalStage: 1 }),
      run({ outcome: 'death', finalStage: 1 }),
      run({ outcome: 'death', finalStage: 3 }),
      run({ outcome: 'victory', finalStage: 2 }),
    ]);
    expect(s.deathsByStage).toEqual({ 1: 2, 3: 1 });
  });

  it('lastRun is the final entry in the window', () => {
    const last = run({ outcome: 'victory', characterClass: CharacterClass.ROGUE, finalStage: 3 });
    const s = summarizeRunHistory([run({ outcome: 'death' }), last]);
    expect(s.lastRun).toBe(last);
    expect(s.total).toBe(2);
  });
});
