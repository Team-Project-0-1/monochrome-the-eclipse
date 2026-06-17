# 아카이브 기억 제단 화면 — 색인 카드 캐비닛 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 기억 제단 화면(`MemoryAltarScreen`)을 아카이브 "색인 카드 캐비닛"으로 전환한다. 영구 업그레이드를 서랍 속 색인 카드로, 구매를 카드 위 도장으로, 자원을 책상 주머니로 옮긴다. 업그레이드 데이터·비용 로직은 무변경.

**Architecture:** 제단은 런 밖 화면(§1)이라 `ArchiveSurface`를 `scene` 없이(책상 텍스처) 쓴다. 루트 클래스를 `.archive-altar-screen`으로 개명하고 e2e selector(531줄)를 동시 수정한다. `handleMemoryUpgrade`·비용·`proceedToNextTurn`은 무변경. 기존 어휘(`.archive-note`·`.archive-tag`·`.archive-buy-btn`·`.archive-stamp`)를 재사용하고 색인 카드 레이아웃만 신규.

**Tech Stack:** React 19 + TypeScript, `.archive-*` CSS, CDP e2e 스모크.

---

## 알아둘 코드베이스 사실

- **e2e 계약**: `scripts/run-e2e-smoke.mjs:531`이 `{ step: 'memory-altar', state: 'MEMORY_ALTAR', selector: '.memory-altar-screen' }`. 루트 개명 시 이 줄을 `.archive-altar-screen`으로 수정.
- **레거시 CSS 무수정**: `.memory-altar-*`·`.memory-upgrade-card`(components-03/04/05). 루트 개명으로 자연 dead.
- **로직 무변경**: `MEMORY_UPGRADE_DATA` 순회, `data.cost(currentLevel)`·`canBuy`·`handleMemoryUpgrade`·`proceedToNextTurn`(돌아가기)·델타 표시(`현재 +N → 강화 후 +M`, P2-7) 전부 보존.
- **ResourceDisplay 대체**: 공유 컴포넌트 `ResourceDisplay`(에코/감각/기억 + 예비 동전)를 상점의 `.archive-purse` + `.archive-tag` 주머니 패턴으로 교체(자원 정보 보존). `resourceIconPaths` 재사용.
- **밝은 색인 카드 = 어두운 텍스트**: 색인 카드(`.archive-index-card`)는 밝은 종이(archive-note 톤)이므로 본문은 `--archive-ink`(어두움) 상속. `text-slate-*`(밝은) 금지 — 캐릭터 화면 교훈.
- **구매 버튼 disabled**: `canBuy=false`(기억 부족) 시 `.archive-buy-btn:disabled`(기존 회색). 보존.
- **MEMORY_UPGRADE_DATA**: maxHp/baseAtk/baseDef. 각 `{ name, description, cost(level), effect }`.

## File Structure

**수정**
- `src/styles/components/components-08-archive.css` — 색인 카드 `.archive-index-card*` 블록. 모바일 `@media` 직전.
- `src/screens/MemoryAltarScreen.tsx` — 마크업 전면 교체(로직 보존).
- `scripts/run-e2e-smoke.mjs:531` — selector 갱신.

---

## Task 1: components-08-archive.css — 색인 카드 블록

**Files:**
- Modify: `src/styles/components/components-08-archive.css` (모바일 `@media` 직전)

- [ ] **Step 1: 색인 카드 블록 추가** — `/* 모바일: 카드 폭 전환 */` 바로 앞에 삽입:

```css
/* --- 기억 제단(색인 카드 캐비닛): 업그레이드 = 서랍 속 색인 카드(밝은 종이 + 좌측 색인 탭). --- */
.archive-index-card {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.1rem 1rem 1.4rem;
  background: linear-gradient(176deg, var(--archive-note-bg-a), var(--archive-note-bg-b));
  border: 1px solid rgba(20, 33, 31, 0.35);
  border-left: 4px solid var(--archive-stamp-ink); /* 색인 탭 */
  border-radius: 3px;
  color: var(--archive-ink);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
  font-family: var(--font-family-archive);
}
.archive-index-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 4px;
  background: rgba(29, 116, 128, 0.16);
  border: 1px solid var(--archive-stamp-ink);
  color: var(--archive-stamp-ink);
}
.archive-index-card-name { font-size: 1.2rem; font-weight: 700; color: var(--archive-ink); }
.archive-index-card-desc { margin-top: 0.2rem; font-size: 0.85rem; line-height: 1.5; color: var(--archive-ink-soft); }
.archive-index-card-delta {
  margin-top: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--archive-ink);
}
.archive-index-card-delta .to { color: var(--archive-stamp-ink); }
.archive-index-card .archive-buy-btn { width: auto; min-width: 7rem; margin-top: 0; }

/* 모바일: 색인 카드 1열 적층 */
@media (max-width: 639px) {
  .archive-index-card { grid-template-columns: auto minmax(0, 1fr); }
  .archive-index-card .archive-buy-btn { grid-column: 1 / -1; width: 100%; }
}

```

> 위 `@media (max-width: 639px)`는 색인 카드 전용 모바일 규칙이라 기존 `@media (max-width: 767px)` 블록과 별개로 둔다(브레이크포인트가 다름 — 색인 카드는 sm 미만에서만 적층).

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/components-08-archive.css
git commit -m "feat(archive): 기억 제단 색인 카드 스타일 (Phase 2)"
```

---

## Task 2: MemoryAltarScreen.tsx 아카이브 전환

**Files:**
- Modify: `src/screens/MemoryAltarScreen.tsx`

- [ ] **Step 1: 전체 교체** — 전체 파일을 아래로:

```tsx
import React from 'react';
import { ArrowRight, HeartPulse, Shield, Swords } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { MemoryUpgradeType } from '../types';
import { MEMORY_UPGRADE_DATA } from '../constants';
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import ArchiveCaption from '../components/archive/ArchiveCaption';
import { assetPath } from '../utils/assetPath';
import { resourceIconPaths } from '../utils/resourceAssets';
import { MAX_RESERVE_COINS } from '../constants';
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
      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-6xl items-start gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
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
```

> 보존 확인: `handleMemoryUpgrade`·`data.cost`·`canBuy` 가드·델타 표시(P2-7)·`proceedToNextTurn`·사운드 훅 전부 무변경. 자원은 `ResourceDisplay`→`.archive-purse` 주머니로(에코/감각/기억/예비 동전 보존). `Landmark` 아이콘·`ResourceDisplay`·`ActionButton` 제거. 레거시 `memory-altar-*` 클래스 전부 제거.

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음. (미사용 import — `Landmark`/`ResourceDisplay`/`ActionButton`/`assetCssUrl` — 가 안 남았는지 확인.)

- [ ] **Step 3: Commit**

```bash
git add src/screens/MemoryAltarScreen.tsx
git commit -m "feat(archive): 기억 제단 다이어제틱 전환 — 색인 카드 캐비닛 (Phase 2)"
```

---

## Task 3: e2e selector 갱신 + 검증

**Files:**
- Modify: `scripts/run-e2e-smoke.mjs:531`

- [ ] **Step 1: selector 갱신** — 531줄:

찾기: `      { step: 'memory-altar', state: 'MEMORY_ALTAR', selector: '.memory-altar-screen' },`
교체: `      { step: 'memory-altar', state: 'MEMORY_ALTAR', selector: '.archive-altar-screen' },`

- [ ] **Step 2: 전체 체크 + e2e**

Run: `npm run check`
Expected: 통과.

Run: `npm run e2e`
Expected: `"ok": true`. `output/e2e/desktop-memory-altar.png`·`mobile-memory-altar.png` 생성 — 책상 위 색인 카드 3장(아이콘·이름·Lv 도장·델타·구매 도장) + 자원 주머니 + 돌아가기.

- [ ] **Step 3: Commit**

```bash
git add scripts/run-e2e-smoke.mjs
git commit -m "test(e2e): 제단 스모크 selector를 .archive-altar-screen으로 갱신"
```

---

## Task 4: 게이트 제출

- [ ] **Step 1: 스크린샷 확인** — `desktop-memory-altar.png`·`mobile-memory-altar.png`: 색인 카드 가독성(밝은 종이 위 어두운 텍스트), 구매 도장 대비, 모바일 카드 적층.
- [ ] **Step 2: 게이트 제출 (사람)** — 사용자 육안 승인.

---

## Self-Review

**1. 스펙 커버리지:** §3.8 장면(색인 카드 캐비닛=책상) ✅ / 만지는 물건(서랍 색인 카드·구매 도장) ✅ / 제거(테이블/리스트 문법) ✅ / 건드리지 않음(업그레이드 데이터·비용) ✅ 무변경 / §2.2 사이안(stamp-ink 색인 탭) ✅.

**2. 플레이스홀더 스캔:** 실제 코드 ✅.

**3. 타입/이름 일관성:** `.archive-index-card`(+icon/name/desc/delta)(Task 1) = Task 2 일치 ✅. `MEMORY_UPGRADE_DATA` 키(name/description/cost/effect)·`handleMemoryUpgrade` = 원본 일치 ✅. e2e selector `.archive-altar-screen` = 루트 일치 ✅. `.archive-purse`/`.archive-tag`/`.archive-buy-btn`/`.archive-stamp-mini` 재사용(기존 정의) ✅.

**알려진 잔여 위험:**
- 색인 카드는 밝은 종이라 본문 어두운 ink — `.archive-index-card-desc`가 `--archive-ink-soft`(중간 회색)라 밝은 종이 위 대비 충분한지 캡처 판정.
- 구매 도장(`.archive-buy-btn`, 청록)이 밝은 색인 카드 위 — 대비 OK(상점 선례). disabled 회색.
- 자원 주머니(`.archive-purse`)는 상점에서 모바일 sticky였는데, 제단은 그 모바일 규칙(`.archive-purse { position: sticky }`)을 공유한다 → 제단 좌측 aside에서도 sticky 동작할 수 있음. 제단은 짧아 무해하나 캡처 확인(어색하면 무시 — 기능 손상 아님).
