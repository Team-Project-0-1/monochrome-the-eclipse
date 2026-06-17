import React from 'react';
import { ArrowRight, HeartPulse, Shield, Swords } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { MemoryUpgradeType } from '../types';
import { MEMORY_UPGRADE_DATA, MAX_RESERVE_COINS } from '../constants';
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import ArchiveCaption from '../components/archive/ArchiveCaption';
import { assetPath } from '../utils/assetPath';
import { resourceIconPaths } from '../utils/resourceAssets';
import { playGameSfx, playUiSound } from '../utils/sound';

const upgradeIcons: Record<MemoryUpgradeType, React.ElementType> = {
  maxHp: HeartPulse,
  baseAtk: Swords,
  baseDef: Shield,
};

export const MemoryAltarScreen = () => {
  const player = useGameStore(state => state.player);
  const resources = useGameStore(state => state.resources);
  const reserveCoins = useGameStore(state => state.reserveCoins);
  const handleMemoryUpgrade = useGameStore(state => state.handleMemoryUpgrade);
  const proceedToNextTurn = useGameStore(state => state.proceedToNextTurn);
  const gameOptions = useGameStore(state => state.gameOptions);

  if (!player) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">기억의 제단을 불러오는 중...</div>;
  }

  const leaveAltar = () => {
    playUiSound(gameOptions.soundEnabled, 'select');
    proceedToNextTurn();
  };

  return (
    // 색인 카드 캐비닛 — 책상 위 서랍에서 영구 성장을 꺼내 도장을 찍는다(런 밖 화면, 책상 텍스처).
    <ArchiveSurface className="archive-altar-screen overflow-y-auto p-4 sm:p-6">
      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-2rem)] sm:min-h-[calc(100dvh-3rem)] w-full max-w-6xl items-start gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <div className="archive-note">
            <ArchiveStamp className="mb-3 inline-block">기억의 제단</ArchiveStamp>
            <ArchiveCaption sub>휴식 중 모은 기억 조각을 영구 성장으로 전환합니다. 지금 강화한 능력은 다음 런에도 남습니다.</ArchiveCaption>
          </div>

          <div className="archive-purse" role="group" aria-label="보유 자원">
            {[
              { imagePath: resourceIconPaths.memoryPieces, label: '기억', value: resources.memoryPieces },
              { imagePath: resourceIconPaths.echoRemnants, label: '에코', value: resources.echoRemnants },
              { imagePath: resourceIconPaths.senseFragments, label: '감각', value: resources.senseFragments },
              { imagePath: resourceIconPaths.reserveCoin, label: '예비 동전', value: `${reserveCoins.length}/${MAX_RESERVE_COINS}` },
            ].map(({ imagePath, label, value }) => (
              <span key={label} className="archive-tag">
                <img src={assetPath(imagePath)} alt="" loading="lazy" />
                {label} <strong>{value}</strong>
              </span>
            ))}
          </div>

          <button type="button" className="archive-tool-btn" onClick={leaveAltar}>
            돌아가기
            <ArrowRight className="h-4 w-4" />
          </button>
        </aside>

        <section className="grid content-start gap-3">
          {Object.entries(MEMORY_UPGRADE_DATA).map(([key, data]) => {
            const upgradeKey = key as MemoryUpgradeType;
            const currentLevel = player.memoryUpgrades[upgradeKey];
            const cost = data.cost(currentLevel);
            const canBuy = resources.memoryPieces >= cost;
            const Icon = upgradeIcons[upgradeKey];

            return (
              <article key={key} className="archive-index-card">
                <span className="archive-index-card-icon">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="archive-index-card-name">{data.name}</span>
                    <ArchiveStamp className="archive-stamp-mini">Lv. {currentLevel}</ArchiveStamp>
                  </div>
                  <p className="archive-index-card-desc">{data.description}</p>
                  <p className="archive-index-card-delta">
                    <span>현재 +{currentLevel * data.effect}</span>
                    <ArrowRight className="h-3 w-3" aria-hidden />
                    <span className="to">강화 후 +{(currentLevel + 1) * data.effect}</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="archive-buy-btn"
                  disabled={!canBuy}
                  onClick={() => {
                    playUiSound(gameOptions.soundEnabled, canBuy ? 'confirm' : 'deny');
                    if (canBuy) {
                      playGameSfx(gameOptions.soundEnabled, 'rewardItem');
                      handleMemoryUpgrade(upgradeKey);
                    }
                  }}
                >
                  <img src={assetPath(resourceIconPaths.memoryPieces)} alt="" loading="lazy" />
                  {cost} 기억
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </ArchiveSurface>
  );
};
