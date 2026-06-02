import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Eye, Gauge, HelpCircle, Keyboard, SlidersHorizontal, Volume2, Zap } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import ActionButton from '../components/ui/ActionButton';
import { assetCssUrl } from '../utils/assetPath';
import { playUiSound } from '../utils/sound';
import { summarizeRunHistory } from '../utils/runStats';
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
  const metaProgress = useGameStore(state => state.metaProgress);
  const [showAudioMix, setShowAudioMix] = useState(false);

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
  // 신규 상태에서 SCOPE로 폴백하면 '범위' 카드와 글자까지 같아진다(V-3). 진행 중에는 위치를, 신규에는 제3의 값을 보여 세 카드를 구별.
  const routeStatus = hasRun ? `${currentStage}층 / ${currentTurn}턴` : '진입 전';
  // 로비는 캐릭터 선택 전이라 전체(overall) 승률을 쓴다. totalRuns(사망만 카운트)는 의미가 달라 의도적으로 쓰지 않는다.
  const runSummary = useMemo(() => summarizeRunHistory(metaProgress.runHistory), [metaProgress.runHistory]);
  const topDeathStage = useMemo(() => {
    const ranked = Object.entries(runSummary.deathsByStage)
      .map(([stage, count]) => ({ stage: Number(stage), count: Number(count) }))
      .sort((a, b) => b.count - a.count || a.stage - b.stage);
    return ranked.length > 0 ? ranked[0].stage : null;
  }, [runSummary.deathsByStage]);

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
        backgroundImage: `${assetCssUrl('assets/backgrounds/lobby-eclipse.png')},${assetCssUrl('mono.png')}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 32%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="menu-scrim" />

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
              Enter · {hasRun ? '계속하기' : '새 탐험'}
            </div>
          </div>
        </section>

        <section className="menu-status-dock">
          <div className="menu-run-strip">
            {[
              ['진행', hasRun ? '저장됨' : '대기'],
              ['경로', routeStatus],
              ['모드', '동전 전투'],
              ['범위', APP_RELEASE_SCOPE],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-white/8 bg-white/5 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
                <div className="mt-1 text-sm font-black text-white">{value}</div>
              </div>
            ))}
          </div>

          {runSummary.total > 0 ? (
            <div className="menu-run-stats rounded-md border border-white/8 bg-white/5 px-3 py-2 text-xs leading-relaxed text-slate-300">
              <span className="font-bold uppercase tracking-[0.16em] text-slate-500">최근 기록</span>
              <span className="ml-2 text-slate-200">최근 {runSummary.total}런 · 승률 {runSummary.overall.winrate}% ({runSummary.overall.wins}승 {runSummary.overall.losses}패)</span>
              {topDeathStage !== null ? <span className="ml-2 text-slate-400">· 최다 사망 {topDeathStage}스테이지</span> : null}
            </div>
          ) : null}

          <div className="menu-accessibility-dock rounded-lg border border-cyan-300/20 bg-cyan-950/16 p-3 backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100">
              <Eye className="h-4 w-4" />
              옵션
            </div>
            <div className="menu-option-grid grid gap-2">
              {optionButtons.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const willEnable = !gameOptions[key];
                    if (key === 'soundEnabled') {
                      if (willEnable) playUiSound(true, 'select');
                    } else {
                      playUiSound(gameOptions.soundEnabled, 'select');
                    }
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

            <div className="mt-3 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setShowAudioMix(value => !value)}
                aria-expanded={showAudioMix}
                aria-controls="menu-audio-mix-panel"
                className="flex w-full items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100"
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  사운드 믹스
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showAudioMix ? 'rotate-180' : ''}`} />
              </button>
              {showAudioMix ? (
                <div id="menu-audio-mix-panel" className="mt-2 grid gap-2" role="group" aria-label="사운드 믹스">
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
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
