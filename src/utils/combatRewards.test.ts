import { describe, it, expect } from 'vitest';
import { createCombatRewardChoices, type CombatRewardChoice } from './combatRewards';
import { makeEnemy, makePlayer } from '../test/fixtures';
import { playerSkillUnlocks } from '../data/dataSkills';
import { patternUpgrades } from '../data/dataUpgrades';
import { MAX_SKILLS } from '../constants';
import { CharacterClass, type EnemyCharacter } from '../types';

type EnemyTier = EnemyCharacter['tier'];

// --- derive helpers ---------------------------------------------------------
// The draft generators return `min(poolSize, draftCount)`, so the *expected*
// number of skill/passive choices depends on the live data tables. Deriving the
// pool size here (instead of hard-coding "2 skills") means adding a new skill or
// passive to the data files does NOT spuriously fail these reward tests — they
// only fail if reward generation itself regresses.
const unacquiredSkills = (cls: CharacterClass, acquired: string[] = []) =>
  Object.values(playerSkillUnlocks[cls] ?? {}).filter((s) => !acquired.includes(s.id));

const lockedPassives = (cls: CharacterClass, unlocked: string[] = []) =>
  Object.values(patternUpgrades[cls] ?? {}).filter((p) => !unlocked.includes(p.id));

const skillChoices = (choices: CombatRewardChoice[]) => choices.filter((c) => c.skillId);
const passiveChoices = (choices: CombatRewardChoice[]) => choices.filter((c) => c.passiveId);
const byId = (choices: CombatRewardChoice[], id: string) => choices.find((c) => c.id === id);

const CORE_IDS = ['balanced_cache', 'sense_focus', 'memory_focus'] as const;

// Per-tier table. sense_focus echo = baseEcho-6, memory_focus echo = baseEcho-8,
// reserve echo = floor(baseEcho*0.5). With baseEcho >= 12 the Math.max floors
// (6 / 4) never clamp, so these are the genuine computed values, not floors.
const TIERS = [
  {
    tier: 'normal' as EnemyTier,
    balancedEcho: 12, baseSense: 1, baseMemory: 1,
    senseFocusEcho: 6, senseFocusSense: 3,
    memoryFocusEcho: 4, memoryFocusMemory: 3,
    skillDraft: 1, passiveDraft: 0,
    hasReserve: false, reserveEcho: 0,
  },
  {
    tier: 'miniboss' as EnemyTier,
    balancedEcho: 22, baseSense: 2, baseMemory: 2,
    senseFocusEcho: 16, senseFocusSense: 4,
    memoryFocusEcho: 14, memoryFocusMemory: 4,
    skillDraft: 2, passiveDraft: 2,
    hasReserve: true, reserveEcho: 11,
  },
  {
    tier: 'boss' as EnemyTier,
    balancedEcho: 32, baseSense: 3, baseMemory: 3,
    senseFocusEcho: 26, senseFocusSense: 5,
    memoryFocusEcho: 24, memoryFocusMemory: 5,
    skillDraft: 2, passiveDraft: 3,
    hasReserve: true, reserveEcho: 16,
  },
];

describe('createCombatRewardChoices — core choices', () => {
  it.each(TIERS)('always offers the 3 core caches for a $tier enemy', ({ tier }) => {
    const choices = createCombatRewardChoices(makeEnemy({ tier }), makePlayer());
    CORE_IDS.forEach((id) => expect(byId(choices, id)).toBeDefined());
  });
});

describe('createCombatRewardChoices — per-tier reward numbers', () => {
  it.each(TIERS)(
    'balanced_cache scales echo/sense/memory by $tier',
    ({ tier, balancedEcho, baseSense, baseMemory }) => {
      const choices = createCombatRewardChoices(makeEnemy({ tier }), makePlayer());
      expect(byId(choices, 'balanced_cache')!.rewards).toEqual({
        echoRemnants: balancedEcho,
        senseFragments: baseSense,
        memoryPieces: baseMemory,
      });
    },
  );

  it.each(TIERS)(
    'sense_focus trades echo for +2 sense by $tier',
    ({ tier, senseFocusEcho, senseFocusSense }) => {
      const choices = createCombatRewardChoices(makeEnemy({ tier }), makePlayer());
      expect(byId(choices, 'sense_focus')!.rewards).toEqual({
        echoRemnants: senseFocusEcho,
        senseFragments: senseFocusSense,
      });
    },
  );

  it.each(TIERS)(
    'memory_focus trades echo for +2 memory by $tier',
    ({ tier, memoryFocusEcho, memoryFocusMemory }) => {
      const choices = createCombatRewardChoices(makeEnemy({ tier }), makePlayer());
      expect(byId(choices, 'memory_focus')!.rewards).toEqual({
        echoRemnants: memoryFocusEcho,
        memoryPieces: memoryFocusMemory,
      });
    },
  );
});

describe('createCombatRewardChoices — reserve coin offer', () => {
  it.each(TIERS)('reserve_coin present iff elite/boss ($tier)', ({ tier, hasReserve, reserveEcho }) => {
    const choices = createCombatRewardChoices(makeEnemy({ tier }), makePlayer());
    const reserve = byId(choices, 'reserve_coin');
    if (!hasReserve) {
      expect(reserve).toBeUndefined();
      return;
    }
    expect(reserve!.rewards.reserveCoin).toBe(true);
    expect(reserve!.rewards.echoRemnants).toBe(reserveEcho);
  });
});

describe('createCombatRewardChoices — skill drafts (derived counts)', () => {
  it('WARRIOR has a non-empty skill pool (content sanity)', () => {
    expect(unacquiredSkills(CharacterClass.WARRIOR).length).toBeGreaterThan(0);
  });

  it.each(TIERS)('offers min(pool, draftCount) skill choices for $tier', ({ tier, skillDraft }) => {
    const player = makePlayer({ class: CharacterClass.WARRIOR });
    const choices = createCombatRewardChoices(makeEnemy({ tier }), player);
    const expected = Math.min(unacquiredSkills(CharacterClass.WARRIOR).length, skillDraft);
    expect(skillChoices(choices)).toHaveLength(expected);
  });

  it('every drafted skill is an unacquired skill from the class pool', () => {
    const player = makePlayer({ class: CharacterClass.WARRIOR });
    const choices = createCombatRewardChoices(makeEnemy({ tier: 'boss' }), player);
    const poolIds = new Set(unacquiredSkills(CharacterClass.WARRIOR).map((s) => s.id));
    for (const choice of skillChoices(choices)) {
      expect(poolIds.has(choice.skillId!)).toBe(true);
      expect(player.acquiredSkills).not.toContain(choice.skillId);
    }
  });

  it('offers no skill choices once acquiredSkills hits MAX_SKILLS', () => {
    const player = makePlayer({
      class: CharacterClass.WARRIOR,
      acquiredSkills: Array.from({ length: MAX_SKILLS }, (_, i) => `filler_${i}`),
    });
    const choices = createCombatRewardChoices(makeEnemy({ tier: 'boss' }), player);
    expect(skillChoices(choices)).toHaveLength(0);
  });
});

describe('createCombatRewardChoices — passive drafts (derived counts)', () => {
  it.each(TIERS)('offers min(pool, draftCount) passive choices for $tier', ({ tier, passiveDraft }) => {
    const player = makePlayer({ class: CharacterClass.WARRIOR });
    const choices = createCombatRewardChoices(makeEnemy({ tier }), player);
    const expected = Math.min(lockedPassives(CharacterClass.WARRIOR).length, passiveDraft);
    expect(passiveChoices(choices)).toHaveLength(expected);
  });

  it('normal enemies never offer a passive (draftCount 0)', () => {
    const choices = createCombatRewardChoices(makeEnemy({ tier: 'normal' }), makePlayer());
    expect(passiveChoices(choices)).toHaveLength(0);
  });

  it('excludes already-unlocked passives from the draft', () => {
    const pool = lockedPassives(CharacterClass.WARRIOR);
    if (pool.length === 0) return; // no passives to exclude; nothing to assert
    const unlocked = [pool[0].id];
    const choices = createCombatRewardChoices(makeEnemy({ tier: 'boss' }), makePlayer(), unlocked);
    for (const choice of passiveChoices(choices)) {
      expect(choice.passiveId).not.toBe(pool[0].id);
    }
  });
});

describe('createCombatRewardChoices — null player guard', () => {
  it('still offers the 3 core caches but no skill/passive drafts', () => {
    const choices = createCombatRewardChoices(makeEnemy({ tier: 'boss' }), null);
    CORE_IDS.forEach((id) => expect(byId(choices, id)).toBeDefined());
    expect(skillChoices(choices)).toHaveLength(0);
    expect(passiveChoices(choices)).toHaveLength(0);
  });
});

describe('createCombatRewardChoices — eclipseChoir secret techniques', () => {
  it('returns exactly the 3 fixed secret-technique choices, ignoring tier/drafts', () => {
    const choices = createCombatRewardChoices(
      makeEnemy({ key: 'eclipseChoir', tier: 'boss' }),
      makePlayer(),
    );
    expect(choices).toHaveLength(3);
    expect(choices.every((c) => Boolean(c.secretTechniqueId))).toBe(true);
    // The generic tier caches must NOT appear for the final boss reward.
    CORE_IDS.forEach((id) => expect(byId(choices, id)).toBeUndefined());
  });
});
