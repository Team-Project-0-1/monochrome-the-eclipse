import { describe, it, expect, beforeEach } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import { createTestStore } from '../../test/store';
import { makePlayer } from '../../test/fixtures';
import type { GameStore } from '../gameStore';
import { NodeType, GameState, type StageNode } from '../../types';
import { STAGE_TURNS } from '../../constants';

// First-turn / empty-path makes every node index available
// (getAvailableRouteNodeIndices: currentTurn<=1 || path.length===0 → all indices).
const singleNodeRow = (type: NodeType) => ({
  stageNodes: [[{ type, id: 'n0' }]] as StageNode[][],
  currentStage: 1,
  currentTurn: 1,
  path: [],
});

let store: StoreApi<GameStore>;
beforeEach(() => {
  store = createTestStore();
});

describe('explorationSlice.startStage', () => {
  it('initializes a playable stage and bumps highestStage', () => {
    store.setState({ player: makePlayer() });
    store.getState().startStage(2);
    const s = store.getState();
    expect(s.currentStage).toBe(2);
    expect(s.currentTurn).toBe(1);
    expect(s.stageNodes.length).toBeGreaterThan(0);
    expect(s.gameState).toBe(GameState.EXPLORATION);
    expect(s.metaProgress.highestStage).toBeGreaterThanOrEqual(2);
  });

  it('routes an unplayable stage straight to STAGE_CLEAR', () => {
    store.getState().startStage(99);
    expect(store.getState().gameState).toBe(GameState.STAGE_CLEAR);
  });
});

describe('explorationSlice.proceedToNextTurn', () => {
  it('advances the turn mid-stage', () => {
    store.setState({ player: makePlayer(), currentStage: 1, currentTurn: 5 });
    store.getState().proceedToNextTurn();
    expect(store.getState().currentTurn).toBe(6);
    expect(store.getState().gameState).toBe(GameState.EXPLORATION);
  });

  it('clears a non-final stage after STAGE_TURNS', () => {
    store.setState({ player: makePlayer(), currentStage: 1, currentTurn: STAGE_TURNS });
    store.getState().proceedToNextTurn();
    expect(store.getState().gameState).toBe(GameState.STAGE_CLEAR);
  });

  it('wins the run after STAGE_TURNS on the final stage', () => {
    store.setState({ player: makePlayer(), currentStage: 3, currentTurn: STAGE_TURNS });
    store.getState().proceedToNextTurn();
    expect(store.getState().gameState).toBe(GameState.VICTORY);
  });

  it('no-ops without a player', () => {
    store.setState({ player: null, currentTurn: 5 });
    store.getState().proceedToNextTurn();
    expect(store.getState().currentTurn).toBe(5);
  });
});

describe('explorationSlice.handleRestChoice', () => {
  it('heal restores floor(maxHp * 0.4) and advances the turn', () => {
    store.setState({ player: makePlayer({ maxHp: 100, currentHp: 50 }), currentStage: 1, currentTurn: 5 });
    store.getState().handleRestChoice('heal');
    const s = store.getState();
    expect(s.player!.currentHp).toBe(90);
    expect(s.currentTurn).toBe(6);
    expect(s.gameState).toBe(GameState.EXPLORATION);
  });

  it('heal caps at maxHp', () => {
    store.setState({ player: makePlayer({ maxHp: 100, currentHp: 80 }), currentStage: 1, currentTurn: 5 });
    store.getState().handleRestChoice('heal');
    expect(store.getState().player!.currentHp).toBe(100);
  });

  it('memory_altar opens the altar', () => {
    store.setState({ player: makePlayer(), currentStage: 1, currentTurn: 5 });
    store.getState().handleRestChoice('memory_altar');
    expect(store.getState().gameState).toBe(GameState.MEMORY_ALTAR);
  });
});

describe('explorationSlice.selectNode', () => {
  it('SHOP node enters the shop and records the path', () => {
    store.setState({ player: makePlayer(), ...singleNodeRow(NodeType.SHOP) });
    store.getState().selectNode({ type: NodeType.SHOP, id: 'n0' }, 0);
    const s = store.getState();
    expect(s.gameState).toBe(GameState.SHOP);
    expect(s.path).toHaveLength(1);
  });

  it('REST node enters the rest screen', () => {
    store.setState({ player: makePlayer(), ...singleNodeRow(NodeType.REST) });
    store.getState().selectNode({ type: NodeType.REST, id: 'n0' }, 0);
    expect(store.getState().gameState).toBe(GameState.REST);
  });

  it('COMBAT node spawns an enemy and enters combat', () => {
    store.setState({ player: makePlayer(), ...singleNodeRow(NodeType.COMBAT) });
    store.getState().selectNode({ type: NodeType.COMBAT, id: 'n0' }, 0);
    const s = store.getState();
    expect(s.gameState).toBe(GameState.COMBAT);
    expect(s.enemy).not.toBeNull();
    expect(s.enemy!.currentHp).toBeGreaterThan(0);
    expect(s.playerCoins.length).toBeGreaterThan(0);
    expect(s.enemyIntent).not.toBeNull();
  });

  it('no-ops when the node index is unavailable', () => {
    store.setState({ player: makePlayer(), stageNodes: [], currentStage: 1, currentTurn: 1, path: [] });
    store.getState().selectNode({ type: NodeType.SHOP, id: 'n0' }, 0);
    expect(store.getState().path).toHaveLength(0);
    expect(store.getState().gameState).toBe(GameState.MENU); // unchanged initial state
  });
});
