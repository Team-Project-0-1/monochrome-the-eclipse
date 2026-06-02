import { describe, it, expect, beforeEach } from 'vitest';
import { produce } from 'immer';
import type { StoreApi } from 'zustand/vanilla';
import { createTestStore } from '../../test/store';
import { makePlayer } from '../../test/fixtures';
import type { GameStore } from '../gameStore';
import { recordRunEnd, RUN_HISTORY_CAP } from './metaSlice';

let store: StoreApi<GameStore>;
beforeEach(() => {
  store = createTestStore();
});

describe('metaSlice.setTestMode', () => {
  it('defaults to false and toggles both ways', () => {
    expect(store.getState().testMode).toBe(false);
    store.getState().setTestMode(true);
    expect(store.getState().testMode).toBe(true);
    store.getState().setTestMode(false);
    expect(store.getState().testMode).toBe(false);
  });
});

describe('metaSlice.recordRunEnd', () => {
  const apply = (
    seed: Partial<GameStore>,
    outcome: Parameters<typeof recordRunEnd>[1],
    opts?: Parameters<typeof recordRunEnd>[2],
  ) => produce(store.getState(), (draft: GameStore) => {
    Object.assign(draft, seed);
    recordRunEnd(draft, outcome, opts);
  });

  it('no-ops without a player', () => {
    const next = apply({ player: null }, 'death');
    expect(next.metaProgress.runHistory).toHaveLength(0);
  });

  it('records a snapshot of the run-ending state', () => {
    const next = apply(
      { player: makePlayer(), currentStage: 2, currentTurn: 7, resources: { echoRemnants: 42, senseFragments: 0, memoryPieces: 0 } },
      'death',
      { deathCause: 'combat', enemyName: '루멘 리퍼', enemyTier: 'boss' },
    );
    expect(next.metaProgress.runHistory).toHaveLength(1);
    const rec = next.metaProgress.runHistory[0];
    expect(rec).toMatchObject({
      outcome: 'death',
      deathCause: 'combat',
      finalStage: 2,
      finalTurn: 7,
      lastEnemyName: '루멘 리퍼',
      lastEnemyTier: 'boss',
      echoCollected: 42,
    });
  });

  it(`caps the history at ${RUN_HISTORY_CAP}, dropping the oldest`, () => {
    const seeded = Array.from({ length: RUN_HISTORY_CAP }, (_, i) => ({
      ts: i, characterClass: makePlayer().class, outcome: 'death' as const,
      finalStage: i, finalTurn: 1, echoCollected: 0,
    }));
    const next = produce(store.getState(), (draft: GameStore) => {
      draft.player = makePlayer();
      draft.metaProgress.runHistory = seeded;
      draft.currentStage = 999; // marker for the newest record
      recordRunEnd(draft, 'victory');
    });
    expect(next.metaProgress.runHistory).toHaveLength(RUN_HISTORY_CAP);
    expect(next.metaProgress.runHistory[0].finalStage).toBe(1); // index 0 (oldest) dropped
    expect(next.metaProgress.runHistory.at(-1)!.finalStage).toBe(999); // newest kept
  });
});
