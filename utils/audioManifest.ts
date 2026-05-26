import { GameState } from '../types';

export type BgmKey =
  | 'menu'
  | 'exploration'
  | 'explorationStage2'
  | 'combat'
  | 'combatStage2'
  | 'combatElite'
  | 'combatEliteStage2'
  | 'combatBoss'
  | 'combatBossStage2'
  | 'event'
  | 'rest'
  | 'shop'
  | 'victory'
  | 'defeat';

export type SfxKey =
  | 'uiSelect'
  | 'uiConfirm'
  | 'uiDeny'
  | 'uiExecute'
  | 'coinFlip'
  | 'coinClash'
  | 'patternLock'
  | 'combatStart'
  | 'combatAttack'
  | 'combatSkill'
  | 'combatHit'
  | 'combatDeath'
  | 'rewardItem'
  | 'rewardCoin'
  | 'eventChoice'
  | 'restHeal'
  | 'restEnter'
  | 'shopEnter'
  | 'shopBuy'
  | 'stageClear'
  | 'gameOver';

export type VoiceKey =
  | 'warriorAttack'
  | 'warriorHit'
  | 'warriorDeath'
  | 'rogueAttack'
  | 'rogueHit'
  | 'rogueDeath'
  | 'tankAttack'
  | 'tankHit'
  | 'tankDeath'
  | 'mageAttack'
  | 'mageHit'
  | 'mageDeath';

export interface AudioRuntimeOptions {
  enabled: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
}

export interface ProceduralBgmPreset {
  rootHz: number;
  tempoMs: number;
  sequence: number[];
  padHz: number;
  pulseHz: number;
  filterHz: number;
  gain: number;
  waveform: OscillatorType;
}

export interface ProceduralSfxStep {
  frequency: number;
  endFrequency?: number;
  duration: number;
  delay?: number;
  gain: number;
  type: OscillatorType;
}

export const defaultAudioOptions: AudioRuntimeOptions = {
  enabled: true,
  masterVolume: 0.85,
  musicVolume: 0.55,
  sfxVolume: 0.8,
  voiceVolume: 0.75,
};

export const bgmPresets: Record<BgmKey, ProceduralBgmPreset> = {
  menu: {
    rootHz: 82.41,
    tempoMs: 980,
    sequence: [1, 1.5, 1.25, 1.12, 0.75, 1.25],
    padHz: 41.2,
    pulseHz: 3.2,
    filterHz: 720,
    gain: 0.16,
    waveform: 'triangle',
  },
  exploration: {
    rootHz: 98,
    tempoMs: 720,
    sequence: [1, 1.125, 0.875, 1.5, 1.25, 0.75],
    padHz: 49,
    pulseHz: 4.1,
    filterHz: 920,
    gain: 0.13,
    waveform: 'sine',
  },
  explorationStage2: {
    rootHz: 77.78,
    tempoMs: 860,
    sequence: [1, 0.94, 1.17, 0.71, 1.42, 0.84, 1.08],
    padHz: 38.89,
    pulseHz: 5.3,
    filterHz: 760,
    gain: 0.14,
    waveform: 'triangle',
  },
  combat: {
    rootHz: 110,
    tempoMs: 420,
    sequence: [1, 0.75, 1.5, 1.25, 0.875, 1.5, 1.125],
    padHz: 55,
    pulseHz: 6.4,
    filterHz: 1180,
    gain: 0.18,
    waveform: 'sawtooth',
  },
  combatStage2: {
    rootHz: 92.5,
    tempoMs: 390,
    sequence: [1, 0.84, 1.41, 0.7, 1.5, 0.89, 1.19],
    padHz: 46.25,
    pulseHz: 7.2,
    filterHz: 1320,
    gain: 0.19,
    waveform: 'sawtooth',
  },
  combatElite: {
    rootHz: 116.54,
    tempoMs: 360,
    sequence: [1, 0.75, 1.25, 1.5, 0.75, 1.75, 1.125, 1.5],
    padHz: 58.27,
    pulseHz: 7.8,
    filterHz: 1380,
    gain: 0.2,
    waveform: 'sawtooth',
  },
  combatEliteStage2: {
    rootHz: 87.31,
    tempoMs: 340,
    sequence: [1, 0.71, 1.33, 0.84, 1.59, 0.75, 1.25, 1.5],
    padHz: 43.65,
    pulseHz: 8.4,
    filterHz: 1460,
    gain: 0.21,
    waveform: 'square',
  },
  combatBoss: {
    rootHz: 73.42,
    tempoMs: 330,
    sequence: [1, 0.67, 1.33, 1.5, 0.75, 1.78, 1.12, 0.89],
    padHz: 36.71,
    pulseHz: 8.6,
    filterHz: 1520,
    gain: 0.23,
    waveform: 'square',
  },
  combatBossStage2: {
    rootHz: 58.27,
    tempoMs: 310,
    sequence: [1, 0.63, 1.26, 0.79, 1.58, 0.67, 1.89, 1.12],
    padHz: 29.14,
    pulseHz: 9.2,
    filterHz: 1660,
    gain: 0.24,
    waveform: 'square',
  },
  event: {
    rootHz: 92.5,
    tempoMs: 1320,
    sequence: [1, 1.06, 0.94, 1.25, 0.88],
    padHz: 46.25,
    pulseHz: 2.1,
    filterHz: 620,
    gain: 0.12,
    waveform: 'triangle',
  },
  rest: {
    rootHz: 65.41,
    tempoMs: 1480,
    sequence: [1, 1.25, 1.5, 1.12, 0.84],
    padHz: 32.7,
    pulseHz: 1.4,
    filterHz: 520,
    gain: 0.1,
    waveform: 'sine',
  },
  shop: {
    rootHz: 123.47,
    tempoMs: 860,
    sequence: [1, 1.2, 1.5, 1.33, 1.2, 0.9],
    padHz: 61.74,
    pulseHz: 3.7,
    filterHz: 860,
    gain: 0.12,
    waveform: 'triangle',
  },
  victory: {
    rootHz: 130.81,
    tempoMs: 620,
    sequence: [1, 1.25, 1.5, 2, 1.5, 1.25],
    padHz: 65.41,
    pulseHz: 2.8,
    filterHz: 1150,
    gain: 0.18,
    waveform: 'sine',
  },
  defeat: {
    rootHz: 61.74,
    tempoMs: 1180,
    sequence: [1, 0.89, 0.75, 0.67, 0.56],
    padHz: 30.87,
    pulseHz: 1.7,
    filterHz: 460,
    gain: 0.14,
    waveform: 'sawtooth',
  },
};

export const sfxPresets: Record<SfxKey | VoiceKey, ProceduralSfxStep[]> = {
  uiSelect: [{ frequency: 310, endFrequency: 180, duration: 0.055, gain: 0.026, type: 'triangle' }],
  uiConfirm: [{ frequency: 460, endFrequency: 270, duration: 0.075, gain: 0.034, type: 'sine' }],
  uiDeny: [{ frequency: 150, endFrequency: 70, duration: 0.09, gain: 0.028, type: 'sawtooth' }],
  uiExecute: [{ frequency: 620, endFrequency: 360, duration: 0.11, gain: 0.038, type: 'square' }],
  coinFlip: [
    { frequency: 820, endFrequency: 420, duration: 0.05, gain: 0.03, type: 'triangle' },
    { frequency: 1160, endFrequency: 540, duration: 0.04, delay: 0.045, gain: 0.022, type: 'sine' },
  ],
  coinClash: [
    { frequency: 220, endFrequency: 70, duration: 0.08, gain: 0.04, type: 'square' },
    { frequency: 980, endFrequency: 360, duration: 0.055, delay: 0.025, gain: 0.026, type: 'triangle' },
  ],
  patternLock: [
    { frequency: 420, endFrequency: 520, duration: 0.055, gain: 0.026, type: 'sine' },
    { frequency: 760, endFrequency: 1040, duration: 0.075, delay: 0.05, gain: 0.024, type: 'triangle' },
  ],
  combatStart: [
    { frequency: 74, endFrequency: 52, duration: 0.32, gain: 0.058, type: 'sawtooth' },
    { frequency: 420, endFrequency: 220, duration: 0.12, delay: 0.08, gain: 0.03, type: 'square' },
  ],
  combatAttack: [
    { frequency: 180, endFrequency: 80, duration: 0.09, gain: 0.05, type: 'sawtooth' },
    { frequency: 620, endFrequency: 260, duration: 0.07, delay: 0.025, gain: 0.028, type: 'square' },
  ],
  combatSkill: [
    { frequency: 290, endFrequency: 590, duration: 0.12, gain: 0.045, type: 'triangle' },
    { frequency: 880, endFrequency: 1320, duration: 0.11, delay: 0.07, gain: 0.03, type: 'sine' },
  ],
  combatHit: [
    { frequency: 120, endFrequency: 58, duration: 0.13, gain: 0.055, type: 'sawtooth' },
    { frequency: 710, endFrequency: 210, duration: 0.055, gain: 0.026, type: 'square' },
  ],
  combatDeath: [
    { frequency: 150, endFrequency: 42, duration: 0.42, gain: 0.058, type: 'sawtooth' },
    { frequency: 330, endFrequency: 92, duration: 0.3, delay: 0.12, gain: 0.035, type: 'triangle' },
  ],
  rewardItem: [
    { frequency: 520, endFrequency: 660, duration: 0.09, gain: 0.026, type: 'sine' },
    { frequency: 780, endFrequency: 1040, duration: 0.1, delay: 0.075, gain: 0.025, type: 'triangle' },
  ],
  rewardCoin: [
    { frequency: 1100, endFrequency: 740, duration: 0.045, gain: 0.026, type: 'triangle' },
    { frequency: 1320, endFrequency: 880, duration: 0.045, delay: 0.045, gain: 0.024, type: 'triangle' },
  ],
  eventChoice: [{ frequency: 260, endFrequency: 390, duration: 0.12, gain: 0.032, type: 'triangle' }],
  restHeal: [
    { frequency: 392, endFrequency: 523, duration: 0.16, gain: 0.028, type: 'sine' },
    { frequency: 659, endFrequency: 784, duration: 0.15, delay: 0.12, gain: 0.022, type: 'sine' },
  ],
  restEnter: [{ frequency: 196, endFrequency: 130, duration: 0.24, gain: 0.028, type: 'sine' }],
  shopEnter: [
    { frequency: 490, endFrequency: 370, duration: 0.08, gain: 0.024, type: 'triangle' },
    { frequency: 735, endFrequency: 550, duration: 0.08, delay: 0.07, gain: 0.02, type: 'triangle' },
  ],
  shopBuy: [
    { frequency: 980, endFrequency: 780, duration: 0.045, gain: 0.032, type: 'triangle' },
    { frequency: 1220, endFrequency: 990, duration: 0.045, delay: 0.05, gain: 0.026, type: 'triangle' },
  ],
  stageClear: [
    { frequency: 392, endFrequency: 523, duration: 0.14, gain: 0.036, type: 'sine' },
    { frequency: 523, endFrequency: 784, duration: 0.18, delay: 0.12, gain: 0.034, type: 'sine' },
  ],
  gameOver: [
    { frequency: 196, endFrequency: 82, duration: 0.5, gain: 0.05, type: 'sawtooth' },
    { frequency: 98, endFrequency: 41, duration: 0.55, delay: 0.18, gain: 0.04, type: 'triangle' },
  ],
  warriorAttack: [{ frequency: 170, endFrequency: 82, duration: 0.16, gain: 0.045, type: 'sawtooth' }],
  warriorHit: [{ frequency: 120, endFrequency: 64, duration: 0.13, gain: 0.04, type: 'sawtooth' }],
  warriorDeath: [{ frequency: 132, endFrequency: 40, duration: 0.48, gain: 0.045, type: 'triangle' }],
  rogueAttack: [{ frequency: 360, endFrequency: 190, duration: 0.12, gain: 0.035, type: 'triangle' }],
  rogueHit: [{ frequency: 210, endFrequency: 92, duration: 0.1, gain: 0.034, type: 'triangle' }],
  rogueDeath: [{ frequency: 220, endFrequency: 55, duration: 0.42, gain: 0.038, type: 'sine' }],
  tankAttack: [{ frequency: 92, endFrequency: 62, duration: 0.18, gain: 0.05, type: 'square' }],
  tankHit: [{ frequency: 78, endFrequency: 58, duration: 0.14, gain: 0.048, type: 'square' }],
  tankDeath: [{ frequency: 88, endFrequency: 35, duration: 0.54, gain: 0.052, type: 'sawtooth' }],
  mageAttack: [{ frequency: 520, endFrequency: 880, duration: 0.18, gain: 0.034, type: 'sine' }],
  mageHit: [{ frequency: 330, endFrequency: 120, duration: 0.12, gain: 0.035, type: 'triangle' }],
  mageDeath: [{ frequency: 440, endFrequency: 72, duration: 0.5, gain: 0.04, type: 'sine' }],
};

export const getBgmForGameState = (
  gameState: GameState,
  enemyTier?: 'normal' | 'miniboss' | 'boss',
  currentStage = 1,
): BgmKey => {
  if (gameState === GameState.COMBAT) {
    if (currentStage === 2) {
      if (enemyTier === 'boss') return 'combatBossStage2';
      if (enemyTier === 'miniboss') return 'combatEliteStage2';
      return 'combatStage2';
    }
    if (enemyTier === 'boss') return 'combatBoss';
    if (enemyTier === 'miniboss') return 'combatElite';
    return 'combat';
  }

  if (gameState === GameState.EXPLORATION && currentStage === 2) {
    return 'explorationStage2';
  }

  const map: Record<GameState, BgmKey> = {
    [GameState.MENU]: 'menu',
    [GameState.CHARACTER_SELECT]: 'menu',
    [GameState.EXPLORATION]: 'exploration',
    [GameState.COMBAT]: 'combat',
    [GameState.SHOP]: 'shop',
    [GameState.REST]: 'rest',
    [GameState.EVENT]: 'event',
    [GameState.REWARD]: 'event',
    [GameState.GAME_OVER]: 'defeat',
    [GameState.VICTORY]: 'victory',
    [GameState.STAGE_CLEAR]: 'victory',
    [GameState.MEMORY_ALTAR]: 'rest',
  };

  return map[gameState];
};
