import { StateCreator } from 'zustand';
import { GameStore } from '../gameStore';
import { produce } from 'immer';
import { MemoryUpgradeType, CharacterClass } from '../../types';

export interface MetaProgress {
  totalRuns: number;
  highestStage: number;
  totalEchoCollected: number;
  unlockedCharacters: CharacterClass[];
  memoryUpgrades: { [key in MemoryUpgradeType]: number };
}

export const initialMetaProgress: MetaProgress = {
  totalRuns: 0,
  highestStage: 1,
  totalEchoCollected: 0,
  unlockedCharacters: [CharacterClass.WARRIOR], // FIX: Default to only the starting character being unlocked.
  memoryUpgrades: { maxHp: 0, baseAtk: 0, baseDef: 0 },
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