import React from 'react';
import { SkipForward } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveCard from '../components/archive/ArchiveCard';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import ArchiveCaption from '../components/archive/ArchiveCaption';
import { assetCssUrl, assetPath } from '../utils/assetPath';
import { resourceIconPaths } from '../utils/resourceAssets';
import { playGameSfx, playUiSound } from '../utils/sound';

// 휴식 선택지 = 암실 현상대 위 폴라로이드. 손으로 놓은 기울기(균일하면 그리드로 보인다).
const CARD_TILTS = [-1.3, 0.8, -0.5];

export const RestScreen = () => {
  const player = useGameStore(state => state.player);
  const resources = useGameStore(state => state.resources);
  const handleRestChoice = useGameStore(state => state.handleRestChoice);
  const proceedToNextTurn = useGameStore(state => state.proceedToNextTurn);
  const gameOptions = useGameStore(state => state.gameOptions);

  if (!player) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        휴식 지점 로딩 중...
      </main>
    );
  }

  const healAmount = Math.floor(player.maxHp * 0.4);
  const healedHp = Math.min(player.maxHp, player.currentHp + healAmount);
  const missingHp = Math.max(0, player.maxHp - player.currentHp);
  const canHeal = missingHp > 0;
  // 회복량(maxHp*0.4)이 상한에 잘리지 않는 60% 이하에서 회복 권장, 그 외엔 영구 성장(제단) 권장.
  const recommendedChoice: 'heal' | 'altar' | null =
    canHeal && player.currentHp / player.maxHp <= 0.6
      ? 'heal'
      : resources.memoryPieces > 0
        ? 'altar'
        : null;
  const hpPct = Math.round((player.currentHp / player.maxHp) * 100);

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
    // 암실(현상실) — 야영 장면 위에서 다음 한 수를 현상한다(런 중 화면, 슬더스 문법).
    <ArchiveSurface scene={assetCssUrl('assets/backgrounds/rest-camp.png')} className="archive-rest-screen overflow-hidden p-4 sm:p-6">
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] max-w-4xl flex-col justify-center gap-6">
        {/* 정비 기록 도장 + 현상값 트레이 — 키커/타이틀/설명문/HP 카드의 다이어제틱 대체물 */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <ArchiveStamp>안전 공명대 — 정비 기록</ArchiveStamp>
          <div className="archive-tray" role="img" aria-label={`체력 ${player.currentHp}/${player.maxHp}`}>
            <span className="archive-tray-label">현상값 · 체력</span>
            <strong>{player.currentHp}<small>/{player.maxHp}</small></strong>
            <div className="archive-tray-gauge"><i style={{ width: `${hpPct}%` }} /></div>
          </div>
        </header>

        {/* 야영 기록 대사 — 책상 모서리 메모지 */}
        <aside className="archive-note max-w-xl self-start">
          "동전은 멈췄을 때 더 크게 울린다. 지금은 선택을 미룰 수 있는 몇 안 되는 순간이다."
        </aside>

        {/* 현상대 위 폴라로이드 — 정비 선택지 3장. 각 카드는 div로 감싼다(button을 grid item으로
            직접 두면 min-content로 줄어 좌측에 뭉친다 — 보상화면과 동일 구조). */}
        <div className="grid gap-5 sm:grid-cols-3">
          {/* 회복 */}
          <div>
            <ArchiveCard
              interactive
              dealt
              tilt={CARD_TILTS[0]}
              disabled={!canHeal}
              aria-label={canHeal ? `체력 회복 — ${player.currentHp}에서 ${healedHp}로 현상` : '체력 회복 — 이미 최대 체력'}
              onClick={chooseHeal}
              className="w-full"
            >
              <div className="archive-polaroid">
                <img src={assetPath('assets/items/healing-vial.png')} alt="" loading="lazy" />
                {canHeal && (
                  // 회복량 — 현상된 결과를 폴라로이드에 또렷이 표시(스펙 §3.3).
                  <div className="archive-develop-readout">
                    <span className="from">{player.currentHp}</span>
                    <span className="arrow">→</span>
                    <span className="to">{healedHp}</span>
                  </div>
                )}
              </div>
              <ArchiveCaption>
                <strong>체력 회복</strong>
                {recommendedChoice === 'heal' && <ArchiveStamp className="archive-stamp-mini">권장</ArchiveStamp>}
              </ArchiveCaption>
              <ArchiveCaption sub>{canHeal ? '현상액 속에서 회복량이 떠오른다' : '이미 최대 체력입니다'}</ArchiveCaption>
            </ArchiveCard>
          </div>

          {/* 기억의 제단 */}
          <div>
            <ArchiveCard
              interactive
              dealt
              tilt={CARD_TILTS[1]}
              aria-label={`기억의 제단 — 기억 조각 ${resources.memoryPieces}개 보유`}
              onClick={chooseAltar}
              className="w-full"
            >
              <div className="archive-polaroid">
                <img src={assetPath(resourceIconPaths.memoryPieces)} alt="" loading="lazy" />
              </div>
              <ArchiveCaption>
                <strong>기억의 제단</strong>
                {recommendedChoice === 'altar' && <ArchiveStamp className="archive-stamp-mini">권장</ArchiveStamp>}
              </ArchiveCaption>
              <ArchiveCaption sub>영구 성장 — 다음 싸움의 기준을 새긴다</ArchiveCaption>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="archive-tag">
                  <img src={assetPath(resourceIconPaths.memoryPieces)} alt="" loading="lazy" />
                  기억 {resources.memoryPieces}
                </span>
              </div>
            </ArchiveCard>
          </div>

          {/* 정비 없이 이동 */}
          <div>
            <ArchiveCard
              interactive
              dealt
              tilt={CARD_TILTS[2]}
              aria-label="정비 없이 이동 — 다음 경로로 바로 진행"
              onClick={skipRest}
              className="w-full"
            >
              <div className="archive-polaroid">
                <SkipForward className="h-12 w-12" style={{ color: 'var(--archive-ink-soft)' }} />
              </div>
              <ArchiveCaption>
                <strong>정비 없이 이동</strong>
              </ArchiveCaption>
              <ArchiveCaption sub>다음 경로로 바로 진행</ArchiveCaption>
            </ArchiveCard>
          </div>
        </div>
      </section>
    </ArchiveSurface>
  );
};
