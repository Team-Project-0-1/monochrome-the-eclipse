import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ShoppingBag, UserRoundSearch, XCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { shopData } from '../data/dataShop';
import { patternUpgrades } from '../data/dataUpgrades';
import { playerSkillUnlocks } from '../data/dataSkills';
import { PatternUpgradeDefinition, ShopItem, SkillUpgradeDefinition } from '../types';
import EffectSummary from '../components/EffectSummary';
import ActionButton from '../components/ui/ActionButton';
import Panel from '../components/ui/Panel';
import RunStatusModal from '../components/RunStatusModal';
import { assetCssUrl, assetPath } from '../utils/assetPath';
import { summarizeShopEntry } from '../utils/effectSummary';
import {
  formatShopCost,
  getBasicItemPresentation,
  getPatternUpgradePresentation,
  getSkillUpgradePresentation,
  ShopEntryPresentation,
} from '../utils/shopPresentation';
import { getPatternUpgradeIconPath, getSkillUpgradeIconPath } from '../utils/progressionAssets';
import { currencyIconPaths, resourceIconPaths } from '../utils/resourceAssets';
import { playGameSfx, playUiSound } from '../utils/sound';
import { MAX_RESERVE_COINS } from '../constants';

type ShopTab = 'items' | 'upgrades' | 'skills';

interface ShopEntry {
  id: string;
  name: string;
  description: string;
  tab: ShopTab;
  detail: string;
  imagePath?: string;
  presentation: ShopEntryPresentation;
  onPurchase: () => void;
}

const tabs: { id: ShopTab; label: string; hint: string }[] = [
  { id: 'items', label: '아이템', hint: '회복/행운' },
  { id: 'upgrades', label: '족보 강화', hint: '자동 성장' },
  { id: 'skills', label: '기술 습득', hint: '기술 교체' },
];

const statusClasses: Record<ShopEntryPresentation['status'], string> = {
  available: 'border-cyan-300/40 bg-cyan-950/28 text-cyan-100',
  blocked: 'border-red-300/35 bg-red-950/24 text-red-100',
  owned: 'border-slate-300/25 bg-slate-800/55 text-slate-300',
};
const statusIcons: Record<ShopEntryPresentation['status'], React.ElementType> = {
  available: CheckCircle2,
  blocked: XCircle,
  owned: CheckCircle2,
};
const itemImagePaths: Record<string, string> = {
  reserve_coin: 'assets/items/reserve-coin.png',
  heal_potion: 'assets/items/healing-vial.png',
  amplify_crystal: 'assets/items/amplify-crystal.png',
  sense_fragment_bundle: 'assets/items/sense-memory-cache.png',
};

export const ShopScreen = () => {
  const player = useGameStore(state => state.player);
  const resources = useGameStore(state => state.resources);
  const unlockedPatterns = useGameStore(state => state.unlockedPatterns);
  const reserveCoins = useGameStore(state => state.reserveCoins);
  const reserveCoinShopCost = useGameStore(state => state.reserveCoinShopCost);
  const handlePurchase = useGameStore(state => state.handlePurchase);
  const handleSkillUpgradePurchase = useGameStore(state => state.handleSkillUpgradePurchase);
  const proceedToNextTurn = useGameStore(state => state.proceedToNextTurn);
  const gameOptions = useGameStore(state => state.gameOptions);

  const [activeShopTab, setActiveShopTab] = useState<ShopTab>('items');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isRunStatusOpen, setIsRunStatusOpen] = useState(false);

  const entries = useMemo<ShopEntry[]>(() => {
    if (!player) return [];

    const basicEntries = shopData.basic.items.map((item: ShopItem) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      tab: 'items' as const,
      detail: item.id === 'reserve_coin'
        ? '전투 중 동전 교체 선택지를 확보합니다.'
        : '탐험 지속력을 보강합니다.',
      imagePath: itemImagePaths[item.id],
      presentation: getBasicItemPresentation(item, resources.echoRemnants, reserveCoins.length, reserveCoinShopCost),
      onPurchase: () => {
        playUiSound(gameOptions.soundEnabled, 'confirm');
        playGameSfx(gameOptions.soundEnabled, 'shopBuy');
        handlePurchase(item);
      },
    }));

    const classPatternUpgrades = patternUpgrades[player.class];
    const upgradeEntries = classPatternUpgrades
      ? (Object.values(classPatternUpgrades) as PatternUpgradeDefinition[])
          .filter((item) => !unlockedPatterns.includes(item.id))
          .map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            tab: 'upgrades' as const,
            detail: '동전 조합의 전투 가치를 높입니다.',
            imagePath: getPatternUpgradeIconPath(item, player.class),
            presentation: getPatternUpgradePresentation(item, resources.senseFragments),
            onPurchase: () => {
              playUiSound(gameOptions.soundEnabled, 'confirm');
              playGameSfx(gameOptions.soundEnabled, 'shopBuy');
              handlePurchase({ ...item, type: 'upgrade' });
            },
          }))
      : [];

    const classSkillUpgrades = playerSkillUnlocks[player.class];
    const skillEntries = classSkillUpgrades
      ? (Object.values(classSkillUpgrades) as SkillUpgradeDefinition[])
          .filter((item) => !player.acquiredSkills.includes(item.id))
          .map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            tab: 'skills' as const,
            detail: '선택한 패턴을 새로운 기술로 전환합니다.',
            imagePath: getSkillUpgradeIconPath(item, player.class),
            presentation: getSkillUpgradePresentation(item, resources.echoRemnants),
            onPurchase: () => {
              playUiSound(gameOptions.soundEnabled, 'confirm');
              playGameSfx(gameOptions.soundEnabled, 'shopBuy');
              handleSkillUpgradePurchase(item);
            },
          }))
      : [];

    return [...basicEntries, ...upgradeEntries, ...skillEntries];
  }, [
    gameOptions.soundEnabled,
    handlePurchase,
    handleSkillUpgradePurchase,
    player,
    reserveCoinShopCost,
    reserveCoins.length,
    resources.echoRemnants,
    resources.senseFragments,
    unlockedPatterns,
  ]);

  if (!player) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">로딩 중...</div>;
  }

  const activeEntries = entries.filter((entry) => entry.tab === activeShopTab);
  const selectedEntry = activeEntries.find((entry) => entry.id === selectedEntryId) ?? activeEntries[0] ?? null;
  const selectedSummary = selectedEntry ? summarizeShopEntry(selectedEntry) : null;

  const leaveShop = () => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    proceedToNextTurn();
  };

  return (
    <main className="shop-screen relative min-h-screen overflow-hidden bg-gray-950 p-3 text-white scanlines sm:p-5">
      <div
        className="shop-scene-bg"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(2,6,23,0.20),rgba(2,6,23,0.58) 52%,rgba(2,6,23,0.94)),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.90)),${assetCssUrl('assets/backgrounds/shop-merchant.png')}`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_70%,rgba(250,204,21,0.12),transparent_28%),radial-gradient(circle_at_76%_18%,rgba(34,211,238,0.08),transparent_26%)]" />

      <div className="shop-content relative z-10">
        <header className="shop-header flex flex-col gap-3 rounded-lg border border-white/10 bg-black/30 p-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-purple-300/30 bg-purple-950/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-purple-100">
              <ShoppingBag className="h-4 w-4" />
              Supply Terminal
            </div>
            <h1 className="mt-2 font-orbitron text-3xl font-black text-white sm:text-4xl">상점</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              onClick={() => {
                playUiSound(gameOptions.soundEnabled, 'select');
                setIsRunStatusOpen(true);
              }}
              variant="ghost"
              className="shop-status-button"
              data-testid="shop-status-button"
            >
              <UserRoundSearch className="h-4 w-4" />
              현재 상태
            </ActionButton>
            <ActionButton onClick={leaveShop} variant="ghost" className="shop-exit-button">
              떠나기
              <ArrowRight className="h-4 w-4" />
            </ActionButton>
          </div>
        </header>

        <div className="shop-layout grid min-h-0 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)_20rem]">
          <aside className="shop-resource-strip grid gap-3 rounded-lg border border-cyan-300/16 bg-cyan-950/12 p-3 backdrop-blur-md lg:content-start">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">Resources</span>
              <span className="text-xs text-slate-400">구매 기준</span>
            </div>
            {[
              { imagePath: resourceIconPaths.echoRemnants, label: '에코', value: resources.echoRemnants, accent: 'text-yellow-300' },
              { imagePath: resourceIconPaths.senseFragments, label: '감각', value: resources.senseFragments, accent: 'text-purple-300' },
              { imagePath: resourceIconPaths.memoryPieces, label: '기억', value: resources.memoryPieces, accent: 'text-blue-300' },
              { imagePath: resourceIconPaths.reserveCoin, label: '행운 동전', value: `${reserveCoins.length}/${MAX_RESERVE_COINS}`, accent: 'text-orange-300' },
            ].map(({ imagePath, label, value, accent }) => (
              <div key={label} className="flex items-center justify-between rounded-md border border-white/8 bg-white/5 px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <img className="shop-resource-icon-img" src={assetPath(imagePath)} alt="" loading="lazy" />
                  {label}
                </span>
                <strong className={`text-lg ${accent}`}>{value}</strong>
              </div>
            ))}
          </aside>

          <Panel
            className="shop-terminal min-w-0 overflow-hidden p-3 sm:p-4"
            data-count={activeEntries.length}
            data-tab={activeShopTab}
            tone="neutral"
          >
            <div className="shop-tabs mb-4 grid grid-cols-3 gap-2 border-b border-white/10 pb-3">
              {tabs.map((tab, index) => {
                const isActive = activeShopTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      playUiSound(gameOptions.soundEnabled, 'select');
                      setActiveShopTab(tab.id);
                      setSelectedEntryId(null);
                    }}
                    aria-pressed={isActive}
                    className={`rounded-md border px-3 py-2 text-left transition-colors ${
                      isActive
                        ? 'border-cyan-200 bg-cyan-100 text-gray-950'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm">{tab.label}</strong>
                      <span className="text-[10px] font-bold opacity-60">{index + 1}</span>
                    </div>
                    <div className="mt-1 text-[11px] font-semibold opacity-70">{tab.hint}</div>
                  </button>
                );
              })}
            </div>

            <div className="shop-list grid gap-2">
              {activeEntries.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-slate-300">
                  이 구역에서 구매할 수 있는 항목이 없습니다.
                </div>
              ) : activeEntries.map((entry) => {
                const StatusIcon = statusIcons[entry.presentation.status];
                const disabled = entry.presentation.status !== 'available';
                const isSelected = selectedEntry?.id === entry.id;
                const summary = summarizeShopEntry(entry);

                return (
                  <article
                    key={entry.id}
                    onMouseEnter={() => setSelectedEntryId(entry.id)}
                    onFocus={() => setSelectedEntryId(entry.id)}
                    className={`shop-item-row rounded-lg border p-3 transition-colors ${
                      isSelected ? 'border-cyan-200/45 bg-cyan-950/20' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className={`shop-entry-grid ${entry.imagePath ? 'has-art' : ''}`}>
                      {entry.imagePath ? (
                        <div className="shop-entry-art" aria-hidden="true">
                          <img src={assetPath(entry.imagePath)} alt="" loading="lazy" />
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-white">{entry.name}</h3>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClasses[entry.presentation.status]}`}>
                            <StatusIcon className="h-3 w-3" />
                            {entry.presentation.statusLabel}
                          </span>
                        </div>
                        <EffectSummary
                          summary={summary}
                          compact
                          hideHeadline
                          chipLimit={4}
                          showCue
                          cueLabel="판단"
                          className="shop-entry-summary"
                        />
                        <p className="mt-1 text-xs text-slate-500">{entry.presentation.helperText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={entry.onPurchase}
                        disabled={disabled}
                        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 font-black transition-colors ${
                          disabled
                            ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                            : 'bg-yellow-400 text-gray-950 hover:bg-yellow-300'
                        }`}
                      >
                        {entry.presentation.status !== 'owned' ? (
                          <img className="currency-button-icon-img" src={assetPath(currencyIconPaths[entry.presentation.currency])} alt="" loading="lazy" />
                        ) : null}
                        {entry.presentation.actionLabel}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>

          <aside className="shop-compare-panel rounded-lg border border-white/10 bg-black/34 p-4 backdrop-blur-md">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">Preview</div>
            {selectedEntry ? (
              <div className="space-y-4">
                {selectedEntry.imagePath ? (
                  <div className="shop-preview-art" aria-hidden="true">
                    <img src={assetPath(selectedEntry.imagePath)} alt="" />
                  </div>
                ) : null}
                <div>
                  <h2 className="text-2xl font-black text-white">{selectedEntry.name}</h2>
                </div>
                {selectedSummary ? (
                  <EffectSummary
                    summary={selectedSummary}
                    chipLimit={6}
                    showCue
                    cueLabel="구매 판단"
                    showDetail="details"
                    detailLabel="상세"
                    className="shop-preview-summary"
                  />
                ) : null}
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-slate-400">비용</span>
                    <strong className="inline-flex items-center gap-2">
                      <img className="currency-inline-icon-img" src={assetPath(currencyIconPaths[selectedEntry.presentation.currency])} alt="" loading="lazy" />
                      {formatShopCost(selectedEntry.presentation.cost, selectedEntry.presentation.currency)}
                    </strong>
                  </div>
                  <div className="flex justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-slate-400">상태</span>
                    <strong>{selectedEntry.presentation.statusLabel}</strong>
                  </div>
                </div>
                <p className="rounded-md border border-cyan-300/20 bg-cyan-950/18 p-3 text-xs leading-relaxed text-cyan-50">
                  {selectedEntry.presentation.helperText}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">항목을 선택하면 비용과 효과를 비교할 수 있습니다.</p>
            )}
          </aside>
        </div>
      </div>

      <RunStatusModal isOpen={isRunStatusOpen} onClose={() => setIsRunStatusOpen(false)} />
    </main>
  );
};
