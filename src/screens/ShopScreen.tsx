import React, { useMemo, useState } from 'react';
import { ArrowRight, UserRoundSearch } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { shopData } from '../data/dataShop';
import { patternUpgrades } from '../data/dataUpgrades';
import { playerSkillUnlocks } from '../data/dataSkills';
import { PatternUpgradeDefinition, ShopItem, SkillUpgradeDefinition } from '../types';
import EffectSummary from '../components/EffectSummary';
import RunStatusModal from '../components/RunStatusModal';
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveCard from '../components/archive/ArchiveCard';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import ArchiveCaption from '../components/archive/ArchiveCaption';
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

// 상태 도장 라벨 보조 — presentation.statusLabel을 그대로 쓰되 색 변형 클래스만 매핑.
const STATUS_STAMP_CLASS: Record<ShopEntryPresentation['status'], string> = {
  available: '',
  blocked: 'is-blocked',
  owned: 'is-owned',
};

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
  { id: 'items', label: '아이템', hint: '회복/예비 동전' },
  { id: 'upgrades', label: '족보 강화', hint: '자동 성장' },
  { id: 'skills', label: '기술 습득', hint: '기술 교체' },
];

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
    // 수집상의 진열대 — 상점 장면 위에서 물건을 고른다(런 중 화면, 슬더스 문법).
    <ArchiveSurface scene={assetCssUrl('assets/backgrounds/shop-merchant.png')} className="archive-shop-screen p-4 sm:p-6">
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col gap-5">
        {/* 수집상 도장 + 도구 버튼 — 키커/타이틀의 다이어제틱 대체물 */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <ArchiveStamp>수집상 — 진열대</ArchiveStamp>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="archive-tool-btn"
              data-testid="shop-status-button"
              onClick={() => {
                playUiSound(gameOptions.soundEnabled, 'select');
                setIsRunStatusOpen(true);
              }}
            >
              <UserRoundSearch className="h-4 w-4" />
              현재 상태
            </button>
            <button type="button" className="archive-tool-btn" onClick={leaveShop}>
              떠나기
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* 책상 위 자원 주머니 더미 — "잔액 표시줄" 대신 물건 꼬리표 */}
        <div className="archive-purse" role="group" aria-label="보유 자원">
          {[
            { imagePath: resourceIconPaths.echoRemnants, label: '에코', value: resources.echoRemnants },
            { imagePath: resourceIconPaths.senseFragments, label: '감각', value: resources.senseFragments },
            { imagePath: resourceIconPaths.memoryPieces, label: '기억', value: resources.memoryPieces },
            { imagePath: resourceIconPaths.reserveCoin, label: '예비 동전', value: `${reserveCoins.length}/${MAX_RESERVE_COINS}` },
          ].map(({ imagePath, label, value }) => (
            <span key={label} className="archive-tag">
              <img src={assetPath(imagePath)} alt="" loading="lazy" />
              {label} <strong>{value}</strong>
            </span>
          ))}
        </div>

        {/* 진열 구역 탭 = 분류 도장 토글 */}
        <div className="archive-shelf-tabs" role="group" aria-label="진열 구역">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeShopTab === tab.id}
              className="archive-shelf-tab"
              onClick={() => {
                playUiSound(gameOptions.soundEnabled, 'select');
                setActiveShopTab(tab.id);
                setSelectedEntryId(null);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          {/* 진열된 상품 = 인화지 카드 그리드 */}
          <div className="grid gap-4 sm:grid-cols-2">
            {activeEntries.length === 0 ? (
              <ArchiveCaption className="col-span-full py-8 text-center">
                이 진열대에는 지금 내놓은 물건이 없습니다.
              </ArchiveCaption>
            ) : activeEntries.map((entry) => {
              const disabled = entry.presentation.status !== 'available';
              const summary = summarizeShopEntry(entry);
              return (
                <ArchiveCard
                  key={entry.id}
                  className="archive-shop-card"
                  onMouseEnter={() => setSelectedEntryId(entry.id)}
                >
                  {entry.imagePath ? (
                    <div className="archive-photo-frame">
                      <img src={assetPath(entry.imagePath)} alt="" loading="lazy" />
                    </div>
                  ) : null}
                  <ArchiveCaption>
                    <strong>{entry.name}</strong>
                    <ArchiveStamp className={`archive-stamp-mini ${STATUS_STAMP_CLASS[entry.presentation.status]}`}>
                      {entry.presentation.statusLabel}
                    </ArchiveStamp>
                  </ArchiveCaption>
                  <EffectSummary
                    summary={summary}
                    compact
                    hideHeadline
                    chipLimit={4}
                    showCue
                    cueLabel="판단"
                    className="archive-shop-summary"
                  />
                  <span className="archive-price-tag">
                    <img src={assetPath(currencyIconPaths[entry.presentation.currency])} alt="" loading="lazy" />
                    {formatShopCost(entry.presentation.cost, entry.presentation.currency)}
                  </span>
                  <button
                    type="button"
                    className="archive-buy-btn"
                    disabled={disabled}
                    onClick={entry.onPurchase}
                    onFocus={() => setSelectedEntryId(entry.id)}
                    aria-label={`${entry.name} — ${entry.presentation.actionLabel}`}
                  >
                    {entry.presentation.status !== 'owned' ? (
                      <img src={assetPath(currencyIconPaths[entry.presentation.currency])} alt="" loading="lazy" />
                    ) : null}
                    {entry.presentation.actionLabel}
                  </button>
                </ArchiveCard>
              );
            })}
          </div>

          {/* 손에 든 물건 — 선택 상품 상세 메모지 (lg+ 노출) */}
          <aside className="archive-note hidden self-start lg:block">
            <div className="archive-tray-label mb-2">살펴보는 물건</div>
            {selectedEntry ? (
              <div className="space-y-3">
                <strong className="block text-lg">{selectedEntry.name}</strong>
                {selectedSummary ? (
                  <EffectSummary
                    summary={selectedSummary}
                    chipLimit={6}
                    showCue
                    cueLabel="구매 판단"
                    showDetail="details"
                    detailLabel="상세"
                    className="archive-shop-preview-summary"
                  />
                ) : null}
                <div className="archive-price-tag">
                  <img src={assetPath(currencyIconPaths[selectedEntry.presentation.currency])} alt="" loading="lazy" />
                  {formatShopCost(selectedEntry.presentation.cost, selectedEntry.presentation.currency)}
                </div>
                <ArchiveCaption sub>{selectedEntry.presentation.helperText}</ArchiveCaption>
              </div>
            ) : (
              <ArchiveCaption sub>물건을 가리키면 값과 효과를 살펴봅니다.</ArchiveCaption>
            )}
          </aside>
        </div>
      </section>

      <RunStatusModal isOpen={isRunStatusOpen} onClose={() => setIsRunStatusOpen(false)} />
    </ArchiveSurface>
  );
};
