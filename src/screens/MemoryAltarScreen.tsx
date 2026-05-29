import React from 'react';
import { ArrowRight, HeartPulse, Landmark, Shield, Swords } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { MemoryUpgradeType } from '../types';
import { MEMORY_UPGRADE_DATA } from '../constants';
import ResourceDisplay from '../components/ResourceDisplay';
import ActionButton from '../components/ui/ActionButton';
import { assetCssUrl, assetPath } from '../utils/assetPath';
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
    <main className="memory-altar-screen relative min-h-screen overflow-hidden bg-gray-950 p-3 text-white scanlines sm:p-6">
      <div
        className="memory-altar-scene-bg"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.18), rgba(2,6,23,0.92)), ${assetCssUrl('assets/backgrounds/rest-tuning-camp.png')}`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_26%_22%,rgba(96,165,250,0.18),transparent_28%),radial-gradient(circle_at_76%_18%,rgba(168,85,247,0.14),transparent_25%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,1))]" />
      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-1.5rem)] w-full max-w-6xl gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="grid content-start gap-3">
          <div className="memory-altar-intro rounded-lg border border-blue-300/20 bg-blue-950/18 p-4 backdrop-blur-md">
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-blue-200/30 bg-blue-950/30 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-blue-100">
              <Landmark className="h-4 w-4" />
              기억의 제단
            </div>
            <h1 className="font-orbitron text-3xl font-black text-white">기억의 제단</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              휴식 중 모은 기억 조각을 영구 성장으로 전환합니다. 지금 강화한 능력은 다음 런에도 남습니다.
            </p>
          </div>
          <ResourceDisplay resources={resources} reserveCoins={reserveCoins} />
          <ActionButton onClick={leaveAltar} variant="ghost" className="w-full">
            돌아가기
            <ArrowRight className="h-4 w-4" />
          </ActionButton>
        </aside>

        <section className="grid content-center gap-3">
          {Object.entries(MEMORY_UPGRADE_DATA).map(([key, data]) => {
            const upgradeKey = key as MemoryUpgradeType;
            const currentLevel = player.memoryUpgrades[upgradeKey];
            const cost = data.cost(currentLevel);
            const canBuy = resources.memoryPieces >= cost;
            const Icon = upgradeIcons[upgradeKey];

            return (
              <article key={key} className="memory-upgrade-card rounded-lg border border-white/10 bg-black/34 p-4 backdrop-blur-md">
                <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border border-blue-200/20 bg-blue-300/10 text-blue-100">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-white">{data.name}</h2>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-slate-300">Lv. {currentLevel}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">{data.description}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <span>현재 <span className="text-slate-200">+{currentLevel * data.effect}</span></span>
                      <ArrowRight className="h-3 w-3 text-blue-300/70" aria-hidden />
                      <span>강화 후 <span className="text-blue-200">+{(currentLevel + 1) * data.effect}</span></span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playUiSound(gameOptions.soundEnabled, canBuy ? 'confirm' : 'deny');
                      if (canBuy) {
                        playGameSfx(gameOptions.soundEnabled, 'rewardItem');
                        handleMemoryUpgrade(upgradeKey);
                      }
                    }}
                    disabled={!canBuy}
                    className={`memory-upgrade-button inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 font-black transition-colors ${
                      canBuy
                        ? 'contrast-button-light bg-blue-200 text-gray-950 hover:bg-blue-100'
                        : 'contrast-button-disabled cursor-not-allowed bg-slate-700 text-slate-300'
                    }`}
                  >
                    <img className="currency-button-icon-img" src={assetPath(resourceIconPaths.memoryPieces)} alt="" loading="lazy" />
                    {cost} 기억
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
};
