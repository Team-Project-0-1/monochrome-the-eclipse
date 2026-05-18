import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import { produce } from 'immer';
import { GameState } from '../types';

import { MetaSlice, createMetaSlice, initialMetaProgress } from './slices/metaSlice';
import { PlayerSlice, createPlayerSlice } from './slices/playerSlice';
import { ExplorationSlice, createExplorationSlice } from './slices/explorationSlice';
import { CombatSlice, createCombatSlice } from './slices/combatSlice';
import { EventSlice, createEventSlice } from './slices/eventSlice';
import { UiSlice, createUiSlice, initialGameOptions, initialTutorialFlags } from './slices/uiSlice';

// --- TYPE DEFINITIONS ---
export type GameStore = MetaSlice & PlayerSlice & ExplorationSlice & CombatSlice & EventSlice & UiSlice & {
  gameState: GameState;
  resumeGameState: GameState | null;
  setGameState: (gameState: GameState) => void;
  startGame: () => void;
  continueRun: () => void;
  resetGame: (fullReset?: boolean) => void;
};

// --- INITIAL STATE FOR MAIN STORE ---
const initialMainState = {
  gameState: GameState.MENU,
  resumeGameState: null,
};

const hasPlayableCombatState = (state: Partial<GameStore>) => (
  Boolean(
    state.player &&
    state.enemy &&
    state.enemy.currentHp > 0 &&
    state.enemyIntent &&
    state.playerCoins &&
    state.playerCoins.length > 0,
  )
);

const clearHydratedPostCombatState = (state: Partial<GameStore>) => {
  if (!state.player) return;

  state.player = {
    ...state.player,
    temporaryDefense: 0,
    statusEffects: {},
    temporaryEffects: state.player.temporaryEffects?.hpTrainingGains
      ? { hpTrainingGains: state.player.temporaryEffects.hpTrainingGains }
      : {},
  };
};

const getResumeTarget = (state: Partial<GameStore>): GameState => {
  if (!state.player) return GameState.CHARACTER_SELECT;
  if (state.player.currentHp <= 0) return GameState.GAME_OVER;
  if (state.currentEvent) return GameState.EVENT;
  if (hasPlayableCombatState(state)) return GameState.COMBAT;
  if (state.stageNodes && state.stageNodes.length > 0) return GameState.EXPLORATION;
  return GameState.CHARACTER_SELECT;
};

const normalizeHydratedState = (state: GameStore): GameStore => {
  const normalized: GameStore = {
    ...state,
    testMode: false,
    encounteredEventIds: state.encounteredEventIds ?? [],
    routeSeed: state.routeSeed ?? null,
    routeGenerationLog: state.routeGenerationLog ?? [],
    gameOptions: { ...initialGameOptions, ...(state.gameOptions ?? {}) },
    tutorialFlags: { ...initialTutorialFlags, ...(state.tutorialFlags ?? {}) },
    swapState: state.swapState ?? { phase: 'idle', reserveCoinIndex: null, revealedFace: null },
    activeSkillState: state.activeSkillState ?? { phase: 'idle', selection: [] },
    eventPhase: state.eventPhase === 'coinFlip' ? 'choice' : state.eventPhase,
    eventResultData: state.eventPhase === 'coinFlip' ? null : state.eventResultData,
  };

  if (normalized.pendingCombatReward) {
    clearHydratedPostCombatState(normalized);
    normalized.gameState = GameState.MENU;
    normalized.resumeGameState = GameState.REWARD;
    normalized.combatEffects = [];
    normalized.playerHit = 0;
    normalized.enemyHit = 0;
    normalized.tooltip = null;
    return normalized;
  }

  if (!normalized.player && normalized.gameState !== GameState.MENU) {
    normalized.gameState = GameState.MENU;
    normalized.resumeGameState = null;
    return normalized;
  }

  if (normalized.player?.currentHp !== undefined && normalized.player.currentHp <= 0) {
    normalized.gameState = GameState.MENU;
    normalized.resumeGameState = null;
    return normalized;
  }

  if (
    (normalized.gameState === GameState.REWARD && !normalized.pendingCombatReward) ||
    (normalized.gameState === GameState.COMBAT && !hasPlayableCombatState(normalized)) ||
    (normalized.gameState === GameState.EVENT && !normalized.currentEvent)
  ) {
    normalized.gameState = getResumeTarget(normalized);
  }

  normalized.resumeGameState = normalized.gameState === GameState.MENU ? null : normalized.gameState;
  normalized.gameState = GameState.MENU;
  return normalized;
};

// --- ZUSTAND STORE ---
export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      (set, get, api) => ({
        ...initialMainState,
        ...createMetaSlice(set, get, api),
        ...createPlayerSlice(set, get, api),
        ...createExplorationSlice(set, get, api),
        ...createCombatSlice(set, get, api),
        ...createEventSlice(set, get, api),
        ...createUiSlice(set, get, api),

        // --- GLOBAL ACTIONS ---
        setGameState: (gameState) => set({ gameState }),
        startGame: () => set({ gameState: GameState.CHARACTER_SELECT, resumeGameState: null }),
        continueRun: () => {
            const state = get();
            if (!state.player) {
                set({ gameState: GameState.CHARACTER_SELECT, resumeGameState: null });
                return;
            }

            if (state.pendingCombatReward) {
                set({ gameState: GameState.REWARD, resumeGameState: null });
                return;
            }

            if (state.resumeGameState === GameState.STAGE_CLEAR) {
                set({ gameState: GameState.STAGE_CLEAR, resumeGameState: null });
                return;
            }

            if (state.resumeGameState === GameState.MEMORY_ALTAR) {
                set({ gameState: GameState.MEMORY_ALTAR, resumeGameState: null });
                return;
            }

            if (state.currentEvent) {
                set({ gameState: GameState.EVENT, resumeGameState: null });
                return;
            }

            if (state.enemy && state.enemy.currentHp > 0 && state.player.currentHp > 0) {
                set({ gameState: GameState.COMBAT, resumeGameState: null });
                return;
            }

            if (state.player.currentHp <= 0) {
                set({ gameState: GameState.GAME_OVER, resumeGameState: null });
                return;
            }

            if (state.stageNodes.length > 0) {
                set({ gameState: GameState.EXPLORATION, resumeGameState: null });
                return;
            }

            set({ gameState: GameState.CHARACTER_SELECT, resumeGameState: null });
        },

        resetGame: (fullReset = false) => {
            set(produce((draft: GameStore) => {
                const currentMetaProgress = draft.metaProgress;

                // playerSlice reset
                draft.player = null;
                draft.resources = { echoRemnants: 0, senseFragments: 0, memoryPieces: 0 };
                draft.unlockedPatterns = [];
                draft.reserveCoins = [];
                draft.reserveCoinShopCost = 100;

                // explorationSlice reset
                draft.currentStage = 1;
                draft.currentTurn = 1;
                draft.stageNodes = [];
                draft.routeSeed = null;
                draft.routeGenerationLog = [];
                draft.path = [];

                // combatSlice reset
                draft.enemy = null;
                draft.playerCoins = [];
                draft.detectedPatterns = [];
                draft.selectedPatterns = [];
                draft.usedCoinIndices = [];
                draft.combatPrediction = null;
                draft.enemyIntent = null;
                draft.combatLog = [];
                draft.combatTurn = 1;
                draft.pendingCombatReward = null;
                // FIX: Updated the reset logic for `swapState` to match its type definition. The property `isSwapping` was removed and replaced with `phase: 'idle'` and `revealedFace: null` to correctly initialize the state.
                draft.swapState = { phase: 'idle', reserveCoinIndex: null, revealedFace: null };

                // eventSlice reset
                draft.currentEvent = null;
                draft.eventPhase = 'choice';
                draft.eventResultData = null;
                draft.eventDisplayItems = [];
                draft.encounteredEventIds = [];

                // uiSlice reset
                draft.isInventoryOpen = false;
                draft.skillReplacementState = null;
                draft.combatEffects = [];
                draft.playerHit = 0;
                draft.enemyHit = 0;
                draft.tooltip = null;
                draft.skillReplacementState = null;


                // main store reset
                draft.gameState = GameState.MENU;
                draft.resumeGameState = null;

                // metaSlice (conditional reset)
                draft.metaProgress = fullReset ? initialMetaProgress : currentMetaProgress;
            }));
        },
      }),
      {
        name: 'monochrome-eclipse-save',
        storage: createJSONStorage(() => localStorage),
        version: 3,
        migrate: (persistedState: any) => ({
          ...persistedState,
          testMode: false,
          encounteredEventIds: persistedState?.encounteredEventIds ?? [],
          routeSeed: persistedState?.routeSeed ?? null,
          routeGenerationLog: persistedState?.routeGenerationLog ?? [],
          gameOptions: { ...initialGameOptions, ...(persistedState?.gameOptions ?? {}) },
          tutorialFlags: { ...initialTutorialFlags, ...(persistedState?.tutorialFlags ?? {}) },
        }),
        merge: (persistedState, currentState) => normalizeHydratedState({
          ...currentState,
          ...(persistedState as Partial<GameStore>),
        }),
        partialize: (state) => ({
          metaProgress: state.metaProgress,
          gameOptions: state.gameOptions,
          tutorialFlags: state.tutorialFlags,
          gameState: state.gameState,
          player: state.player,
          resources: state.resources,
          unlockedPatterns: state.unlockedPatterns,
          reserveCoins: state.reserveCoins,
          reserveCoinShopCost: state.reserveCoinShopCost,
          currentStage: state.currentStage,
          currentTurn: state.currentTurn,
          stageNodes: state.stageNodes,
          routeSeed: state.routeSeed,
          routeGenerationLog: state.routeGenerationLog,
          path: state.path,
          enemy: state.enemy,
          playerCoins: state.playerCoins,
          detectedPatterns: state.detectedPatterns,
          selectedPatterns: state.selectedPatterns,
          usedCoinIndices: state.usedCoinIndices,
          combatPrediction: state.combatPrediction,
          enemyIntent: state.enemyIntent,
          combatLog: state.combatLog,
          combatTurn: state.combatTurn,
          pendingCombatReward: state.pendingCombatReward,
          swapState: state.swapState,
          activeSkillState: state.activeSkillState,
          currentEvent: state.currentEvent,
          eventPhase: state.eventPhase === 'coinFlip' ? 'choice' : state.eventPhase,
          eventResultData: state.eventPhase === 'coinFlip' ? null : state.eventResultData,
          eventDisplayItems: state.eventDisplayItems,
          encounteredEventIds: state.encounteredEventIds,
        }),
      }
    )
  )
);
