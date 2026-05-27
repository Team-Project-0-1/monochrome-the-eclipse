import React, { useEffect, useRef } from "react";
import { useGameStore } from './store/gameStore';
import { GameState } from "./types";
import { AnimatePresence } from 'framer-motion';

import { MenuScreen } from './screens/MenuScreen';
import { CharacterSelectScreen } from './screens/CharacterSelectScreen';
import { ExplorationScreen } from './screens/ExplorationScreen';
import { CombatScreen } from './screens/CombatScreen';
import { ShopScreen } from './screens/ShopScreen';
import { RestScreen } from './screens/RestScreen';
import { EventScreen } from './screens/EventScreen';
import { CombatRewardScreen } from './screens/CombatRewardScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { VictoryScreen } from './screens/VictoryScreen';
import { StageClearScreen } from './screens/StageClearScreen';
import { MemoryAltarScreen } from './screens/MemoryAltarScreen';

import InventoryPanel from './components/InventoryPanel';
import SkillReplacementModal from './components/modals/SkillReplacementModal';
import KeywordTooltip from "./components/KeywordTooltip";
import TutorialCoachmark from "./components/TutorialCoachmark";
import AudioController from "./components/AudioController";
import { validateContentManifest } from "./utils/contentValidation";

export const App: React.FC = () => {
  const contentValidationLogged = useRef(false);
  const gameState = useGameStore(state => state.gameState);
  const isInventoryOpen = useGameStore(state => state.isInventoryOpen);
  const setInventoryOpen = useGameStore(state => state.setInventoryOpen);
  const player = useGameStore(state => state.player);
  const unlockedPatterns = useGameStore(state => state.unlockedPatterns);
  const forgetSkill = useGameStore(state => state.forgetSkill);
  const tooltip = useGameStore(state => state.tooltip);
  const hideTooltip = useGameStore(state => state.hideTooltip);
  const gameOptions = useGameStore(state => state.gameOptions);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (contentValidationLogged.current) return;
    contentValidationLogged.current = true;

    const issues = validateContentManifest();
    issues.forEach((issue) => {
      if (issue.severity === 'error') {
        console.error(`[content:${issue.severity}] ${issue.scope} - ${issue.message}`);
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = gameOptions.reducedMotion ? 'true' : 'false';
    document.documentElement.dataset.highContrast = gameOptions.highContrast ? 'true' : 'false';
    document.documentElement.dataset.largeText = gameOptions.largeText ? 'true' : 'false';
    document.documentElement.dataset.combatAssist = gameOptions.combatAssist ? 'true' : 'false';

    const body = document.body;
    body.classList.toggle('is-reduced-motion', gameOptions.reducedMotion);
    body.classList.toggle('is-high-contrast', gameOptions.highContrast);
    body.classList.toggle('is-large-text', gameOptions.largeText);
  }, [
    gameOptions.combatAssist,
    gameOptions.highContrast,
    gameOptions.largeText,
    gameOptions.reducedMotion,
  ]);

  const renderGame = () => {
    switch (gameState) {
      case GameState.MENU:
        return <MenuScreen />;
      case GameState.CHARACTER_SELECT:
        return <CharacterSelectScreen />;
      case GameState.EXPLORATION:
        return <ExplorationScreen />;
      case GameState.COMBAT:
        return <CombatScreen />;
      case GameState.SHOP:
        return <ShopScreen />;
      case GameState.REST:
        return <RestScreen />;
      case GameState.EVENT:
        return <EventScreen />;
      case GameState.REWARD:
        return <CombatRewardScreen />;
      case GameState.GAME_OVER:
        return <GameOverScreen />;
      case GameState.VICTORY:
        return <VictoryScreen />;
      case GameState.STAGE_CLEAR:
        return <StageClearScreen />;
      case GameState.MEMORY_ALTAR:
        return <MemoryAltarScreen />;
      default:
        return (
          <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
            알 수 없는 화면 상태입니다.
          </div>
        );
    }
  };

  return (
    <>
      <AudioController />
      <AnimatePresence>
        {tooltip && <KeywordTooltip />}
      </AnimatePresence>
      {tooltip && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 'var(--z-hud-raised)' }}
          onClick={hideTooltip}
        />
      )}

      {renderGame()}
      <TutorialCoachmark />

      {player && (
        <InventoryPanel
          isOpen={isInventoryOpen}
          onClose={() => setInventoryOpen(false)}
          player={player}
          unlockedPatterns={unlockedPatterns}
          onForgetSkill={forgetSkill}
        />
      )}
      <SkillReplacementModal />
    </>
  );
};
