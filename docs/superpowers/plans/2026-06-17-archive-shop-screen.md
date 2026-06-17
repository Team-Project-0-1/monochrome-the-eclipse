# 아카이브 상점 화면 — 수집상 진열대 장면 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상점 화면(`ShopScreen`)을 아카이브 아트 디렉션의 "수집상 진열대" 다이어제틱 장면으로 전환한다 — 상품을 진열된 인화지 + 종이 가격표로, 보유 자원을 책상 위 주머니 더미로, 구역 탭을 진열대 분류 도장으로. 보상·휴식의 검증된 `.archive-*` 어휘를 재사용하고 상점 고유 물건(진열 구역 탭·가격표·구매 버튼)만 추가한다.

**Architecture:** `ArchiveSurface`의 `scene` 모드(`shop-merchant.png` 딤)로 무대 이원 구조(런 중 화면)를 충족한다. 기존 `shop-*` 레거시 CSS(components-03·04)와 격리하기 위해 루트 클래스를 `.archive-shop-screen`으로 개명한다(휴식 `3f93a7d`·보상 선례 — e2e selector 동시 수정). 상점 로직(`entries` useMemo·`handlePurchase`·`shopPresentation` 유틸·탭 상태)은 무변경, 표현만 교체한다.

**Tech Stack:** React 19 + TypeScript, `.archive-*` CSS(components-08-archive.css), 기존 에셋 재활용(`itemImagePaths`·`getPatternUpgradeIconPath`·`resourceIconPaths`·`currencyIconPaths`), CDP e2e 스모크.

---

## 알아둘 코드베이스 사실 (실행 전 필독)

- **e2e 계약**: `scripts/run-e2e-smoke.mjs:530`이 `{ step: 'shop', state: 'SHOP', selector: '.shop-screen' }`로 상점을 도달·단언한다. 루트 클래스 개명 시 **이 줄을 같은 작업에서 `.archive-shop-screen`으로 수정**해야 한다(휴식이 531줄에서 `.archive-rest-screen`으로 한 선례). "selector 유지"를 무비판 답습하지 말 것.
- **레거시 CSS 무수정**: 스펙 §Phase 0(line 131) "기존 components-01~07 수정 금지". `.shop-*` 규칙(components-03:925~, components-04:1372~)은 **건드리지 않는다**. 루트 개명으로 마크업이 더는 `.shop-screen`을 안 달면 해당 규칙은 자연히 dead가 된다(삭제는 별도 정리 과제).
- **상점 로직 무변경**: `entries` useMemo(basic/upgrade/skill 3종 조립), `handlePurchase`·`handleSkillUpgradePurchase`, `getBasicItemPresentation`/`getPatternUpgradePresentation`/`getSkillUpgradePresentation`, `summarizeShopEntry`, `formatShopCost`, `proceedToNextTurn`(떠나기), 탭 상태(`activeShopTab`)·선택 상태(`selectedEntryId`)·`RunStatusModal`(isRunStatusOpen) 전부 그대로 옮긴다.
- **상태 3종**: `presentation.status`는 `available`(구매 가능) / `blocked`(자원 부족 등) / `owned`(보유). 기존 raw Tailwind(`statusClasses`·`statusIcons` 맵)를 제거하고 아카이브 도장으로 대체한다. `disabled = status !== 'available'`(구매 버튼 비활성) 가드 보존.
- **에셋 재활용 원칙**(`3118a9f`): 신규 이미지 생성 금지. 상품 피사체는 기존 경로만 — `entry.imagePath`(itemImagePaths / `getPatternUpgradeIconPath` / `getSkillUpgradeIconPath`가 이미 채움). 자원 아이콘 = `resourceIconPaths`, 통화 아이콘 = `currencyIconPaths`. 일부 entry는 `imagePath`가 없을 수 있다(가드 유지).
- **reducedMotion**: `body.is-reduced-motion`이 CSS 애니를 차단. 카드 낙하(`.archive-card.is-dealt`)·그레인은 기존 가드 재사용 — 신규 keyframe 없음. 단 탭 전환마다 전체 그리드가 `is-dealt`로 재낙하하면 산만하므로, 진열 카드는 `dealt`를 **주지 않는다**(정적 진열 — 휴식의 "딜" 연출과 달리 상점은 이미 놓여 있는 물건).
- **ArchiveCard 다형성**: `interactive` 시 `<button>`, 미지정 시 `<section>`. 상점 카드는 클릭=구매(자원 소비, 비가역)라 카드 전체를 버튼으로 만들지 않는다 → `interactive` 미지정(`<section>`) + 내부 별도 구매 버튼. 호버/포커스 미리보기는 section `onMouseEnter` + 구매 버튼 `onFocus`로 갱신(현 동작 유지).
- **ArchiveSurface 그레인 위 스택**: 직계 자식이 그레인(z-index:1) 위에 보이려면 `position`+`z-index>=2`가 필요. 헤더 자원 주머니·탭에 적용.
- **EffectSummary 보존**: 상품 효과 요약은 `EffectSummary` 컴포넌트가 담당(칩·큐·상세). 마크업 래퍼만 아카이브로 바꾸고 컴포넌트 호출 인자(`summary`/`compact`/`chipLimit`/`showCue` 등)는 그대로 둔다.

## 레이아웃 추론 (2안 중 택1)

- **A "진열대 + 손에 든 물건" (선택)**: 상단 = 수집상 도장 + 도구 버튼(현재상태·떠나기) / 그 아래 = 자원 주머니 더미(가로 `archive-tag` 배열) + 진열 구역 탭(도장 토글 3종) / 본문 = 상품 인화지 카드 그리드(피사체+이름 캡션+가격표+구매 버튼) / 우측(lg+) = 선택 상품을 펼친 "손에 든 물건" 메모지(EffectSummary 상세). 보상·휴식의 카드 그리드 + 호버 메모지 패턴을 그대로 잇는다.
- **B "회전 진열장"**: 탭 대신 3D 캐러셀로 구역 전환. 연출/접근성 비용 과다(회전 애니·키보드 포커스 관리·reducedMotion 대체)이고 자유 영역 초과 → 기각.

**근거(한 줄):** A는 Phase 0 공용 어휘(`archive-card`/`photo-frame`/`caption`/`stamp`/`tag`/`tool-btn`/`note`) 재사용을 극대화하고 신규 CSS를 진열 탭·가격표·구매 버튼·주머니 배열 4종으로 좁히면서 §3.2의 진열대 의도를 만족한다.

---

## File Structure

**수정**
- `src/styles/components/components-08-archive.css` — 상점 전용 블록 추가(진열 구역 탭 `.archive-shelf-tabs`/`.archive-shelf-tab`, 종이 가격표 `.archive-price-tag`, 구매 버튼 `.archive-buy-btn`, 자원 주머니 배열 `.archive-purse`, 상태 도장 색 변형 `.archive-stamp.is-blocked`/`.is-owned`). 모바일 `@media` 블록 직전에 삽입.
- `src/screens/ShopScreen.tsx` — 전면 교체(레거시 `shop-*` 마크업 → 아카이브 어휘). 로직·상태·import 데이터는 보존.
- `scripts/run-e2e-smoke.mjs:530` — selector `.shop-screen` → `.archive-shop-screen`.

---

## Task 1: components-08-archive.css — 상점 전용 스타일 블록

**Files:**
- Modify: `src/styles/components/components-08-archive.css` (모바일 `@media` 블록 직전에 삽입)

- [ ] **Step 1: 상점 블록 추가** — 파일에서 `@media` 모바일 블록(카드 폭 전환 주석)을 찾아 그 **바로 앞**에 아래를 삽입. (앞 블록인 휴식 `button.archive-card:disabled` 규칙 뒤, 모바일 `@media` 앞.)

```css
/* --- 상점(진열대): 자원 주머니 더미. 헤더 아래 가로 배열, 그레인 위. --- */
.archive-purse {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.archive-purse .archive-tag {
  font-size: 0.82rem;
  padding: 0.3rem 0.6rem;
}
.archive-purse .archive-tag strong { font-weight: 700; margin-left: 0.15rem; }

/* --- 진열 구역 탭 = 분류 도장 토글. aria-pressed로 활성 표현. --- */
.archive-shelf-tabs {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.archive-shelf-tab {
  font-family: var(--font-family-archive);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.66rem;
  padding: 0.32rem 0.7rem;
  border: 2px solid var(--archive-stamp-ink);
  border-radius: 3px;
  color: var(--archive-stamp-ink);
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}
.archive-shelf-tab[aria-pressed='true'] {
  background: var(--archive-stamp-ink);
  color: var(--archive-paper);
}
.archive-shelf-tab:hover { background: rgba(29, 116, 128, 0.18); }
.archive-shelf-tab:focus-visible { outline: 2px solid var(--archive-accent); outline-offset: 2px; }

/* --- 종이 가격표 — 상품 인화지에 매달린 꼬리표 --- */
.archive-price-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--font-family-archive);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--archive-ink);
  padding: 0.2rem 0.5rem;
  background: var(--archive-tag-bg);
  border: 1px dashed var(--archive-ink-soft);
  border-radius: 2px;
}
.archive-price-tag > img { width: 1.1rem; height: 1.1rem; }

/* --- 구매 버튼 — 인화지 위 잉크 스탬프형 액션 --- */
.archive-buy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.5rem;
  width: 100%;
  margin-top: 0.5rem;
  padding: 0 0.75rem;
  font-family: var(--font-family-archive);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--archive-paper);
  background: var(--archive-stamp-ink);
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: filter 0.15s;
}
.archive-buy-btn:hover { filter: brightness(1.15); }
.archive-buy-btn:focus-visible { outline: 2px solid var(--archive-accent); outline-offset: 2px; }
.archive-buy-btn > img { width: 1.1rem; height: 1.1rem; filter: grayscale(0.3); }
.archive-buy-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  background: var(--archive-ink-soft);
}

/* --- 상태 도장 색 변형 (기본=구매가능 청록, 부족=흐림, 보유=먹) --- */
.archive-stamp.is-blocked { color: var(--archive-ink-soft); border-color: var(--archive-ink-soft); }
.archive-stamp.is-owned { color: var(--archive-ink); border-color: var(--archive-ink); opacity: 0.7; }

```

- [ ] **Step 2: 모바일 sticky 자원 주머니** — 스펙 §3.2 "건드리지 않음: 모바일 sticky 자원 표시의 *기능*"을 보존한다. 레거시 `.shop-resource-strip`는 모바일 `@media`(components-03:1358)에서 `position: sticky; top: 6.5rem`이라 상품 리스트를 스크롤해도 잔액이 화면에 남았다. 새 `.archive-purse`도 모바일에서 sticky로 복원해 같은 기능을 잇는다. 기존 모바일 블록(`@media (max-width: 767px) {` — components-08:327) **안**에 아래를 추가(블록 닫는 `}` 직전):

```css
  /* 상점 자원 주머니: 상품 스크롤 중에도 잔액이 보이도록 상단 고정(레거시 sticky 기능 계승) */
  .archive-purse {
    position: sticky;
    top: 0.5rem;
    z-index: 4;
    padding: 0.4rem;
    border-radius: 4px;
    background: rgba(6, 12, 14, 0.78);
    backdrop-filter: blur(3px);
  }
```

> sticky가 동작하려면 스크롤 조상에 `overflow: hidden`이 없어야 한다 → Task 2에서 `ArchiveSurface`의 `overflow-hidden`을 제거한다(상점은 `dealt` 카드 낙하를 안 써 클리핑 불필요). `top: 0.5rem`은 헤더가 sticky가 아니므로 스크롤 시 주머니가 뷰포트 상단 근처에 붙는다.

- [ ] **Step 3: typecheck (CSS는 빌드 검증)**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add src/styles/components/components-08-archive.css
git commit -m "feat(archive): 상점 진열대 탭·가격표·구매 버튼·주머니 스타일 (Phase 2)"
```

---

## Task 2: ShopScreen.tsx 아카이브 전환

**Files:**
- Modify: `src/screens/ShopScreen.tsx` (마크업 전면 교체, 로직·import 데이터 보존)

- [ ] **Step 1: import·상수 정리** — 파일 상단 import 블록과 상수 맵을 아래로 교체. (lucide 아이콘 중 도구 버튼에 쓸 `ArrowRight`·`UserRoundSearch`만 남기고 카드 상태 아이콘 `CheckCircle2`/`XCircle`/`ShoppingBag` 제거. `ActionButton`·`Panel` 제거, archive 컴포넌트 추가. `statusClasses`/`statusIcons` 맵 제거 — 도장 라벨로 대체.)

찾기 (1~24행 import 블록):
```tsx
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
```

교체:
```tsx
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
```

찾기 (45~60행 — 제거 대상 맵):
```tsx
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
```

교체 (맵 2종 제거, itemImagePaths만 유지):
```tsx
const itemImagePaths: Record<string, string> = {
  reserve_coin: 'assets/items/reserve-coin.png',
  heal_potion: 'assets/items/healing-vial.png',
  amplify_crystal: 'assets/items/amplify-crystal.png',
  sense_fragment_bundle: 'assets/items/sense-memory-cache.png',
};
```

> `entries` useMemo(77~148행), `if (!player)` 가드(150~152행), `activeEntries`/`selectedEntry`/`selectedSummary`/`leaveShop`(154~161행)은 **무변경**. `tabs` 배열(39~43행)도 그대로 유지.

- [ ] **Step 2: return 블록 전면 교체** — `return (` 부터 컴포넌트 끝(`);\n};`)까지(163~376행)를 아래로 교체:

```tsx
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
```

> 보존 확인: `entry.onPurchase`(구매)·`leaveShop`(떠나기)·`setIsRunStatusOpen`(현재 상태)·`disabled` 가드·탭 전환·`selectedEntryId` 미리보기·`EffectSummary` 인자·`RunStatusModal` 전부 무변경. 정보 손실 없음 — 자원은 주머니 태그로, 상태는 도장으로, 비용은 가격표로, 상세는 손에 든 메모지로 이동. 레거시 `shop-*` 클래스 전부 제거(누구도 참조 안 함 — Task 3에서 e2e selector만 갱신).

- [ ] **Step 3: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음. (미사용이 된 import — `CheckCircle2`/`XCircle`/`ShoppingBag`/`ActionButton`/`Panel` — 가 새 코드에 남지 않았는지 육안 확인. tsconfig에 `noUnusedLocals`가 없어 typecheck가 못 잡는다.)

- [ ] **Step 4: Commit**

```bash
git add src/screens/ShopScreen.tsx
git commit -m "feat(archive): 상점 화면 다이어제틱 전환 — 수집상 진열대 인화지 (Phase 2)"
```

---

## Task 3: e2e selector 갱신 + 전체 검증

**Files:**
- Modify: `scripts/run-e2e-smoke.mjs:530`

- [ ] **Step 1: selector 갱신** — 530줄:

찾기: `      { step: 'shop', state: 'SHOP', selector: '.shop-screen' },`
교체: `      { step: 'shop', state: 'SHOP', selector: '.archive-shop-screen' },`

- [ ] **Step 2: 전체 체크**

Run: `npm run check`
Expected: 통과(테스트·typecheck·build·dist 예산·e2e 훅 누출 검사).

- [ ] **Step 3: Commit**

```bash
git add scripts/run-e2e-smoke.mjs
git commit -m "test(e2e): 상점 스모크 selector를 .archive-shop-screen으로 갱신"
```

---

## Task 4: 검증 + 게이트 제출

- [ ] **Step 1: e2e + 스크린샷**

Run: `npm run e2e`
Expected: `"ok": true`. `output/e2e/desktop-shop.png`·`output/e2e/mobile-shop.png` 생성 — 딤 처리된 상점 장면 + 수집상 도장 헤더 + 자원 주머니 + 진열 구역 탭 + 상품 인화지 카드 그리드 + (데스크톱) 손에 든 물건 메모지.

- [ ] **Step 2: reducedMotion + 탭 전환 수동 확인**

`npm run dev` → 옵션 reducedMotion ON → SHOP 진입: 그레인 시프트 생략 확인. 탭(아이템→족보강화→기술습득) 전환 시 카드가 재낙하 없이 즉시 교체되는지(진열 카드 `dealt` 미부여) 확인. 구매/떠나기/현재 상태 버튼 동작 확인. **모바일 폭(≤767px)에서 상품이 많은 구역(예: 족보강화)을 스크롤할 때 자원 주머니(`.archive-purse`)가 상단에 고정되어 잔액이 계속 보이는지 확인** — 스펙 §3.2가 보호한 sticky 기능 회귀 방지.

- [ ] **Step 3: 게이트 제출 (사람)**

`output/e2e/desktop-shop.png`·`mobile-shop.png`를 사용자에게 제시하고 육안 승인 요청. 거부 시: 토큰/레이아웃만 조정 후 재캡처(로직 무변경 유지).

---

## Self-Review (작성자 체크)

**1. 스펙 커버리지:** §3.2 장면(진열대=scene 딤) ✅ Task 2 / 만지는 물건(진열 상품·가격표·자원 주머니·구매 비교) ✅ Task 1·2 / 제거(대시보드 칩·잔액 표시줄 문법, 탭 `hint` 보조문구 — §3.2 칩 제거 범위 내 의도된 제거) ✅ Task 2 / 건드리지 않음(구매 로직·가격 데이터) ✅ 무변경 / **모바일 sticky 자원 표시 *기능*** — 표현은 `.archive-purse`로 교체하되 모바일 sticky를 Task 1 Step 2에서 명시적으로 복원(레거시 `top:6.5rem` sticky 계승) ✅ / §2.2 한랭 사이안(`--archive-accent`·`--archive-stamp-ink`) ✅ / §2.5 정보 손실 금지(자원·상태·비용·상세 전부 다이어제틱 보존) ✅.

**2. 플레이스홀더 스캔:** 전 단계 실제 코드. "적절히" 류 없음 ✅.

**3. 타입/이름 일관성:** `.archive-shelf-tabs`/`.archive-shelf-tab`/`.archive-price-tag`/`.archive-buy-btn`/`.archive-purse`/`.archive-stamp.is-blocked`/`.is-owned`(Task 1) = Task 2 사용처 일치 ✅. `STATUS_STAMP_CLASS`(Task 2 Step 1 정의) = Task 2 Step 2 사용 일치 ✅. `ArchiveCard`의 비-interactive `<section>` 경로(onMouseEnter는 `React.HTMLAttributes`로 전달) ✅. e2e selector `.archive-shop-screen`(Task 3) = Task 2 루트 클래스 일치 ✅.

**알려진 잔여 위험:**
- `archive-shop-card`/`archive-shop-summary`/`archive-shop-preview-summary` 클래스는 Task 1 CSS에 전용 규칙이 없다 — 의도(추가 스타일 불필요, 카드 기본 + EffectSummary 자체 스타일로 충분). 게이트 캡처에서 간격이 어색하면 Task 1에 보강.
- `.archive-photo-frame`이 없는 entry(imagePath 부재)는 캡션부터 시작 — 카드 높이가 그리드에서 불균일할 수 있다. `sm:grid-cols-2`라 행 정렬은 자동, 캡처에서 확인.
- 우측 메모지는 `lg:block`(데스크톱 전용) — 모바일은 카드 내 가격표+구매로 자족. 현 동작(모바일 비교 패널 숨김)과 동일.
- 진열 카드를 `<section>`(비-interactive)으로 둬 카드 자체는 키보드 포커스 불가 — 미리보기 갱신은 구매 버튼 `onFocus`가 담당(현 코드도 동일 한계). 정보 접근엔 영향 없음(카드 내용은 정적 텍스트).
