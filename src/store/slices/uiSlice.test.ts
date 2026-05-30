import { describe, it, expect, beforeEach } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import { createTestStore } from '../../test/store';
import type { GameStore } from '../gameStore';
import { initialGameOptions } from './uiSlice';
import type { TooltipContent } from '../../types';

type CombatEffect = GameStore['combatEffects'][number];

let store: StoreApi<GameStore>;
beforeEach(() => {
  store = createTestStore();
});

describe('uiSlice — game options', () => {
  it('setGameOption sets a numeric option', () => {
    store.getState().setGameOption('masterVolume', 0.42);
    expect(store.getState().gameOptions.masterVolume).toBe(0.42);
  });

  it('setGameOption leaves sibling options untouched', () => {
    store.getState().setGameOption('masterVolume', 0.42);
    expect(store.getState().gameOptions.musicVolume).toBe(initialGameOptions.musicVolume);
  });

  it('toggleGameOption flips a boolean option both ways', () => {
    const before = store.getState().gameOptions.reducedMotion;
    store.getState().toggleGameOption('reducedMotion');
    expect(store.getState().gameOptions.reducedMotion).toBe(!before);
    store.getState().toggleGameOption('reducedMotion');
    expect(store.getState().gameOptions.reducedMotion).toBe(before);
  });
});

describe('uiSlice — tutorial flags', () => {
  it('dismissTutorial marks a single flag without touching others', () => {
    store.getState().dismissTutorial('combat');
    const flags = store.getState().tutorialFlags;
    expect(flags.combat).toBe(true);
    expect(flags.shop).toBe(false);
  });

  it('resetTutorial clears every flag and re-enables tutorials', () => {
    store.getState().dismissTutorial('combat');
    store.getState().dismissTutorial('shop');
    store.getState().setGameOption('tutorialEnabled', false);

    store.getState().resetTutorial();

    const s = store.getState();
    expect(Object.values(s.tutorialFlags).every((flag) => flag === false)).toBe(true);
    expect(s.gameOptions.tutorialEnabled).toBe(true);
  });
});

describe('uiSlice — transient UI state', () => {
  it('setInventoryOpen toggles the inventory flag', () => {
    store.getState().setInventoryOpen(true);
    expect(store.getState().isInventoryOpen).toBe(true);
    store.getState().setInventoryOpen(false);
    expect(store.getState().isInventoryOpen).toBe(false);
  });

  it('removeCombatEffect removes only the matching id', () => {
    store.setState({
      combatEffects: [{ id: 1 }, { id: 2 }] as unknown as CombatEffect[],
    });
    store.getState().removeCombatEffect(1);
    expect(store.getState().combatEffects.map((e) => e.id)).toEqual([2]);
  });

  it('hideTooltip clears the tooltip', () => {
    const content: TooltipContent = { icon: '', name: 'x', description: '', color: '#fff' };
    store.setState({ tooltip: { content, position: {} } });
    store.getState().hideTooltip();
    expect(store.getState().tooltip).toBeNull();
  });

  it('setSkillReplacementState stores then clears the modal state', () => {
    store.getState().setSkillReplacementState(null);
    expect(store.getState().skillReplacementState).toBeNull();
  });
});
