import { StateCreator } from 'zustand';
import { GameStore } from '../gameStore';
import { produce } from 'immer';
import { MemoryUpgradeType, CharacterClass, RunRecord } from '../../types';

export interface MetaProgress {
  totalRuns: number;
  highestStage: number;
  totalEchoCollected: number;
  unlockedCharacters: CharacterClass[];
  memoryUpgrades: { [key in MemoryUpgradeType]: number };
  runHistory: RunRecord[];
}

export const initialMetaProgress: MetaProgress = {
  totalRuns: 0,
  highestStage: 1,
  totalEchoCollected: 0,
  unlockedCharacters: [CharacterClass.WARRIOR], // FIX: Default to only the starting character being unlocked.
  memoryUpgrades: { maxHp: 0, baseAtk: 0, baseDef: 0 },
  runHistory: [],
};

// Local telemetry: keep only the most recent N run outcomes so persisted save
// stays bounded. Derived stats (winrate, death-by-stage) read from this window.
export const RUN_HISTORY_CAP = 50;

export const recordRunEnd = (
  draft: GameStore,
  outcome: RunRecord['outcome'],
  opts?: { deathCause?: RunRecord['deathCause']; enemyName?: string; enemyTier?: string }
) => {
  if (!draft.player) return;
  draft.metaProgress.runHistory.push({
    ts: Date.now(),
    characterClass: draft.player.class,
    outcome,
    deathCause: opts?.deathCause,
    finalStage: draft.currentStage,
    finalTurn: draft.currentTurn,
    lastEnemyName: opts?.enemyName,
    lastEnemyTier: opts?.enemyTier,
    echoCollected: draft.resources.echoRemnants,
  });
  const over = draft.metaProgress.runHistory.length - RUN_HISTORY_CAP;
  if (over > 0) draft.metaProgress.runHistory.splice(0, over);
};

export interface MetaSlice {
  metaProgress: MetaProgress;
  testMode: boolean;
  setTestMode: (testMode: boolean) => void;
}

export const createMetaSlice: StateCreator<GameStore, [], [], MetaSlice> = (set, get, api) => ({
  metaProgress: initialMetaProgress,
  testMode: false,
  setTestMode: (testMode) => set({ testMode }),
});