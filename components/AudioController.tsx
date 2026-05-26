import { useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { CharacterClass, GameState } from '../types';
import { audioManager } from '../utils/audioManager';
import { defaultAudioOptions, getBgmForGameState, SfxKey, VoiceKey } from '../utils/audioManifest';
import { playGameSfx, playVoiceBark } from '../utils/sound';

const stateEntrySfx: Partial<Record<GameState, SfxKey>> = {
  [GameState.COMBAT]: 'combatStart',
  [GameState.SHOP]: 'shopEnter',
  [GameState.REST]: 'restEnter',
  [GameState.EVENT]: 'eventChoice',
  [GameState.REWARD]: 'rewardItem',
  [GameState.STAGE_CLEAR]: 'stageClear',
  [GameState.VICTORY]: 'stageClear',
  [GameState.GAME_OVER]: 'gameOver',
};

const voiceKeys: Record<CharacterClass, Record<'attack' | 'hit' | 'death', VoiceKey>> = {
  [CharacterClass.WARRIOR]: {
    attack: 'warriorAttack',
    hit: 'warriorHit',
    death: 'warriorDeath',
  },
  [CharacterClass.ROGUE]: {
    attack: 'rogueAttack',
    hit: 'rogueHit',
    death: 'rogueDeath',
  },
  [CharacterClass.TANK]: {
    attack: 'tankAttack',
    hit: 'tankHit',
    death: 'tankDeath',
  },
  [CharacterClass.MAGE]: {
    attack: 'mageAttack',
    hit: 'mageHit',
    death: 'mageDeath',
  },
};

const AudioController = () => {
  const gameState = useGameStore(state => state.gameState);
  const enemyTier = useGameStore(state => state.enemy?.tier);
  const currentStage = useGameStore(state => state.currentStage);
  const playerClass = useGameStore(state => state.player?.class);
  const playerHit = useGameStore(state => state.playerHit);
  const enemyHit = useGameStore(state => state.enemyHit);
  const eventPhase = useGameStore(state => state.eventPhase);
  const gameOptions = useGameStore(state => state.gameOptions);

  const previousGameState = useRef(gameState);
  const previousEventPhase = useRef(eventPhase);
  const previousHits = useRef({ playerHit, enemyHit });

  const runtimeOptions = useMemo(() => ({
    enabled: gameOptions.soundEnabled,
    masterVolume: gameOptions.masterVolume ?? defaultAudioOptions.masterVolume,
    musicVolume: gameOptions.musicVolume ?? defaultAudioOptions.musicVolume,
    sfxVolume: gameOptions.sfxVolume ?? defaultAudioOptions.sfxVolume,
    voiceVolume: gameOptions.voiceVolume ?? defaultAudioOptions.voiceVolume,
  }), [
    gameOptions.masterVolume,
    gameOptions.musicVolume,
    gameOptions.sfxVolume,
    gameOptions.soundEnabled,
    gameOptions.voiceVolume,
  ]);

  useEffect(() => {
    audioManager.setOptions(runtimeOptions);
  }, [runtimeOptions]);

  useEffect(() => {
    if (!runtimeOptions.enabled) {
      audioManager.stopAll();
      return;
    }

    audioManager.playBgm(getBgmForGameState(gameState, enemyTier, currentStage));
  }, [currentStage, enemyTier, gameState, runtimeOptions.enabled]);

  useEffect(() => {
    const previous = previousGameState.current;

    if (previous !== gameState) {
      const sfx = stateEntrySfx[gameState];
      if (sfx) {
        playGameSfx(runtimeOptions.enabled, sfx);
      }

      if (gameState === GameState.GAME_OVER && playerClass) {
        playVoiceBark(runtimeOptions.enabled, voiceKeys[playerClass].death);
      }

      previousGameState.current = gameState;
    }
  }, [gameState, playerClass, runtimeOptions.enabled]);

  useEffect(() => {
    const previous = previousEventPhase.current;

    if (gameState === GameState.EVENT && previous !== eventPhase) {
      if (eventPhase === 'coinFlip') {
        playGameSfx(runtimeOptions.enabled, 'coinFlip');
      }

      if (eventPhase === 'result') {
        playGameSfx(runtimeOptions.enabled, 'rewardItem');
      }
    }

    previousEventPhase.current = eventPhase;
  }, [eventPhase, gameState, runtimeOptions.enabled]);

  useEffect(() => {
    const previous = previousHits.current;

    if (playerHit > previous.playerHit) {
      playGameSfx(runtimeOptions.enabled, 'combatHit');
      if (playerClass) {
        playVoiceBark(runtimeOptions.enabled, voiceKeys[playerClass].hit);
      }
    }

    if (enemyHit > previous.enemyHit) {
      playGameSfx(runtimeOptions.enabled, 'combatHit');
    }

    previousHits.current = { playerHit, enemyHit };
  }, [enemyHit, playerClass, playerHit, runtimeOptions.enabled]);

  return null;
};

export default AudioController;
