import React, { useCallback, useEffect } from 'react';
import { ChevronRight, Eye, Gauge, HelpCircle, Keyboard, SlidersHorizontal, Volume2, Zap } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import ActionButton from '../components/ui/ActionButton';
import { assetCssUrl } from '../utils/assetPath';
import { playUiSound } from '../utils/sound';
import { GameState } from '../types';
import { APP_RELEASE_LABEL, APP_RELEASE_SCOPE } from '../constants';

const optionButtons = [
  { key: 'reducedMotion' as const, label: '모션', icon: Gauge },
  { key: 'highContrast' as const, label: '대비', icon: Eye },
  { key: 'largeText' as const, label: '큰 글자', icon: Zap },
  { key: 'soundEnabled' as const, label: '사운드', icon: Volume2 },
];

const audioSliders = [
  { key: 'masterVolume' as const, label: '전체' },
  { key: 'musicVolume' as const, label: '음악' },
  { key: 'sfxVolume' as const, label: '효과음' },
  { key: 'voiceVolume' as const, label: '대사' },
];

export const MenuScreen = () => {
  const startGame = useGameStore(state => state.startGame);
  const continueRun = useGameStore(state => state.continueRun);
  const resetGame = useGameStore(state => state.resetGame);
  const player = useGameStore(state => state.player);
  const gameState = useGameStore(state => state.gameState);
  const resumeGameState = useGameStore(state => state.resumeGameState);
  const pendingCombatReward = useGameStore(state => state.pendingCombatReward);
  const currentEvent = useGameStore(state => state.currentEvent);
  const enemy = useGameStore(state => state.enemy);
  const stageNodes = useGameStore(state => state.stageNodes);
  const currentStage = useGameStore(state => state.currentStage);
  const currentTurn = useGameStore(state => state.currentTurn);
  const gameOptions = useGameStore(state => state.gameOptions);
  const setGameOption = useGameStore(state => state.setGameOption);
  const toggleGameOption = useGameStore(state => state.toggleGameOption);
  const resetTutorial = useGameStore(state => state.resetTutorial);

  const hasRun = Boolean(
    player &&
    player.currentHp > 0 &&
    gameState !== GameState.GAME_OVER &&
    gameState !== GameState.VICTORY &&
    (
      resumeGameState === GameState.STAGE_CLEAR ||
      resumeGameState === GameState.MEMORY_ALTAR ||
      pendingCombatReward ||
      currentEvent ||
      (enemy && enemy.currentHp > 0) ||
      stageNodes.length > 0
    ),
  );
  const routeStatus = hasRun ? `${currentStage}층 / ${currentTurn}턴` : APP_RELEASE_SCOPE;

  const startNewGame = useCallback(() => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    resetGame(false);
    startGame();
  }, [gameOptions.soundEnabled, resetGame, startGame]);

  const resumeGame = useCallback(() => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    continueRun();
  }, [continueRun, gameOptions.soundEnabled]);

  const replayTutorial = useCallback(() => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    resetTutorial();
  }, [gameOptions.soundEnabled, resetTutorial]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (hasRun) {
          resumeGame();
          return;
        }

        startNewGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasRun, resumeGame, startNewGame]);

  return (
    <div
      className="menu-screen relative min-h-screen overflow-hidden px-4 py-5 text-white scanlines sm:p-8"
      style={{
        backgroundImage: `linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.5)),${assetCssUrl('assets/backgrounds/lobby-eclipse.png')},${assetCssUrl('mono.png')}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/62" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_12%,rgba(255,255,255,0.16),transparent_22%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.86))]" />

      <div className="menu-content relative z-10">
        <section className="menu-command-panel flex max-w-4xl flex-col justify-center">
          <div className="menu-eyebrow">
            <Gauge className="h-4 w-4" />
            {APP_RELEASE_LABEL}
          </div>
          <h1 className="font-orbitron text-[clamp(2.65rem,8.8vw,7.5rem)] font-black leading-none text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.55)]">
            MONOCHROME
          </h1>
          <p className="font-orbitron mt-2 text-xl font-bold text-gray-300 drop-shadow-md md:text-3xl">
            THE ECLIPSE
          </p>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-gray-200 sm:text-base">
            동전의 앞면과 뒷면으로 전투를 읽는 공개 프로토타입입니다.
            현재 범위는 {APP_RELEASE_SCOPE}이며, 경로를 고르고 자원을 확보해 중심부로 진입하세요.
          </p>

          <div className="menu-action-row">
            {hasRun ? (
              <ActionButton
                onClick={resumeGame}
                variant="primary"
                className="menu-primary-action px-7 py-4 text-lg shadow-2xl shadow-black/40 hover:scale-[1.02]"
                data-testid="continue-run-button"
              >
                계속하기
                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </ActionButton>
            ) : null}
            <ActionButton
              onClick={startNewGame}
              variant={hasRun ? 'ghost' : 'primary'}
              className="menu-primary-action px-7 py-4 text-lg shadow-2xl shadow-black/40 hover:scale-[1.02]"
              data-testid="start-run-button"
            >
              새 탐험
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </ActionButton>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Keyboard className="h-4 w-4" />
              Enter
            </div>
          </div>
        </section>

        <section className="menu-status-dock">
          <div className="menu-run-strip">
            {[
              ['RUN', hasRun ? '저장됨' : '대기'],
              ['ROUTE', routeStatus],
              ['MODE', '동전 전투'],
              ['SCOPE', APP_RELEASE_SCOPE],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-white/8 bg-white/5 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
                <div className="mt-1 text-sm font-black text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="menu-accessibility-dock rounded-lg border border-cyan-300/20 bg-cyan-950/16 p-3 backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100">
              <Eye className="h-4 w-4" />
              OPTIONS
            </div>
            <div className="menu-option-grid grid gap-2">
              {optionButtons.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    playUiSound(gameOptions.soundEnabled, key === 'soundEnabled' && gameOptions.soundEnabled ? 'deny' : 'select');
                    toggleGameOption(key);
                  }}
                  aria-pressed={gameOptions[key]}
                  className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-md border px-2 text-xs font-bold transition-colors ${
                    gameOptions[key]
                      ? 'border-cyan-200 bg-cyan-100 text-gray-950'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={replayTutorial}
              className="menu-tutorial-replay mt-3 inline-flex w-full min-h-10 items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10"
              title="모든 화면의 튜토리얼 코치마크를 다시 표시합니다."
            >
              <span className="inline-flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-cyan-200" />
                튜토리얼 다시 보기
              </span>
              <span className="text-[10px] font-semibold text-slate-400">전 화면</span>
            </button>

            <details className="menu-audio-disclosure mt-3 border-t border-white/10 pt-3">
              <summary className="mb-2 flex cursor-pointer items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100">
                <SlidersHorizontal className="h-4 w-4" />
                AUDIO MIX
              </summary>
              <div className="menu-audio-content grid gap-2">
                {audioSliders.map(({ key, label }) => (
                  <label key={key} className="grid grid-cols-[3.75rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs font-bold text-slate-300">
                    <span>{label}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={gameOptions[key]}
                      disabled={!gameOptions.soundEnabled}
                      onChange={(event) => setGameOption(key, Number(event.target.value))}
                      className="h-2 w-full accent-cyan-200 disabled:opacity-40"
                    />
                    <span className="text-right text-slate-400">{Math.round(gameOptions[key] * 100)}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>
        </section>
      </div>
    </div>
  );
};
