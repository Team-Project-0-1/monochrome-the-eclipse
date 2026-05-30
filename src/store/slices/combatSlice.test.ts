import { describe, it, expect, beforeEach } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import { createTestStore } from '../../test/store';
import { makePlayer, makeEnemy, makeCoins, H, T } from '../../test/fixtures';
import type { GameStore } from '../gameStore';
import type { PendingCombatReward } from './combatSlice';
import type { CombatRewardChoice } from '../../utils/combatRewards';
import { CharacterClass, CoinFace, GameState, type Coin } from '../../types';
import { characterActiveSkills } from '../../data/dataCharacters';
import { playerSkillUnlocks } from '../../data/dataSkills';

const coin = (id: number): Coin => ({ face: null, locked: false, id });

const zeroResources = { echoRemnants: 0, senseFragments: 0, memoryPieces: 0 };

const pendingReward = (
  choices: CombatRewardChoice[],
  extra: Partial<PendingCombatReward> = {},
): PendingCombatReward => ({
  enemyName: 'Dummy',
  enemyTier: 'normal',
  nextState: GameState.EXPLORATION,
  choices,
  ...extra,
});

const choice = (o: Partial<CombatRewardChoice> & Pick<CombatRewardChoice, 'id'>): CombatRewardChoice => ({
  label: '', description: '', rewards: {}, ...o,
});

let store: StoreApi<GameStore>;
beforeEach(() => {
  store = createTestStore();
});

describe('combatSlice.claimCombatReward — resources', () => {
  it('applies echo/sense/memory and clears pending + sets next state', () => {
    store.setState({
      player: makePlayer(),
      resources: { ...zeroResources },
      pendingCombatReward: pendingReward([
        choice({ id: 'balanced_cache', rewards: { echoRemnants: 12, senseFragments: 1, memoryPieces: 1 } }),
      ]),
    });
    store.getState().claimCombatReward('balanced_cache');
    const s = store.getState();
    expect(s.resources).toEqual({ echoRemnants: 12, senseFragments: 1, memoryPieces: 1 });
    expect(s.metaProgress.totalEchoCollected).toBe(12);
    expect(s.pendingCombatReward).toBeNull();
    expect(s.gameState).toBe(GameState.EXPLORATION);
  });

  it('falls back to the first choice for an unknown choiceId', () => {
    store.setState({
      player: makePlayer(),
      resources: { ...zeroResources },
      pendingCombatReward: pendingReward([
        choice({ id: 'first', rewards: { echoRemnants: 5 } }),
        choice({ id: 'second', rewards: { echoRemnants: 99 } }),
      ]),
    });
    store.getState().claimCombatReward('nope');
    expect(store.getState().resources.echoRemnants).toBe(5);
  });

  it('advances currentTurn when nextTurn is supplied', () => {
    store.setState({
      player: makePlayer(),
      currentTurn: 3,
      resources: { ...zeroResources },
      pendingCombatReward: pendingReward([choice({ id: 'c' })], { nextTurn: 4 }),
    });
    store.getState().claimCombatReward('c');
    expect(store.getState().currentTurn).toBe(4);
  });

  it('appends a reserve coin when rewarded', () => {
    store.setState({
      player: makePlayer(),
      reserveCoins: [],
      resources: { ...zeroResources },
      pendingCombatReward: pendingReward([choice({ id: 'rc', rewards: { reserveCoin: true } })]),
    });
    store.getState().claimCombatReward('rc');
    expect(store.getState().reserveCoins).toHaveLength(1);
  });

  it('no-ops when there is no pending reward', () => {
    store.setState({ pendingCombatReward: null, resources: { ...zeroResources, echoRemnants: 5 } });
    store.getState().claimCombatReward('whatever');
    expect(store.getState().resources.echoRemnants).toBe(5);
  });
});

describe('combatSlice.claimCombatReward — skillId vs passiveId asymmetry', () => {
  it('grants a REAL skillId (looked up in the class pool)', () => {
    const realSkillId = Object.keys(playerSkillUnlocks[CharacterClass.WARRIOR])[0];
    store.setState({
      player: makePlayer({ class: CharacterClass.WARRIOR, acquiredSkills: [] }),
      resources: { ...zeroResources },
      pendingCombatReward: pendingReward([choice({ id: 'sk', skillId: realSkillId })]),
    });
    store.getState().claimCombatReward('sk');
    expect(store.getState().player!.acquiredSkills).toContain(realSkillId);
  });

  it('silently ignores an UNKNOWN skillId (not in the pool → no grant, no crash)', () => {
    store.setState({
      player: makePlayer({ class: CharacterClass.WARRIOR, acquiredSkills: [] }),
      resources: { ...zeroResources },
      pendingCombatReward: pendingReward([choice({ id: 'sk', skillId: 'NOT_A_REAL_SKILL' })]),
    });
    store.getState().claimCombatReward('sk');
    expect(store.getState().player!.acquiredSkills).toHaveLength(0);
  });

  it('pushes a passiveId RAW (any string is accepted) — the asymmetry vs skillId', () => {
    store.setState({
      player: makePlayer(),
      unlockedPatterns: [],
      resources: { ...zeroResources },
      pendingCombatReward: pendingReward([choice({ id: 'pv', passiveId: 'ARBITRARY_PASSIVE_ID' })]),
    });
    store.getState().claimCombatReward('pv');
    expect(store.getState().unlockedPatterns).toContain('ARBITRARY_PASSIVE_ID');
  });
});

describe('combatSlice.useActiveSkill', () => {
  it('WARRIOR: sets cooldown from data and stays idle (re-rolls coins)', () => {
    store.setState({
      player: makePlayer({ class: CharacterClass.WARRIOR, activeSkillCooldown: 0 }),
      playerCoins: makeCoins([H, H, T, T, H]),
    });
    store.getState().useActiveSkill();
    const s = store.getState();
    expect(s.player!.activeSkillCooldown).toBe(characterActiveSkills[CharacterClass.WARRIOR].cooldown);
    expect(s.activeSkillState.phase).toBe('idle');
  });

  it('ROGUE: enters the rogue_flip selection phase', () => {
    store.setState({ player: makePlayer({ class: CharacterClass.ROGUE, activeSkillCooldown: 0 }) });
    store.getState().useActiveSkill();
    expect(store.getState().activeSkillState.phase).toBe('rogue_flip');
  });

  it('no-ops while on cooldown', () => {
    store.setState({ player: makePlayer({ class: CharacterClass.ROGUE, activeSkillCooldown: 2 }) });
    store.getState().useActiveSkill();
    expect(store.getState().activeSkillState.phase).toBe('idle');
  });
});

describe('combatSlice — swap lifecycle', () => {
  it('initiateSwap reveals a face for an existing reserve coin', () => {
    store.setState({ reserveCoins: [coin(1)] });
    store.getState().initiateSwap(0);
    const s = store.getState().swapState;
    expect(s.phase).toBe('revealed');
    expect(s.reserveCoinIndex).toBe(0);
    expect([CoinFace.HEADS, CoinFace.TAILS]).toContain(s.revealedFace);
  });

  it('initiateSwap no-ops for a missing reserve coin', () => {
    store.setState({ reserveCoins: [], swapState: { phase: 'idle', reserveCoinIndex: null, revealedFace: null } });
    store.getState().initiateSwap(5);
    expect(store.getState().swapState.phase).toBe('idle');
  });

  it('completeSwap puts the revealed face into the chosen coin and consumes the reserve', () => {
    store.setState({
      playerCoins: makeCoins([H, H, T]),
      reserveCoins: [coin(99)],
      swapState: { phase: 'revealed', reserveCoinIndex: 0, revealedFace: CoinFace.TAILS },
    });
    store.getState().completeSwap(1);
    const s = store.getState();
    expect(s.playerCoins[1].face).toBe(CoinFace.TAILS);
    expect(s.reserveCoins).toHaveLength(0);
    expect(s.swapState.phase).toBe('idle');
  });

  it('completeSwap resets to idle when not in the revealed phase', () => {
    store.setState({
      playerCoins: makeCoins([H, H]),
      reserveCoins: [coin(99)],
      swapState: { phase: 'idle', reserveCoinIndex: null, revealedFace: null },
    });
    store.getState().completeSwap(0);
    expect(store.getState().reserveCoins).toHaveLength(1); // unchanged
  });

  it('cancelSwap resets the swap state', () => {
    store.setState({ swapState: { phase: 'revealed', reserveCoinIndex: 0, revealedFace: CoinFace.HEADS } });
    store.getState().cancelSwap();
    expect(store.getState().swapState).toEqual({ phase: 'idle', reserveCoinIndex: null, revealedFace: null });
  });
});

describe('combatSlice — coins & log & guards', () => {
  it('flipCoin toggles an unlocked coin', () => {
    store.setState({ playerCoins: makeCoins([H, T, H]) });
    store.getState().flipCoin(0);
    expect(store.getState().playerCoins[0].face).toBe(CoinFace.TAILS);
  });

  it('flipCoin no-ops on a locked coin', () => {
    const coins = makeCoins([H, T]);
    coins[0].locked = true;
    store.setState({ playerCoins: coins });
    store.getState().flipCoin(0);
    expect(store.getState().playerCoins[0].face).toBe(CoinFace.HEADS);
  });

  it('cancelActiveSkill resets to idle', () => {
    store.setState({ activeSkillState: { phase: 'rogue_flip', selection: [1] } });
    store.getState().cancelActiveSkill();
    expect(store.getState().activeSkillState).toEqual({ phase: 'idle', selection: [] });
  });

  it('addLog appends an entry tagged with the current turn', () => {
    store.setState({ combatLog: [], combatTurn: 3 });
    store.getState().addLog('테스트 로그', 'system');
    const log = store.getState().combatLog;
    expect(log).toHaveLength(1);
    expect(log[0].message).toBe('테스트 로그');
    expect(log[0].type).toBe('system');
    expect(log[0].turn).toBe(3);
  });

  // executeTurn fully resolves a turn through combatLogic + a setTimeout; the
  // reward/death resolution paths are covered structurally by combat/* logic
  // tests and deferred to a future selectNode→executeTurn integration test.
  // Only the cheap pre-timer early-return guard is unit-tested here.
  it('executeTurn returns early (no turn advance) when no patterns are selected', () => {
    store.setState({
      player: makePlayer(),
      enemy: makeEnemy(),
      selectedPatterns: [],
      combatTurn: 1,
    });
    store.getState().executeTurn();
    expect(store.getState().combatTurn).toBe(1);
  });
});
