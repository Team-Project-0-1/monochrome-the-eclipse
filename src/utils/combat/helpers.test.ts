import { describe, it, expect, vi } from 'vitest';
import {
  getStatusValue,
  getTotalDebuffStacks,
  getAmplifyBonus,
  getAmplifyBonusFromUnlocks,
  applyHeal,
} from './helpers';
import { StatusEffectType } from '../../types';
import type { GameStoreDraft } from './types';
import { makePlayer } from '../../test/fixtures';

const makeDraft = (overrides: Partial<GameStoreDraft> = {}): GameStoreDraft => ({
  player: null,
  enemy: null,
  unlockedPatterns: [],
  playerCoins: [],
  selectedPatterns: [],
  enemyIntent: null,
  combatLog: [],
  combatTurn: 1,
  ...overrides,
});

describe('getStatusValue', () => {
  it('returns the stored stack count for a status type', () => {
    const player = makePlayer({ statusEffects: { [StatusEffectType.BLEED]: 4 } });
    expect(getStatusValue(player, StatusEffectType.BLEED)).toBe(4);
  });

  it('returns 0 for a status that is absent', () => {
    const player = makePlayer({ statusEffects: {} });
    expect(getStatusValue(player, StatusEffectType.CURSE)).toBe(0);
  });
});

describe('getTotalDebuffStacks', () => {
  it('sums only the debuff status types', () => {
    const player = makePlayer({
      statusEffects: {
        [StatusEffectType.CURSE]: 1,
        [StatusEffectType.SEAL]: 2,
        [StatusEffectType.RESONANCE]: 3,
        [StatusEffectType.MARK]: 4,
        [StatusEffectType.BLEED]: 5,
        [StatusEffectType.SHATTER]: 6,
        [StatusEffectType.PURSUIT]: 7,
      },
    });
    // 1+2+3+4+5+6+7 = 28
    expect(getTotalDebuffStacks(player)).toBe(28);
  });

  it('excludes AMPLIFY and COUNTER from the debuff total', () => {
    const player = makePlayer({
      statusEffects: {
        [StatusEffectType.AMPLIFY]: 99,
        [StatusEffectType.COUNTER]: 99,
        [StatusEffectType.BLEED]: 2,
      },
    });
    expect(getTotalDebuffStacks(player)).toBe(2);
  });
});

describe('getAmplifyBonusFromUnlocks', () => {
  it('returns floor(amplify / 2) with no relevant unlock', () => {
    const player = makePlayer({ statusEffects: { [StatusEffectType.AMPLIFY]: 6 } });
    expect(getAmplifyBonusFromUnlocks(player, [], true)).toBe(3);
  });

  it('adds +1 for players when WARRIOR_PASSIVE_AMP_BONUS_UP is unlocked', () => {
    const player = makePlayer({ statusEffects: { [StatusEffectType.AMPLIFY]: 6 } });
    expect(
      getAmplifyBonusFromUnlocks(player, ['WARRIOR_PASSIVE_AMP_BONUS_UP'], true),
    ).toBe(4);
  });

  it('does not apply the +1 unlock for non-players', () => {
    const player = makePlayer({ statusEffects: { [StatusEffectType.AMPLIFY]: 6 } });
    expect(
      getAmplifyBonusFromUnlocks(player, ['WARRIOR_PASSIVE_AMP_BONUS_UP'], false),
    ).toBe(3);
  });

  it('short-circuits to 0 when base bonus is 0, even with the unlock', () => {
    // floor(1 / 2) === 0 -> the +1 unlock never applies.
    const player = makePlayer({ statusEffects: { [StatusEffectType.AMPLIFY]: 1 } });
    expect(
      getAmplifyBonusFromUnlocks(player, ['WARRIOR_PASSIVE_AMP_BONUS_UP'], true),
    ).toBe(0);
  });
});

describe('getAmplifyBonus', () => {
  it('treats the state.player identity as the player branch', () => {
    const player = makePlayer({ statusEffects: { [StatusEffectType.AMPLIFY]: 6 } });
    const state = makeDraft({
      player,
      unlockedPatterns: ['WARRIOR_PASSIVE_AMP_BONUS_UP'],
    });
    // player === state.player -> isPlayer true -> 3 + 1
    expect(getAmplifyBonus(player, state)).toBe(4);
  });

  it('uses the non-player branch when the character is not state.player', () => {
    const player = makePlayer({ statusEffects: { [StatusEffectType.AMPLIFY]: 6 } });
    const someoneElse = makePlayer({ statusEffects: { [StatusEffectType.AMPLIFY]: 6 } });
    const state = makeDraft({
      player,
      unlockedPatterns: ['WARRIOR_PASSIVE_AMP_BONUS_UP'],
    });
    expect(getAmplifyBonus(someoneElse, state)).toBe(3);
  });

  it('falls back to no unlocks when no state is provided', () => {
    const player = makePlayer({ statusEffects: { [StatusEffectType.AMPLIFY]: 6 } });
    expect(getAmplifyBonus(player)).toBe(3);
  });
});

describe('applyHeal', () => {
  it('heals the target and returns a heal EffectPayload', () => {
    const log = vi.fn();
    const player = makePlayer({ currentHp: 40, maxHp: 100 });
    const effects = applyHeal(player, 25, log);
    expect(player.currentHp).toBe(65);
    expect(effects).toEqual([
      { type: 'heal', target: 'player', data: { amount: 25 } },
    ]);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('caps healing at maxHp and reports only the amount actually healed', () => {
    const log = vi.fn();
    const player = makePlayer({ currentHp: 90, maxHp: 100 });
    const effects = applyHeal(player, 25, log);
    expect(player.currentHp).toBe(100);
    expect(effects).toEqual([
      { type: 'heal', target: 'player', data: { amount: 10 } },
    ]);
  });

  it('returns [] and does not log when already at maxHp', () => {
    const log = vi.fn();
    const player = makePlayer({ currentHp: 100, maxHp: 100 });
    expect(applyHeal(player, 25, log)).toEqual([]);
    expect(log).not.toHaveBeenCalled();
  });

  it('returns [] for a non-positive heal amount', () => {
    const log = vi.fn();
    const player = makePlayer({ currentHp: 50, maxHp: 100 });
    expect(applyHeal(player, 0, log)).toEqual([]);
    expect(player.currentHp).toBe(50);
    expect(log).not.toHaveBeenCalled();
  });
});
