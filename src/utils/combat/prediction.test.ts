import { describe, it, expect } from 'vitest';
import { calculateCombatPrediction } from './enemyIntent';
import { PatternType, CoinFace, EnemyIntent } from '../../types';
import { makePlayer, makeEnemy, makeDetectedPattern } from '../../test/fixtures';

// An idle/known enemy intent: no damage, no defense.
const idleIntent: EnemyIntent = {
  description: '숨을 고른다',
  damage: 0,
  defense: 0,
  sourcePatternKeys: [],
  sourceCoinIndices: [],
};

const attackIntent = (damage: number): EnemyIntent => ({
  description: '적 공격',
  damage,
  defense: 0,
  category: 'attack',
  sourcePatternKeys: ['X'],
  sourceCoinIndices: [0],
});

// WARRIOR base abilities resolved with no acquiredSkills:
//   PAIR/HEADS "진동 타격" -> fixedDamage 4
//   PAIR/TAILS "진동 방어막" -> defense 3
const headsPair = makeDetectedPattern({ type: PatternType.PAIR, face: CoinFace.HEADS, count: 2, indices: [0, 1] });
const tailsPair = makeDetectedPattern({ type: PatternType.PAIR, face: CoinFace.TAILS, count: 2, indices: [0, 1] });

describe('calculateCombatPrediction', () => {
  it('does not mutate the passed player or enemy objects', () => {
    const player = makePlayer();
    const enemy = makeEnemy();
    const playerClone = JSON.parse(JSON.stringify(player));
    const enemyClone = JSON.parse(JSON.stringify(enemy));

    calculateCombatPrediction(player, enemy, [headsPair], idleIntent, [], []);

    expect(player).toEqual(playerClone);
    expect(enemy).toEqual(enemyClone);
  });

  it('predicts zero attack and baseDef-only defense with no selected patterns vs idle intent', () => {
    const player = makePlayer({ baseDef: 2 });
    const enemy = makeEnemy();

    const prediction = calculateCombatPrediction(player, enemy, [], idleIntent, [], []);

    expect(prediction.player.attack.total).toBe(0);
    expect(prediction.player.defense.total).toBe(2);
    expect(prediction.damageToEnemy).toBe(0);
    expect(prediction.damageToPlayer).toBe(0);
  });

  it('adds the TANK_P_IMPLANT +6 defense unlock bonus on the empty-pattern case', () => {
    const player = makePlayer({ baseDef: 2 });
    const enemy = makeEnemy();

    const prediction = calculateCombatPrediction(player, enemy, [], idleIntent, [], ['TANK_P_IMPLANT']);

    // baseDef 2 + TANK_P_IMPLANT 6 = 8. No attack, so the +6 attack rider does not apply.
    expect(prediction.player.defense.total).toBe(8);
    expect(prediction.player.attack.total).toBe(0);
  });

  it('predicts positive damageToEnemy for an attack pattern', () => {
    const player = makePlayer();
    const enemy = makeEnemy({ baseDef: 0 });

    const prediction = calculateCombatPrediction(player, enemy, [headsPair], idleIntent, [], []);

    // "진동 타격" fixedDamage 4; enemy baseDef 0 + idle intent defense 0 -> 4 - 0 = 4.
    expect(prediction.player.attack.total).toBe(4);
    expect(prediction.damageToEnemy).toBe(4);
  });

  it('reduces predicted enemy damage by the enemy baseDef and intent defense', () => {
    const player = makePlayer();
    const enemy = makeEnemy({ baseDef: 1 });

    const intent: EnemyIntent = { ...idleIntent, defense: 1 };
    const prediction = calculateCombatPrediction(player, enemy, [headsPair], intent, [], []);

    // attack 4 - (baseDef 1 + intent.defense 1) = 2.
    expect(prediction.damageToEnemy).toBe(2);
  });

  it('adds a defensive pattern effect into predicted player defense', () => {
    const player = makePlayer({ baseDef: 0 });
    const enemy = makeEnemy();

    const prediction = calculateCombatPrediction(player, enemy, [tailsPair], idleIntent, [], []);

    // "진동 방어막" defense 3 + baseDef 0 = 3. No fixedDamage -> attack stays 0.
    expect(prediction.player.defense.total).toBe(3);
    expect(prediction.player.attack.total).toBe(0);
  });

  it('reflects an enemy attack intent into damageToPlayer after player defense', () => {
    const player = makePlayer({ baseDef: 0 });
    const enemy = makeEnemy();

    const prediction = calculateCombatPrediction(player, enemy, [], attackIntent(9), [], []);

    // enemyIntent.damage 9 - playerDefense 0 = 9; intent total mirrors the intent damage.
    expect(prediction.damageToPlayer).toBe(9);
    expect(prediction.enemy.attack.total).toBe(9);
  });

  it('clamps damageToPlayer to zero when player defense exceeds the incoming damage', () => {
    const player = makePlayer({ baseDef: 0 });
    const enemy = makeEnemy();

    // tailsPair grants 3 defense; an intent of 2 damage is fully absorbed.
    const prediction = calculateCombatPrediction(player, enemy, [tailsPair], attackIntent(2), [], []);

    expect(prediction.player.defense.total).toBe(3);
    expect(prediction.damageToPlayer).toBe(0);
  });
});
