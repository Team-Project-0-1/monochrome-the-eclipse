import { describe, it, expect, beforeEach } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import { createTestStore } from '../../test/store';
import type { GameStore } from '../gameStore';

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
