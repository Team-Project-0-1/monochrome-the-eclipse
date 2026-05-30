import {
  CharacterClass,
  CoinFace,
  type Coin,
  type DetectedPattern,
  type EnemyCharacter,
  type PlayerCharacter,
  type StatusEffects,
  StatusEffectType,
} from '../types';

/**
 * A fully-zeroed StatusEffects object. Every status type is explicitly 0 so
 * tests can reason about exact stack counts without `undefined` ambiguity.
 */
export const makeStatusEffects = (
  overrides: Partial<StatusEffects> = {},
): StatusEffects => ({
  [StatusEffectType.AMPLIFY]: 0,
  [StatusEffectType.RESONANCE]: 0,
  [StatusEffectType.MARK]: 0,
  [StatusEffectType.BLEED]: 0,
  [StatusEffectType.COUNTER]: 0,
  [StatusEffectType.SHATTER]: 0,
  [StatusEffectType.CURSE]: 0,
  [StatusEffectType.SEAL]: 0,
  [StatusEffectType.PURSUIT]: 0,
  ...overrides,
});

/**
 * Builds a valid PlayerCharacter. MUST carry a `class` field — the runtime
 * discriminator `isEnemyCharacter` keys off `!('class' in character)`.
 */
export const makePlayer = (
  overrides: Partial<PlayerCharacter> = {},
): PlayerCharacter => {
  const { statusEffects, ...rest } = overrides;
  return {
    name: 'Tester',
    currentHp: 100,
    maxHp: 100,
    baseAtk: 5,
    baseDef: 0,
    temporaryDefense: 0,
    statusEffects: makeStatusEffects(statusEffects),
    temporaryEffects: {},
    class: CharacterClass.WARRIOR,
    title: 'The Tester',
    acquiredSkills: [],
    memoryUpgrades: { maxHp: 0, baseAtk: 0, baseDef: 0 },
    activeSkillCooldown: 0,
    ...rest,
  };
};

/**
 * Builds a valid EnemyCharacter. MUST NOT carry a `class` field. Default `key`
 * is a fake/passive-free value so combat-helper tests never accidentally
 * trigger `hasMonsterPassive` bonuses; enemyIntent tests override `key` with a
 * real monster id (e.g. 'infectedDog').
 */
export const makeEnemy = (
  overrides: Partial<EnemyCharacter> = {},
): EnemyCharacter => {
  const { statusEffects, ...rest } = overrides;
  return {
    name: 'Dummy',
    currentHp: 30,
    maxHp: 30,
    baseAtk: 0,
    baseDef: 0,
    temporaryDefense: 0,
    statusEffects: makeStatusEffects(statusEffects),
    temporaryEffects: {},
    key: '__test_dummy__',
    coins: [],
    detectedPatterns: [],
    tier: 'normal',
    ...rest,
  };
};

let nextCoinId = 1;

/** Build a Coin[] from a face string sequence, e.g. coins('HHT TT'). */
export const makeCoins = (faces: CoinFace[]): Coin[] =>
  faces.map((face) => ({ face, locked: false, id: nextCoinId++ }));

export const H = CoinFace.HEADS;
export const T = CoinFace.TAILS;

/** Convenience: detected-pattern literal for enemyIntent fixtures. */
export const makeDetectedPattern = (
  overrides: Partial<DetectedPattern> & Pick<DetectedPattern, 'type'>,
): DetectedPattern => ({
  id: `p-${overrides.type}`,
  count: overrides.count ?? 0,
  indices: overrides.indices ?? [],
  ...overrides,
});
