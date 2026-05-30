import { createStore, type StoreApi } from 'zustand/vanilla';
import { GameState } from '../types';
import type { GameStore } from '../store/gameStore';
import { createMetaSlice } from '../store/slices/metaSlice';
import { createPlayerSlice } from '../store/slices/playerSlice';
import { createExplorationSlice } from '../store/slices/explorationSlice';
import { createCombatSlice } from '../store/slices/combatSlice';
import { createEventSlice } from '../store/slices/eventSlice';
import { createUiSlice } from '../store/slices/uiSlice';

/**
 * A production-faithful store for slice tests, composed from the same slice
 * creators as `useGameStore` but WITHOUT the `persist`/`devtools` middleware.
 *
 * Why this is behaviorally identical to production for slice actions: every
 * slice is typed `StateCreator<GameStore, [], [], X>` and calls `produce()`
 * itself inside each action, so the middleware only wraps hydration/storage —
 * it never alters slice-action behavior. No action under test touches
 * localStorage/window, so dropping the middleware (which would otherwise need a
 * DOM) is free.
 *
 * The four global actions are stubbed (`setGameState` is real; the rest are
 * no-ops) purely to satisfy the `GameStore` type. This is only safe because no
 * player/ui slice action invokes a global action via `get()`. Re-verify that
 * assumption before reusing this helper to test `combatSlice`.
 *
 * Each call returns a FRESH store — call it in `beforeEach` so mutating actions
 * never leak state across tests.
 */
export const createTestStore = (): StoreApi<GameStore> =>
  createStore<GameStore>()((set, get, api) => ({
    gameState: GameState.MENU,
    resumeGameState: null,
    ...createMetaSlice(set, get, api),
    ...createPlayerSlice(set, get, api),
    ...createExplorationSlice(set, get, api),
    ...createCombatSlice(set, get, api),
    ...createEventSlice(set, get, api),
    ...createUiSlice(set, get, api),
    setGameState: (gameState) => set({ gameState }),
    startGame: () => {},
    continueRun: () => {},
    resetGame: () => {},
  }));
