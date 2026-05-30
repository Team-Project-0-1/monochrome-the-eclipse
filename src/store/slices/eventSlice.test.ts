import { describe, it, expect, beforeEach } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import { createTestStore } from '../../test/store';
import { makePlayer } from '../../test/fixtures';
import type { GameStore } from '../gameStore';
import { CharacterClass, GameState, type EventChoice } from '../../types';

const eventChoice = (o: Partial<EventChoice> = {}): EventChoice => ({ text: 'choice', ...o });

let store: StoreApi<GameStore>;
beforeEach(() => {
  store = createTestStore();
  store.setState({
    player: makePlayer(),
    resources: { echoRemnants: 50, senseFragments: 5, memoryPieces: 5 },
  });
});

describe('eventSlice.handleEventChoice — guaranteed outcomes', () => {
  it('applies positive resource deltas and enters the result phase', () => {
    store.getState().handleEventChoice(
      eventChoice({ guaranteed: true, result: { message: 'ok', echoRemnants: 10, senseFragments: 2 } }),
    );
    const s = store.getState();
    expect(s.eventPhase).toBe('result');
    expect(s.resources.echoRemnants).toBe(60);
    expect(s.resources.senseFragments).toBe(7);
    expect(s.metaProgress.totalEchoCollected).toBe(10);
  });

  it('applies damage and curse to the player', () => {
    store.setState({ player: makePlayer({ currentHp: 50 }) });
    store.getState().handleEventChoice(eventChoice({ guaranteed: true, result: { damage: 10, curse: 3 } }));
    const s = store.getState();
    expect(s.player!.currentHp).toBe(40);
    expect(s.player!.statusEffects.CURSE).toBe(3);
  });
});

describe('eventSlice.handleEventChoice — gating guards', () => {
  it('no-ops without a player', () => {
    store.setState({ player: null });
    store.getState().handleEventChoice(eventChoice({ guaranteed: true, result: { echoRemnants: 10 } }));
    expect(store.getState().eventPhase).toBe('choice');
  });

  it('blocks a choice gated by a mismatched requiredSense', () => {
    store.setState({ player: makePlayer({ class: CharacterClass.WARRIOR }) });
    store.getState().handleEventChoice(
      eventChoice({ requiredSense: CharacterClass.MAGE, guaranteed: true, result: { echoRemnants: 10 } }),
    );
    expect(store.getState().resources.echoRemnants).toBe(50); // unchanged
  });

  it('blocks a choice when required resources are insufficient', () => {
    store.setState({ resources: { echoRemnants: 0, senseFragments: 0, memoryPieces: 0 } });
    store.getState().handleEventChoice(
      eventChoice({ requiredResources: { echoRemnants: 100 }, guaranteed: true, result: { senseFragments: 5 } }),
    );
    expect(store.getState().resources.senseFragments).toBe(0); // blocked
  });
});

describe('eventSlice.continueEventResult', () => {
  it('routes to GAME_OVER when the player has died', () => {
    store.setState({ player: makePlayer({ currentHp: 0 }), eventResultData: { type: 'outcome', payload: {} } });
    store.getState().continueEventResult();
    expect(store.getState().gameState).toBe(GameState.GAME_OVER);
  });

  it('loads a real follow-up event by id', () => {
    store.setState({
      player: makePlayer({ currentHp: 50 }),
      eventResultData: { type: 'outcome', payload: { followUp: 'event_survivor_reward' } },
      encounteredEventIds: [],
    });
    store.getState().continueEventResult();
    const s = store.getState();
    expect(s.gameState).toBe(GameState.EVENT);
    expect(s.currentEvent!.id).toBe('event_survivor_reward');
  });

  it('proceeds to the next turn when there is no follow-up', () => {
    store.setState({
      player: makePlayer({ currentHp: 50 }),
      currentStage: 1,
      currentTurn: 5,
      eventResultData: { type: 'outcome', payload: {} },
    });
    store.getState().continueEventResult();
    const s = store.getState();
    expect(s.currentTurn).toBe(6);
    expect(s.gameState).toBe(GameState.EXPLORATION);
  });
});
