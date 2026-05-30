import { describe, it, expect, beforeEach } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import { createTestStore } from '../../test/store';
import { makePlayer } from '../../test/fixtures';
import type { GameStore } from '../gameStore';
import {
  CharacterClass,
  CoinFace,
  GameState,
  MemoryUpgradeType,
  type Coin,
  type ShopItem,
  type PatternUpgradeDefinition,
  type SkillUpgradeDefinition,
} from '../../types';
import { MAX_SKILLS, MAX_RESERVE_COINS, MEMORY_UPGRADE_DATA } from '../../constants';

// --- item builders (full objects → type-safe) ------------------------------
const shopItem = (o: Partial<ShopItem> = {}): ShopItem => ({
  id: 'item', name: '', description: '', cost: 0, type: 'consumable', effect: {}, ...o,
});
const patternUpgrade = (
  o: Partial<PatternUpgradeDefinition> = {},
): PatternUpgradeDefinition & { type: 'upgrade' } => ({
  id: 'p', name: '', description: '', cost: { senseFragments: 0 }, type: 'upgrade', ...o,
});
// Purchase/replacement logic reads ONLY `id` + `cost.echoRemnants`; the
// `replaces`/`effect` fields are never invoked, so a partial cast is honest here.
const skillUpgrade = (id: string, echoRemnants: number): SkillUpgradeDefinition =>
  ({ id, name: id, description: '', cost: { echoRemnants } }) as unknown as SkillUpgradeDefinition;

const coin = (id: number): Coin => ({ face: null, locked: false, id });
const zeroResources = { echoRemnants: 0, senseFragments: 0, memoryPieces: 0 };

let store: StoreApi<GameStore>;
beforeEach(() => {
  store = createTestStore();
});

describe('playerSlice.handlePurchase — reserve coin', () => {
  beforeEach(() => {
    store.setState({
      player: makePlayer(),
      resources: { ...zeroResources, echoRemnants: 100 },
      reserveCoins: [],
      reserveCoinShopCost: 100,
    });
  });

  it('buys a reserve coin: deducts echo, raises next cost by 50, appends a coin', () => {
    store.getState().handlePurchase(shopItem({ id: 'reserve_coin' }));
    const s = store.getState();
    expect(s.resources.echoRemnants).toBe(0);
    expect(s.reserveCoinShopCost).toBe(150);
    expect(s.reserveCoins).toHaveLength(1);
  });

  it('no-ops when echo is below the reserve cost', () => {
    store.setState({ resources: { ...zeroResources, echoRemnants: 99 } });
    store.getState().handlePurchase(shopItem({ id: 'reserve_coin' }));
    const s = store.getState();
    expect(s.resources.echoRemnants).toBe(99);
    expect(s.reserveCoins).toHaveLength(0);
    expect(s.reserveCoinShopCost).toBe(100);
  });

  it('no-ops at MAX_RESERVE_COINS even with plenty of echo', () => {
    store.setState({
      reserveCoins: Array.from({ length: MAX_RESERVE_COINS }, (_, i) => coin(i)),
      resources: { ...zeroResources, echoRemnants: 1000 },
    });
    store.getState().handlePurchase(shopItem({ id: 'reserve_coin' }));
    const s = store.getState();
    expect(s.reserveCoins).toHaveLength(MAX_RESERVE_COINS);
    expect(s.resources.echoRemnants).toBe(1000);
  });
});

describe('playerSlice.handlePurchase — pattern upgrade', () => {
  beforeEach(() => {
    store.setState({
      player: makePlayer(),
      resources: { ...zeroResources, senseFragments: 10 },
      unlockedPatterns: [],
    });
  });

  it('unlocks a pattern and deducts sense fragments', () => {
    store.getState().handlePurchase(patternUpgrade({ id: 'warrior_amp', cost: { senseFragments: 4 } }));
    const s = store.getState();
    expect(s.resources.senseFragments).toBe(6);
    expect(s.unlockedPatterns).toContain('warrior_amp');
  });

  it('no-ops when sense fragments are insufficient', () => {
    store.getState().handlePurchase(patternUpgrade({ id: 'x', cost: { senseFragments: 99 } }));
    const s = store.getState();
    expect(s.resources.senseFragments).toBe(10);
    expect(s.unlockedPatterns).toHaveLength(0);
  });
});

describe('playerSlice.handlePurchase — shop item', () => {
  it('applies a heal item: deducts echo and heals by floor(maxHp * heal)', () => {
    store.setState({
      player: makePlayer({ currentHp: 50, maxHp: 100 }),
      resources: { ...zeroResources, echoRemnants: 50 },
    });
    store.getState().handlePurchase(shopItem({ id: 'potion', cost: 30, effect: { heal: 0.3 } }));
    const s = store.getState();
    expect(s.resources.echoRemnants).toBe(20);
    expect(s.player!.currentHp).toBe(80); // 50 + floor(100 * 0.3)
  });

  it('caps the heal at maxHp', () => {
    store.setState({
      player: makePlayer({ currentHp: 90, maxHp: 100 }),
      resources: { ...zeroResources, echoRemnants: 50 },
    });
    store.getState().handlePurchase(shopItem({ id: 'potion', cost: 0, effect: { heal: 0.5 } }));
    expect(store.getState().player!.currentHp).toBe(100); // min(100, 90 + 50)
  });

  it('no-ops when echo is insufficient', () => {
    store.setState({
      player: makePlayer({ currentHp: 50 }),
      resources: { ...zeroResources, echoRemnants: 10 },
    });
    store.getState().handlePurchase(shopItem({ id: 'potion', cost: 30, effect: { heal: 0.3 } }));
    expect(store.getState().player!.currentHp).toBe(50);
    expect(store.getState().resources.echoRemnants).toBe(10);
  });
});

describe('playerSlice.handlePurchase — player guard', () => {
  it('no-ops entirely when there is no player', () => {
    store.setState({ player: null, resources: { ...zeroResources, echoRemnants: 100 } });
    store.getState().handlePurchase(shopItem({ id: 'reserve_coin' }));
    expect(store.getState().resources.echoRemnants).toBe(100);
  });
});

describe('playerSlice.handleSkillUpgradePurchase', () => {
  it('below MAX_SKILLS: acquires the skill and deducts echo', () => {
    store.setState({
      player: makePlayer({ acquiredSkills: [] }),
      resources: { ...zeroResources, echoRemnants: 100 },
    });
    store.getState().handleSkillUpgradePurchase(skillUpgrade('blade', 20));
    const s = store.getState();
    expect(s.player!.acquiredSkills).toContain('blade');
    expect(s.resources.echoRemnants).toBe(80);
    expect(s.skillReplacementState).toBeNull();
  });

  it('at MAX_SKILLS: opens the replacement modal WITHOUT acquiring or charging', () => {
    const full = Array.from({ length: MAX_SKILLS }, (_, i) => `s${i}`);
    const newSkill = skillUpgrade('overflow', 20);
    store.setState({
      player: makePlayer({ acquiredSkills: full }),
      resources: { ...zeroResources, echoRemnants: 100 },
    });
    store.getState().handleSkillUpgradePurchase(newSkill);
    const s = store.getState();
    expect(s.skillReplacementState).toEqual({ isModalOpen: true, newSkill });
    expect(s.player!.acquiredSkills).toHaveLength(MAX_SKILLS);
    expect(s.resources.echoRemnants).toBe(100);
  });

  it('no-ops when echo is insufficient', () => {
    store.setState({
      player: makePlayer({ acquiredSkills: [] }),
      resources: { ...zeroResources, echoRemnants: 5 },
    });
    store.getState().handleSkillUpgradePurchase(skillUpgrade('blade', 20));
    const s = store.getState();
    expect(s.player!.acquiredSkills).toHaveLength(0);
    expect(s.resources.echoRemnants).toBe(5);
  });
});

describe('playerSlice.executeSkillReplacement', () => {
  it('forgets the target, learns the pending skill, deducts echo, closes the modal', () => {
    const newSkill = skillUpgrade('phoenix', 30);
    store.setState({
      player: makePlayer({ acquiredSkills: ['a', 'b', 'c'] }),
      resources: { ...zeroResources, echoRemnants: 100 },
      skillReplacementState: { isModalOpen: true, newSkill },
    });
    store.getState().executeSkillReplacement('b');
    const s = store.getState();
    expect(s.player!.acquiredSkills).toEqual(['a', 'c', 'phoenix']);
    expect(s.resources.echoRemnants).toBe(70);
    expect(s.skillReplacementState).toBeNull();
  });

  it('no-ops on a cold call with no pending replacement', () => {
    store.setState({ player: makePlayer({ acquiredSkills: ['a'] }), skillReplacementState: null });
    store.getState().executeSkillReplacement('a');
    expect(store.getState().player!.acquiredSkills).toEqual(['a']);
  });
});

describe('playerSlice.handleMemoryUpgrade', () => {
  it('maxHp: spends pieces (cost 1+level), bumps the meta level and both HP fields', () => {
    store.setState({
      player: makePlayer({ maxHp: 100, currentHp: 100 }),
      resources: { ...zeroResources, memoryPieces: 5 },
    });
    store.getState().handleMemoryUpgrade(MemoryUpgradeType.maxHp);
    const s = store.getState();
    const effect = MEMORY_UPGRADE_DATA.maxHp.effect;
    expect(s.resources.memoryPieces).toBe(4); // 5 - (1 + level 0)
    expect(s.metaProgress.memoryUpgrades.maxHp).toBe(1);
    expect(s.player!.maxHp).toBe(100 + effect);
    expect(s.player!.currentHp).toBe(100 + effect);
  });

  it('baseAtk: bumps attack by the configured effect', () => {
    store.setState({
      player: makePlayer({ baseAtk: 5 }),
      resources: { ...zeroResources, memoryPieces: 5 },
    });
    store.getState().handleMemoryUpgrade(MemoryUpgradeType.baseAtk);
    expect(store.getState().player!.baseAtk).toBe(5 + MEMORY_UPGRADE_DATA.baseAtk.effect);
  });

  it('no-ops when memory pieces are insufficient', () => {
    store.setState({ player: makePlayer(), resources: { ...zeroResources, memoryPieces: 0 } });
    store.getState().handleMemoryUpgrade(MemoryUpgradeType.maxHp);
    expect(store.getState().metaProgress.memoryUpgrades.maxHp).toBe(0);
  });
});

describe('playerSlice.forgetSkill', () => {
  it('removes the given skill id', () => {
    store.setState({ player: makePlayer({ acquiredSkills: ['a', 'b', 'c'] }) });
    store.getState().forgetSkill('b');
    expect(store.getState().player!.acquiredSkills).toEqual(['a', 'c']);
  });

  it('is a no-op for an unknown skill id', () => {
    store.setState({ player: makePlayer({ acquiredSkills: ['a'] }) });
    store.getState().forgetSkill('zzz');
    expect(store.getState().player!.acquiredSkills).toEqual(['a']);
  });
});

describe('playerSlice.flipReserveCoin (testMode gate)', () => {
  it('no-ops when testMode is off', () => {
    store.setState({ testMode: false, reserveCoins: [coin(1)] });
    store.getState().flipReserveCoin(0);
    expect(store.getState().reserveCoins[0].face).toBeNull();
  });

  it('cycles null → HEADS → TAILS when testMode is on', () => {
    store.setState({ testMode: true, reserveCoins: [coin(1)] });
    store.getState().flipReserveCoin(0);
    expect(store.getState().reserveCoins[0].face).toBe(CoinFace.HEADS);
    store.getState().flipReserveCoin(0);
    expect(store.getState().reserveCoins[0].face).toBe(CoinFace.TAILS);
  });
});

describe('playerSlice.selectCharacter', () => {
  it('creates a WARRIOR and initializes a fresh exploration run', () => {
    store.getState().selectCharacter(CharacterClass.WARRIOR);
    const s = store.getState();
    expect(s.player).not.toBeNull();
    expect(s.player!.class).toBe(CharacterClass.WARRIOR);
    expect(s.resources.echoRemnants).toBe(100);
    expect(s.gameState).toBe(GameState.EXPLORATION);
    expect(s.currentStage).toBe(1);
    expect(s.stageNodes.length).toBeGreaterThan(0);
    expect(s.reserveCoins).toHaveLength(1);
  });
});
