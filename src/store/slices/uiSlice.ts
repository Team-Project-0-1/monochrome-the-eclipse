import { StateCreator } from 'zustand';
import { produce } from 'immer';
import { GameStore } from '../gameStore';
import { SkillReplacementState, CombatEffect, TooltipState, TooltipContent } from '../../types';
import { defaultAudioOptions } from '../../utils/audioManifest';

export type EffectPayload = Omit<CombatEffect, 'id'>;
export type GameOptionKey = keyof GameOptions;
export type BooleanGameOptionKey = {
  [K in keyof GameOptions]: GameOptions[K] extends boolean ? K : never
}[keyof GameOptions];
export type TutorialKey = 'menu' | 'character' | 'exploration' | 'combat' | 'shop' | 'event';

export interface GameOptions {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  soundEnabled: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  combatAssist: boolean;
  tutorialEnabled: boolean;
}

export type TutorialFlags = Record<TutorialKey, boolean>;

export const initialGameOptions: GameOptions = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  soundEnabled: defaultAudioOptions.enabled,
  masterVolume: defaultAudioOptions.masterVolume,
  musicVolume: defaultAudioOptions.musicVolume,
  sfxVolume: defaultAudioOptions.sfxVolume,
  voiceVolume: defaultAudioOptions.voiceVolume,
  combatAssist: true,
  tutorialEnabled: true,
};

export const initialTutorialFlags: TutorialFlags = {
  menu: false,
  character: false,
  exploration: false,
  combat: false,
  shop: false,
  event: false,
};

export interface UiSlice {
  isInventoryOpen: boolean;
  skillReplacementState: SkillReplacementState | null;
  combatEffects: CombatEffect[];
  playerHit: number;
  enemyHit: number;
  tooltip: TooltipState | null;
  gameOptions: GameOptions;
  tutorialFlags: TutorialFlags;
  setInventoryOpen: (isOpen: boolean) => void;
  setSkillReplacementState: (state: SkillReplacementState | null) => void;
  removeCombatEffect: (id: number) => void;
  showTooltip: (content: TooltipContent, rect: DOMRect) => void;
  hideTooltip: () => void;
  setGameOption: <K extends GameOptionKey>(key: K, value: GameOptions[K]) => void;
  toggleGameOption: (key: BooleanGameOptionKey) => void;
  dismissTutorial: (key: TutorialKey) => void;
  resetTutorial: () => void;
}

export const createUiSlice: StateCreator<GameStore, [], [], UiSlice> = (set, get, api) => ({
  isInventoryOpen: false,
  skillReplacementState: null,
  combatEffects: [],
  playerHit: 0,
  enemyHit: 0,
  tooltip: null,
  gameOptions: initialGameOptions,
  tutorialFlags: initialTutorialFlags,
  setInventoryOpen: (isOpen) => set({ isInventoryOpen: isOpen }),
  setSkillReplacementState: (state) => set({ skillReplacementState: state }),
  removeCombatEffect: (id) => set(state => ({
    combatEffects: state.combatEffects.filter(e => e.id !== id)
  })),
  showTooltip: (content, rect) => {
    const tooltipHeight = 120;
    const tooltipWidth = 320;
    const buffer = 10;
    const position: TooltipState['position'] = {};

    if (rect.bottom + tooltipHeight + buffer > window.innerHeight) {
      position.bottom = window.innerHeight - rect.top + buffer;
    } else {
      position.top = rect.bottom + buffer;
    }

    if (rect.left + tooltipWidth > window.innerWidth) {
      position.right = buffer;
    } else {
      position.left = rect.left;
    }

    set({ tooltip: { content, position } });
  },
  hideTooltip: () => set({ tooltip: null }),
  setGameOption: (key, value) => set(produce((draft: GameStore) => {
    draft.gameOptions = { ...draft.gameOptions, [key]: value };
  })),
  toggleGameOption: (key) => set(produce((draft: GameStore) => {
    draft.gameOptions = { ...draft.gameOptions, [key]: !draft.gameOptions[key] };
  })),
  dismissTutorial: (key) => set(produce((draft: GameStore) => {
    draft.tutorialFlags[key] = true;
  })),
  resetTutorial: () => set(produce((draft: GameStore) => {
    draft.tutorialFlags = initialTutorialFlags;
    draft.gameOptions.tutorialEnabled = true;
  })),
});
