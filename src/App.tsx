import React, { useEffect, useRef, lazy, Suspense } from "react";
import { useGameStore } from './store/gameStore';
import { GameState } from "./types";
import { AnimatePresence } from 'framer-motion';

// 화면은 진입 시에만 필요하므로 React.lazy로 코드 스플리팅한다(초기 번들 축소).
// 각 화면은 named export라 default로 매핑해 lazy에 넘긴다.
const MenuScreen = lazy(() => import('./screens/MenuScreen').then(m => ({ default: m.MenuScreen })));
const CharacterSelectScreen = lazy(() => import('./screens/CharacterSelectScreen').then(m => ({ default: m.CharacterSelectScreen })));
const ExplorationScreen = lazy(() => import('./screens/ExplorationScreen').then(m => ({ default: m.ExplorationScreen })));
const CombatScreen = lazy(() => import('./screens/CombatScreen').then(m => ({ default: m.CombatScreen })));
const ShopScreen = lazy(() => import('./screens/ShopScreen').then(m => ({ default: m.ShopScreen })));
const RestScreen = lazy(() => import('./screens/RestScreen').then(m => ({ default: m.RestScreen })));
const EventScreen = lazy(() => import('./screens/EventScreen').then(m => ({ default: m.EventScreen })));
const CombatRewardScreen = lazy(() => import('./screens/CombatRewardScreen').then(m => ({ default: m.CombatRewardScreen })));
const GameOverScreen = lazy(() => import('./screens/GameOverScreen').then(m => ({ default: m.GameOverScreen })));
const VictoryScreen = lazy(() => import('./screens/VictoryScreen').then(m => ({ default: m.VictoryScreen })));
const StageClearScreen = lazy(() => import('./screens/StageClearScreen').then(m => ({ default: m.StageClearScreen })));
const MemoryAltarScreen = lazy(() => import('./screens/MemoryAltarScreen').then(m => ({ default: m.MemoryAltarScreen })));

import InventoryPanel from './components/InventoryPanel';
import SkillReplacementModal from './components/modals/SkillReplacementModal';
import KeywordTooltip from "./components/KeywordTooltip";
import TutorialCoachmark from "./components/TutorialCoachmark";
import AudioController from "./components/AudioController";
import ErrorBoundary from "./components/ErrorBoundary";
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
  const setGameState = useGameStore(state => state.setGameState);
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

  // 키워드 툴팁은 Enter/Space로 열리므로 키보드 사용자가 Escape로 닫을 수 있어야 동작이 일관된다.
  useEffect(() => {
    if (!tooltip) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hideTooltip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tooltip, hideTooltip]);

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
      <ErrorBoundary onReset={() => { hideTooltip(); setGameState(GameState.MENU); }}>
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

        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-950" aria-hidden="true" />}>
          {renderGame()}
        </Suspense>
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
      </ErrorBoundary>
    </>
  );
};
