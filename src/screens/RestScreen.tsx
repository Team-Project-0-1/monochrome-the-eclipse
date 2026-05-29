import React from 'react';
import { ArrowRight, Bed, HeartPulse, Landmark, Moon, SkipForward } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import ActionButton from '../components/ui/ActionButton';
import { assetCssUrl, assetPath } from '../utils/assetPath';
import { playGameSfx, playUiSound } from '../utils/sound';

export const RestScreen = () => {
  const player = useGameStore(state => state.player);
  const resources = useGameStore(state => state.resources);
  const handleRestChoice = useGameStore(state => state.handleRestChoice);
  const proceedToNextTurn = useGameStore(state => state.proceedToNextTurn);
  const gameOptions = useGameStore(state => state.gameOptions);

  if (!player) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">휴식 지점 로딩 중...</div>;
  }

  const healAmount = Math.floor(player.maxHp * 0.4);
  const healedHp = Math.min(player.maxHp, player.currentHp + healAmount);
  const missingHp = Math.max(0, player.maxHp - player.currentHp);
  const canHeal = missingHp > 0;
  // 회복량(maxHp*0.4)이 상한에 잘리지 않고 온전히 적용되는 60% 이하에서 회복을 권장,
  // 그 외(거의 만피 등)에는 영구 성장인 제단을 우선 권장한다.
  const recommendedChoice: 'heal' | 'altar' | null =
    canHeal && player.currentHp / player.maxHp <= 0.6
      ? 'heal'
      : resources.memoryPieces > 0
        ? 'altar'
        : null;
  const restSceneStyle = {
    '--rest-bg-image': assetCssUrl('assets/backgrounds/rest-camp.png'),
    '--rest-mobile-bg-image': assetCssUrl('assets/backgrounds/mobile-event-rest.png'),
  } as React.CSSProperties;

  const chooseHeal = () => {
    if (!canHeal) {
      playUiSound(gameOptions.soundEnabled, 'deny');
      return;
    }

    playUiSound(gameOptions.soundEnabled, 'confirm');
    playGameSfx(gameOptions.soundEnabled, 'restHeal');
    handleRestChoice('heal');
  };

  const chooseAltar = () => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    handleRestChoice('memory_altar');
  };

  const skipRest = () => {
    playUiSound(gameOptions.soundEnabled, 'select');
    proceedToNextTurn();
  };

  return (
    <main className="rest-screen relative min-h-screen overflow-hidden bg-gray-950 text-white scanlines">
      <div
        className="rest-scene-bg"
        style={restSceneStyle}
      />
      <div className="rest-ambient-lines" />

      <section className="rest-content relative z-10">
        <div className="rest-story">
          <div className="rest-kicker">
            <Moon className="h-4 w-4" />
            안전 공명대
          </div>
          <h1 className="font-orbitron text-4xl font-black text-white sm:text-6xl">휴식처</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">
            균열의 소음이 잠시 멎었습니다. 장비를 내려놓고 숨을 고르거나, 남은 기억 조각을 제단에 새겨 다음 싸움의 기준을 바꿀 수 있습니다.
          </p>

          <div className="rest-dialogue">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">야영 기록</div>
            <p>"동전은 멈췄을 때 더 크게 울린다. 지금은 선택을 미룰 수 있는 몇 안 되는 순간이다."</p>
          </div>
        </div>

        <div className="rest-actor" aria-label={`${player.name} 휴식 장면`}>
          {player.spriteSheetSrc ? (
            <div className="rest-actor-sprite" style={{ backgroundImage: `url('${assetPath(player.spriteSheetSrc)}')` }} />
          ) : player.portraitSrc ? (
            <img src={assetPath(player.portraitSrc)} alt="" loading="lazy" decoding="async" />
          ) : null}
          <div className="rest-actor-name">
            <strong>{player.name}</strong>
            <span>{player.signature ?? player.weapon ?? '공명 감각'}</span>
          </div>
        </div>

        <aside className="rest-choice-panel">
          <div className="rest-status-card">
            <span>HP</span>
            <strong>{player.currentHp}/{player.maxHp}</strong>
            <div className="rest-hp-bar">
              <i style={{ width: `${(player.currentHp / player.maxHp) * 100}%` }} />
            </div>
          </div>

          <button
            type="button"
            className={`rest-choice primary${recommendedChoice === 'heal' ? ' is-recommended' : ''}`}
            onClick={chooseHeal}
            disabled={!canHeal}
          >
            <span className="rest-choice-icon"><HeartPulse className="h-5 w-5" /></span>
            <span>
              <strong>체력 회복{recommendedChoice === 'heal' && <span className="rest-choice-badge">권장</span>}</strong>
              <small>{canHeal ? `${player.currentHp} → ${healedHp} HP` : '이미 최대 체력입니다'}</small>
            </span>
            <ArrowRight className="h-5 w-5" />
          </button>

          <button
            type="button"
            className={`rest-choice${recommendedChoice === 'altar' ? ' is-recommended' : ''}`}
            onClick={chooseAltar}
          >
            <span className="rest-choice-icon"><Landmark className="h-5 w-5" /></span>
            <span>
              <strong>기억의 제단{recommendedChoice === 'altar' && <span className="rest-choice-badge">권장</span>}</strong>
              <small>기억 조각 {resources.memoryPieces}개 보유</small>
            </span>
            <ArrowRight className="h-5 w-5" />
          </button>

          <button type="button" className="rest-choice muted" onClick={skipRest}>
            <span className="rest-choice-icon"><SkipForward className="h-5 w-5" /></span>
            <span>
              <strong>정비 없이 이동</strong>
              <small>다음 경로로 바로 진행</small>
            </span>
            <ArrowRight className="h-5 w-5" />
          </button>

          <ActionButton variant="ghost" className="rest-mobile-skip" onClick={skipRest}>
            <Bed className="h-4 w-4" />
            휴식 건너뛰기
          </ActionButton>
        </aside>
      </section>
    </main>
  );
};
