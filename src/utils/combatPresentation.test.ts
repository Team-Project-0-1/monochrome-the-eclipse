import { describe, it, expect } from 'vitest';
import {
  getEffectAmount,
  isPositiveDamage,
  getSkillMotionToken,
  getEffectBanner,
} from './combatPresentation';
import { CombatEffect, StatusEffectType } from '../types';

// CombatEffect = EffectPayload & { id: number }; every literal carries an id.
const damage = (amount: number, target: 'player' | 'enemy' = 'enemy', id = 1): CombatEffect =>
  ({ id, type: 'damage', target, data: { amount } });
const heal = (amount: number, target: 'player' | 'enemy' = 'player', id = 1): CombatEffect =>
  ({ id, type: 'heal', target, data: { amount } });
const defense = (amount: number, target: 'player' | 'enemy' = 'player', id = 1): CombatEffect =>
  ({ id, type: 'defense', target, data: { amount } });
const status = (
  statusType: StatusEffectType,
  value: number,
  target: 'player' | 'enemy' = 'player',
  id = 1,
): CombatEffect => ({ id, type: 'status', target, data: { statusType, value } });
const skill = (name: string, target: 'player' | 'enemy' = 'player', id = 1): CombatEffect =>
  ({ id, type: 'skill', target, data: { name } });
const tempStat = (value: number, id = 1): CombatEffect =>
  ({ id, type: 'temp_stat', target: 'player', data: { stat: 'attack', value, duration: 2 } });

describe('getEffectAmount', () => {
  it('returns data.amount for damage/heal/defense effects', () => {
    expect(getEffectAmount(damage(7))).toBe(7);
    expect(getEffectAmount(heal(4))).toBe(4);
    expect(getEffectAmount(defense(5))).toBe(5);
  });

  it('returns data.value for status and temp_stat effects', () => {
    expect(getEffectAmount(status(StatusEffectType.AMPLIFY, 3))).toBe(3);
    expect(getEffectAmount(tempStat(2))).toBe(2);
  });

  it('coerces a non-finite amount to 0', () => {
    expect(getEffectAmount(damage(Number.NaN))).toBe(0);
  });
});

describe('isPositiveDamage', () => {
  it('is true only for damage effects with amount > 0', () => {
    expect(isPositiveDamage(damage(3))).toBe(true);
  });

  it('is false for zero/negative damage', () => {
    expect(isPositiveDamage(damage(0))).toBe(false);
    expect(isPositiveDamage(damage(-5))).toBe(false);
  });

  it('is false for non-damage effects even with positive value', () => {
    expect(isPositiveDamage(heal(5))).toBe(false);
    expect(isPositiveDamage(status(StatusEffectType.AMPLIFY, 5))).toBe(false);
  });
});

describe('getSkillMotionToken', () => {
  it('maps guard keywords to "guard"', () => {
    // "진동 방어막" contains 방어 -> guard (checked before strike/ultimate).
    expect(getSkillMotionToken(skill('진동 방어막'))).toBe('guard');
  });

  it('maps ultimate keywords to "ultimate"', () => {
    // "해방" matches the ultimate keyword set.
    expect(getSkillMotionToken(skill('해방'))).toBe('ultimate');
  });

  it('maps strike keywords to "strike"', () => {
    // "진동 타격" -> 타격 -> strike (no guard/ultimate keyword present).
    expect(getSkillMotionToken(skill('진동 타격'))).toBe('strike');
  });

  it('falls back to "skill" for a name with no motion keyword', () => {
    expect(getSkillMotionToken(skill('공진'))).toBe('skill');
  });

  it('returns "skill" for a non-skill effect or undefined', () => {
    expect(getSkillMotionToken(damage(5))).toBe('skill');
    expect(getSkillMotionToken(undefined)).toBe('skill');
  });
});

describe('getEffectBanner', () => {
  it('builds a skill banner with player tone/detail when target is player', () => {
    expect(getEffectBanner(skill('진동 타격', 'player', 11))).toEqual({
      id: 11,
      tone: 'player',
      title: '진동 타격',
      detail: '플레이어 기술',
    });
  });

  it('builds a skill banner with enemy tone/detail when target is enemy', () => {
    expect(getEffectBanner(skill('목 물어뜯기', 'enemy', 12))).toEqual({
      id: 12,
      tone: 'enemy',
      title: '목 물어뜯기',
      detail: '적 행동',
    });
  });

  it('uses the fallback title when a skill effect has an empty name', () => {
    expect(getEffectBanner(skill('', 'player'))?.title).toBe('기술 발동');
  });

  it('routes damage dealt to the enemy as a positive "player" banner', () => {
    expect(getEffectBanner(damage(8, 'enemy', 20))).toEqual({
      id: 20,
      tone: 'player',
      title: '적에게 8 피해',
      detail: '공격 성공',
    });
  });

  it('routes damage taken by the player as an "enemy" banner', () => {
    expect(getEffectBanner(damage(6, 'player', 21))).toEqual({
      id: 21,
      tone: 'enemy',
      title: '6 피해 받음',
      detail: '방어 필요',
    });
  });

  it('returns null for a non-positive damage banner', () => {
    expect(getEffectBanner(damage(0, 'enemy'))).toBeNull();
    expect(getEffectBanner(damage(-3, 'player'))).toBeNull();
  });

  it('builds a heal banner with fixed "player" tone regardless of target', () => {
    expect(getEffectBanner(heal(4, 'player', 30))).toEqual({
      id: 30,
      tone: 'player',
      title: '체력 +4',
      detail: '플레이어 강화',
    });
    // tone stays 'player' for an enemy heal; only the detail flips.
    expect(getEffectBanner(heal(4, 'enemy', 31))).toEqual({
      id: 31,
      tone: 'player',
      title: '체력 +4',
      detail: '적 강화',
    });
  });

  it('builds a defense banner with fixed "system" tone regardless of target', () => {
    expect(getEffectBanner(defense(5, 'player', 40))).toEqual({
      id: 40,
      tone: 'system',
      title: '방어 +5',
      detail: '플레이어 강화',
    });
    expect(getEffectBanner(defense(5, 'enemy', 41))).toEqual({
      id: 41,
      tone: 'system',
      title: '방어 +5',
      detail: '적 강화',
    });
  });

  it('builds a status banner with label, signed value and "status" tone', () => {
    expect(getEffectBanner(status(StatusEffectType.AMPLIFY, 3, 'player', 50))).toEqual({
      id: 50,
      tone: 'status',
      title: '증폭 +3',
      detail: '플레이어 상태',
    });
    expect(getEffectBanner(status(StatusEffectType.CURSE, -2, 'enemy', 51))).toEqual({
      id: 51,
      tone: 'status',
      title: '저주 -2',
      detail: '적 상태',
    });
  });

  it('returns null for a temp_stat effect (no banner shape defined)', () => {
    expect(getEffectBanner(tempStat(2))).toBeNull();
  });
});
