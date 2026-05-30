import { describe, it, expect } from 'vitest';
import { determineEnemyIntent } from './enemyIntent';
import { PatternType, CoinFace } from '../../types';
import { makeEnemy, makeDetectedPattern } from '../../test/fixtures';

describe('determineEnemyIntent', () => {
  it('returns the idle "숨을 고른다" intent when no detected pattern matches a skill', () => {
    const enemy = makeEnemy({ key: 'infectedDog', detectedPatterns: [] });
    const intent = determineEnemyIntent(enemy);
    expect(intent.description).toBe('숨을 고른다');
    expect(intent.damage).toBe(0);
    expect(intent.defense).toBe(0);
    expect(intent.sourcePatternKeys).toEqual([]);
  });

  it('returns the idle intent for an unknown monster key', () => {
    // Default fixture key is not in monsterData -> no patterns -> idle.
    const enemy = makeEnemy({
      detectedPatterns: [
        makeDetectedPattern({ type: PatternType.TRIPLE, face: CoinFace.HEADS, count: 3, indices: [0, 1, 2] }),
      ],
    });
    const intent = determineEnemyIntent(enemy);
    expect(intent.description).toBe('숨을 고른다');
  });

  it('maps a TRIPLE/HEADS pattern on infectedDog to NECKBITE (attack, danger high)', () => {
    // INFECTEDDOG_NECKBITE: fixedDamage 6 + CURSE 2 to the player.
    const enemy = makeEnemy({
      key: 'infectedDog',
      baseDef: 0,
      detectedPatterns: [
        makeDetectedPattern({ type: PatternType.TRIPLE, face: CoinFace.HEADS, count: 3, indices: [0, 1, 2] }),
      ],
    });
    const intent = determineEnemyIntent(enemy);

    expect(intent.description).toBe('목 물어뜯기');
    expect(intent.damage).toBe(6);
    expect(intent.defense).toBe(0);
    expect(intent.category).toBe('attack');
    expect(intent.hitCount).toBe(1);
    // damage < 10 and not a high pattern, but harmful CURSE + damage > 0 -> high.
    expect(intent.dangerLevel).toBe('high');
    expect(intent.rangeLabel).toBe('플레이어 1명');
    expect(intent.sourcePatternKeys).toEqual(['INFECTEDDOG_NECKBITE']);
    expect(intent.sourcePatternType).toBe(PatternType.TRIPLE);
    expect(intent.sourcePatternFace).toBe(CoinFace.HEADS);
  });

  it('maps a TAILS PAIR on infectedDog to the defensive PUS skill (buff category)', () => {
    // INFECTEDDOG_PUS: defense 3, no damage -> category 'buff', defense reflected.
    const enemy = makeEnemy({
      key: 'infectedDog',
      baseDef: 0,
      detectedPatterns: [
        makeDetectedPattern({ type: PatternType.PAIR, face: CoinFace.TAILS, count: 2, indices: [0, 1] }),
      ],
    });
    const intent = determineEnemyIntent(enemy);

    expect(intent.description).toBe('차오르는 고름');
    expect(intent.damage).toBe(0);
    expect(intent.defense).toBe(3);
    expect(intent.category).toBe('buff');
    expect(intent.dangerLevel).toBe('normal');
    expect(intent.rangeLabel).toBe('자신');
  });

  it('adds the enemy baseDef into the reported intent defense', () => {
    const enemy = makeEnemy({
      key: 'infectedDog',
      baseDef: 5,
      detectedPatterns: [
        makeDetectedPattern({ type: PatternType.PAIR, face: CoinFace.TAILS, count: 2, indices: [0, 1] }),
      ],
    });
    const intent = determineEnemyIntent(enemy);
    // PUS defense 3 + baseDef 5 = 8
    expect(intent.defense).toBe(8);
  });

  it('prefers the highest-count detected pattern when several match', () => {
    // Both a HEADS PAIR (BITE, dmg 4) and a HEADS TRIPLE (NECKBITE, dmg 6) are
    // present; availableDetectedPatterns sorts by count desc, so TRIPLE wins.
    const enemy = makeEnemy({
      key: 'infectedDog',
      detectedPatterns: [
        makeDetectedPattern({ type: PatternType.PAIR, face: CoinFace.HEADS, count: 2, indices: [0, 1] }),
        makeDetectedPattern({ type: PatternType.TRIPLE, face: CoinFace.HEADS, count: 3, indices: [0, 1, 2] }),
      ],
    });
    const intent = determineEnemyIntent(enemy);
    expect(intent.description).toBe('목 물어뜯기');
    expect(intent.damage).toBe(6);
  });
});
