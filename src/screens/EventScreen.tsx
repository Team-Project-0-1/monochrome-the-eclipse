import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import EventCoinFlip from '../components/EventCoinFlip';
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import { assetCssUrl } from '../utils/assetPath';
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

  const continueFromResult = () => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    continueEventResult();
  };

  return (
    // 발견된 기록 — 책상 위 편지/사진 한 장 위에서 다음 선택을 읽는다(런 중 화면, 슬더스 문법).
    <ArchiveSurface scene={sceneBackgroundImage} className="archive-event-screen p-4 sm:p-6">
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] max-w-4xl flex-col justify-center gap-5">
        {eventPhase === 'choice' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            {/* 발견된 기록물 — 편지/사진 본문 */}
            <article className="archive-record">
              <ArchiveStamp>{scene.kicker}</ArchiveStamp>
              <div className="archive-record-location">{scene.location}</div>
              <h1 className="archive-record-title">{currentEvent.title}</h1>
              <p className="archive-record-body">{currentEvent.description}</p>
              <div className="archive-record-dialogue">
                <span>{scene.speaker}</span>
                <strong>{scene.line}</strong>
              </div>
              <div className="archive-record-stats">
                <span className="archive-tag">감각 <strong>{player.signature ?? '감각 동기'}</strong></span>
                <span className="archive-tag">무기 <strong>{player.weapon ?? '무기'}</strong></span>
                <span className="archive-tag">체력 <strong>{player.currentHp}/{player.maxHp}</strong></span>
              </div>
            </article>

            {/* 여백의 연필 주석 — 선택지 */}
            <div className="archive-margin-notes" role="group" aria-label="선택지">
              {currentEvent.choices.map((choice, index) => {
                const preview = getEventChoicePresentation(choice, player.class, resources);
                return (
                  <button
                    key={`${choice.text}-${index}`}
                    type="button"
                    className="archive-margin-note"
                    disabled={preview.locked}
                    onClick={() => {
                      playUiSound(gameOptions.soundEnabled, 'confirm');
                      playGameSfx(gameOptions.soundEnabled, 'eventChoice');
                      handleEventChoice(choice);
                    }}
                  >
                    <span className="archive-margin-note-head">
                      <span className="archive-margin-note-text">{choice.text}</span>
                      <span className="archive-margin-note-odds">{preview.oddsLabel}</span>
                    </span>
                    {preview.requirementLabel && (
                      <span className="archive-margin-note-req">
                        {preview.locked ? '잠김 · ' : '조건 · '}{preview.requirementLabel}
                      </span>
                    )}
                    <span className="archive-margin-note-meta">
                      <span>보상 · {preview.rewardLabel}</span>
                      <span>위험 · {preview.riskLabel}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {eventPhase === 'coinFlip' && eventResultData?.type === 'coinFlipSetup' && (
          // EventCoinFlip은 밝은 텍스트/코인 전제 → 밝은 인화지가 아니라 어두운 frame 위에 둔다.
          <div className="archive-coinflip-frame mx-auto w-full max-w-2xl text-center">
            <div className="archive-tray-label">{scene.kicker} · {scene.location}</div>
            <div className="mt-4">
              <EventCoinFlip targetHeads={eventResultData.payload.targetHeads} onComplete={eventResultData.payload.onComplete} />
            </div>
          </div>
        )}

        {eventPhase === 'result' && eventResultData?.payload && (
          <article className="archive-record mx-auto w-full max-w-2xl text-center">
            <span className="archive-result-stamp">결과</span>
            <div className="archive-record-location mt-3">{scene.kicker} · {scene.location}</div>
            <p className="archive-record-body whitespace-pre-wrap">
              {String(eventResultData.payload.baseMessage || '결과가 발생했습니다.')}
            </p>
            {eventDisplayItems.length > 0 && (
              <div className="archive-record-stats justify-center">
                {eventDisplayItems.map(({ label, value }) => {
                  const isNum = typeof value === 'number';
                  const isString = typeof value === 'string';
                  if (!isNum && !isString) return null;
                  const isPositive = isNum && value > 0;
                  return (
                    <span key={label} className="archive-tag">
                      {label} <strong style={{ color: isNum ? (isPositive ? '#3f9d57' : '#b4513f') : undefined }}>
                        {isPositive ? '+' : ''}{String(value)}
                      </strong>
                    </span>
                  );
                })}
              </div>
            )}
            {/* 밝은 인화지 위라 ghost(밝은 글씨) 대신 청록 배경 버튼으로 대비·강조 확보 */}
            <button type="button" className="archive-buy-btn mx-auto mt-6" style={{ maxWidth: '12rem' }} onClick={continueFromResult}>
              계속
              <ArrowRight className="h-4 w-4" />
            </button>
          </article>
        )}
      </section>
    </ArchiveSurface>
  );
};
