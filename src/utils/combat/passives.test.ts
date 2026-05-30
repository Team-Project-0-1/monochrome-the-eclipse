import { describe, it, expect, vi } from 'vitest';
import { applyDamage } from './passives';
import type { GameStoreDraft, LogFn } from './types';
import { makePlayer, makeEnemy } from '../../test/fixtures';

const noopLog: LogFn = () => {};

/**
 * Wires the SAME player/enemy instances into the draft. The combat code uses
 * identity checks (`=== state.player`, `=== state.enemy`) extensively, so the
 * instances passed as caster/target must be the ones stored on the draft.
 */
const makeDraft = (
  player: GameStoreDraft['player'],
  enemy: GameStoreDraft['enemy'],
  overrides: Partial<GameStoreDraft> = {},
): GameStoreDraft => ({
  player,
  enemy,
  unlockedPatterns: [],
  playerCoins: [],
  selectedPatterns: [],
  enemyIntent: null,
  combatLog: [],
  combatTurn: 1,
  ...overrides,
});

describe('applyDamage - base behaviour', () => {
  it('subtracts temporaryDefense from incoming damage', () => {
    const player = makePlayer();
    const enemy = makeEnemy({ currentHp: 30, temporaryDefense: 4 });
    const state = makeDraft(player, enemy);

    const { damageDealt } = applyDamage(player, enemy, 10, noopLog, state, { isFixed: true });
    // 10 - 4 temporaryDefense = 6
    expect(damageDealt).toBe(6);
    expect(enemy.currentHp).toBe(24);
  });

  it('does NOT subtract baseDef (only temporaryDefense reduces damage)', () => {
    // Regression guard: applyDamage never reads baseDef. High baseDef with zero
    // temporaryDefense must leave damage undiminished.
    const player = makePlayer();
    const enemy = makeEnemy({ currentHp: 30, baseDef: 99, temporaryDefense: 0 });
    const state = makeDraft(player, enemy);

    const { damageDealt } = applyDamage(player, enemy, 10, noopLog, state, { isFixed: true });
    expect(damageDealt).toBe(10);
    expect(enemy.currentHp).toBe(20);
  });

  it('ignores defense entirely when ignoreDefense is set', () => {
    const player = makePlayer();
    const enemy = makeEnemy({ currentHp: 30, temporaryDefense: 8 });
    const state = makeDraft(player, enemy);

    const { damageDealt } = applyDamage(player, enemy, 10, noopLog, state, {
      isFixed: true,
      ignoreDefense: true,
    });
    expect(damageDealt).toBe(10);
    expect(enemy.currentHp).toBe(20);
  });

  it('floors HP at 0 and reports damageDealt as HP actually removed', () => {
    const player = makePlayer();
    const enemy = makeEnemy({ currentHp: 7, temporaryDefense: 0 });
    const state = makeDraft(player, enemy);

    const { damageDealt } = applyDamage(player, enemy, 100, noopLog, state, { isFixed: true });
    expect(enemy.currentHp).toBe(0);
    // damageDealt is HP removed (7), not the raw 100.
    expect(damageDealt).toBe(7);
  });

  it('clamps final damage to 0 when defense exceeds incoming damage', () => {
    const player = makePlayer();
    const enemy = makeEnemy({ currentHp: 30, temporaryDefense: 20 });
    const state = makeDraft(player, enemy);

    const { damageDealt, effects } = applyDamage(player, enemy, 5, noopLog, state, { isFixed: true });
    expect(damageDealt).toBe(0);
    expect(enemy.currentHp).toBe(30);
    // No actual damage -> no damage effect emitted.
    expect(effects.some((e) => e.type === 'damage')).toBe(false);
  });

  it('returns early with no effect for non-positive damage', () => {
    const log = vi.fn();
    const player = makePlayer();
    const enemy = makeEnemy({ currentHp: 30 });
    const state = makeDraft(player, enemy);

    const result = applyDamage(player, enemy, 0, log, state, { isFixed: true });
    expect(result).toEqual({ damageDealt: 0, effects: [] });
    expect(enemy.currentHp).toBe(30);
    expect(log).not.toHaveBeenCalled();
  });

  it('emits a damage EffectPayload targeting the enemy on a real hit', () => {
    const player = makePlayer();
    const enemy = makeEnemy({ currentHp: 30, temporaryDefense: 2 });
    const state = makeDraft(player, enemy);

    const { effects } = applyDamage(player, enemy, 10, noopLog, state, { isFixed: true });
    expect(effects).toContainEqual({ type: 'damage', target: 'enemy', data: { amount: 8 } });
  });

  it('targets the player when the player takes the hit', () => {
    const player = makePlayer({ currentHp: 50, temporaryDefense: 0 });
    const enemy = makeEnemy();
    const state = makeDraft(player, enemy);

    const { effects, damageDealt } = applyDamage(enemy, player, 12, noopLog, state, { isFixed: true });
    expect(damageDealt).toBe(12);
    expect(player.currentHp).toBe(38);
    expect(effects).toContainEqual({ type: 'damage', target: 'player', data: { amount: 12 } });
  });
});

describe('applyDamage - SHATTER defense reduction', () => {
  it('reduces temporaryDefense by 15% per SHATTER stack (default rate)', () => {
    // temporaryDefense 10, 2 SHATTER stacks -> reduction floor(10 * 0.30) = 3 -> effective def 7.
    // Fixed damage 10 - 7 = 3.
    const player = makePlayer();
    const enemy = makeEnemy({
      currentHp: 30,
      temporaryDefense: 10,
      statusEffects: { SHATTER: 2 },
    });
    const state = makeDraft(player, enemy);

    const { damageDealt } = applyDamage(player, enemy, 10, noopLog, state, { isFixed: true });
    expect(damageDealt).toBe(3);
  });
});
