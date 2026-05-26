import React from 'react';
import { AlertTriangle, ArrowRight, Dice5, Lock, RadioTower, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import EventCoinFlip from '../components/EventCoinFlip';
import ActionButton from '../components/ui/ActionButton';
import Panel from '../components/ui/Panel';
import { assetCssUrl, assetPath } from '../utils/assetPath';
import { getEventChoicePresentation } from '../utils/eventPresentation';
import { getEventScenePresentation } from '../utils/eventScenes';
import { playGameSfx, playUiSound } from '../utils/sound';

export const EventScreen = () => {
  const currentEvent = useGameStore(state => state.currentEvent);
  const player = useGameStore(state => state.player);
  const eventPhase = useGameStore(state => state.eventPhase);
  const eventResultData = useGameStore(state => state.eventResultData);
  const eventDisplayItems = useGameStore(state => state.eventDisplayItems);
  const resources = useGameStore(state => state.resources);
  const handleEventChoice = useGameStore(state => state.handleEventChoice);
  const continueEventResult = useGameStore(state => state.continueEventResult);
  const gameOptions = useGameStore(state => state.gameOptions);

  if (!currentEvent || !player) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">이벤트 로딩 중...</div>;
  }

  const scene = getEventScenePresentation(currentEvent.id);
  const sceneBackgroundImage = scene.backgroundCss ?? assetCssUrl(scene.backgroundPath ?? 'assets/backgrounds/event-encounter.png');
  const sceneMobileBackgroundImage = scene.backgroundCss ?? assetCssUrl(scene.mobileBackgroundPath ?? scene.backgroundPath ?? 'assets/backgrounds/event-encounter.png');
  const sceneBackgroundStyle = {
    '--event-bg-image': sceneBackgroundImage,
    '--event-mobile-bg-image': sceneMobileBackgroundImage,
  } as React.CSSProperties;

  const continueFromResult = () => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    continueEventResult();
  };

  const renderResult = () => {
    if (eventPhase !== 'result' || !eventResultData?.payload) {
      return null;
    }

    const { payload } = eventResultData;
    const message = String(payload.baseMessage || '결과가 발생했습니다.');

    return (
      <Panel className="event-result-panel mx-auto w-full max-w-3xl p-5 text-center sm:p-7" tone="gold">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-yellow-200/30 bg-yellow-300/12 text-yellow-200">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="event-result-meta">
          <span>{scene.kicker}</span>
          <b>{scene.location}</b>
        </div>
        <h2 className="font-orbitron text-3xl font-black text-yellow-300">결과</h2>
        <p className="mx-auto mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-slate-200 sm:text-base">{message}</p>

        {eventDisplayItems.length > 0 && (
          <div className="mx-auto mt-5 grid max-w-xl gap-2 text-sm">
            {eventDisplayItems.map(({ label, value }) => {
              const isNum = typeof value === 'number';
              const isString = typeof value === 'string';
              if (!isNum && !isString) return null;

              const valueColor = isNum ? (value > 0 ? 'text-green-300' : 'text-red-300') : 'text-slate-200';
              const isPositive = isNum && value > 0;

              return (
                <div key={label} className="flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-3 py-2">
                  <span className="text-slate-400">{label}</span>
                  <strong className={valueColor}>{isPositive ? '+' : ''}{String(value)}</strong>
                </div>
              );
            })}
          </div>
        )}

        <ActionButton onClick={continueFromResult} variant="primary" className="mt-6 px-7">
          계속
          <ArrowRight className="h-4 w-4" />
        </ActionButton>
      </Panel>
    );
  };

  return (
    <main className={`event-screen event-scene ${scene.className} relative min-h-screen overflow-hidden bg-gray-950 p-3 text-white scanlines sm:p-5`}>
      <div
        className="event-scene-bg"
        style={sceneBackgroundStyle}
      />
      <div className="event-scene-prop" aria-hidden="true">{scene.propLabel}</div>
      <div className="event-player-figure" aria-hidden="true">
        {player.spriteSheetSrc ? (
          <div className="event-player-sprite" style={{ backgroundImage: `url('${assetPath(player.spriteSheetSrc)}')` }} />
        ) : player.portraitSrc ? (
          <img src={assetPath(player.portraitSrc)} alt="" loading="lazy" decoding="async" />
        ) : null}
      </div>

      <div className="event-content relative z-10">
        {eventPhase === 'choice' && (
          <section className="event-layout grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <Panel className="event-story-panel overflow-hidden p-5 sm:p-7" tone="gold">
              <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-yellow-200/30 bg-yellow-950/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-yellow-100">
                <RadioTower className="h-4 w-4" />
                {scene.kicker}
              </div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{scene.location}</div>
              <h1 className="font-orbitron text-3xl font-black text-yellow-300 sm:text-5xl">{currentEvent.title}</h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-200 sm:text-lg">
                {currentEvent.description}
              </p>

              <div className="event-dialogue">
                <div>
                  <span>{scene.speaker}</span>
                  <strong>{scene.line}</strong>
                </div>
              </div>

              <div className="event-player-grid mt-6 grid gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">감각</div>
                  <div className="mt-1 font-black text-cyan-100">{player.signature ?? '감각 동기'}</div>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">무기</div>
                  <div className="mt-1 font-black text-white">{player.weapon ?? '무기'}</div>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">체력</div>
                  <div className="mt-1 font-black text-lime-200">{player.currentHp}/{player.maxHp}</div>
                </div>
              </div>
            </Panel>

            <aside className="event-choice-panel rounded-lg border border-white/10 bg-black/38 p-3 backdrop-blur-md sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-100">선택지</div>
                  <p className="mt-1 text-xs text-slate-400">선택 전 확률과 위험을 확인하세요.</p>
                </div>
                <Dice5 className="h-6 w-6 text-yellow-200" />
              </div>

              <div className="event-choice-list grid gap-2">
                {currentEvent.choices.map((choice, index) => {
                  const preview = getEventChoicePresentation(choice, player.class, resources);
                  return (
                    <button
                      key={`${choice.text}-${index}`}
                      type="button"
                      onClick={() => {
                        playUiSound(gameOptions.soundEnabled, 'confirm');
                        playGameSfx(gameOptions.soundEnabled, 'eventChoice');
                        handleEventChoice(choice);
                      }}
                      disabled={preview.locked}
                      className={`event-choice-button rounded-lg border p-3 text-left transition-colors ${
                        preview.locked
                          ? 'cursor-not-allowed border-white/10 bg-slate-800/55 text-slate-500'
                          : 'border-yellow-200/20 bg-yellow-950/14 text-white hover:border-yellow-200/45 hover:bg-yellow-950/26'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-black">{choice.text}</div>
                          {preview.requirementLabel && (
                            <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              preview.locked ? 'bg-red-950/40 text-red-200' : 'bg-cyan-950/35 text-cyan-100'
                            }`}>
                              {preview.locked ? <Lock className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                              {preview.requirementLabel}
                            </div>
                          )}
                        </div>
                        <span className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm font-black text-yellow-200">
                          {preview.oddsLabel}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        <span className="rounded-md border border-green-300/15 bg-green-950/16 px-2 py-1 text-green-100">
                          보상: {preview.rewardLabel}
                        </span>
                        <span className="rounded-md border border-red-300/15 bg-red-950/18 px-2 py-1 text-red-100">
                          위험: {preview.riskLabel}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                <AlertTriangle className="h-4 w-4 text-yellow-200" />
                확률 선택은 즉시 판정됩니다.
              </div>
            </aside>
          </section>
        )}

        {eventPhase === 'coinFlip' && eventResultData?.type === 'coinFlipSetup' && (
          <Panel className="mx-auto w-full max-w-3xl p-5 sm:p-7" tone="gold">
            <EventCoinFlip targetHeads={eventResultData.payload.targetHeads} onComplete={eventResultData.payload.onComplete} />
          </Panel>
        )}

        {renderResult()}
      </div>
    </main>
  );
};
