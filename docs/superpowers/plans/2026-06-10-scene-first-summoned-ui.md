# 씬 우선 + 호출형 UI (A+B: 탐험 상단 바 + 지도 온디맨드) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 탐험화면을 "씬이 지배적, UI는 호출형" 모델로 바꾼다 — 깔끔한 미니 상단 바(필수 정보 + [지도]/[가방]/[상태]/[메뉴] 버튼)를 두고, 콩알만 한 상시 미니맵을 **상단 버튼으로 여는 전체 지도 오버레이**로 교체한다.

**Architecture:** 기존 패턴을 재사용한다 — 오버레이는 `RunStatusModal`의 `AnimatePresence` 셸, 덱/가방은 이미 있는 `InventoryPanel`(`isInventoryOpen`), 상태는 이미 있는 `RunStatusModal`, 지도는 기존 `MiniMap`을 오버레이 안에서 확대 렌더. UI 토글은 `uiSlice`의 `isMapOpen`/`isRunStatusOpen` 플래그(기존 `isInventoryOpen`과 동형). 사이드 레일·하단 미니맵 footer는 제거해 씬이 지배하게 한다.

**Tech Stack:** React 19 + TypeScript, Zustand(슬라이스+Immer), framer-motion(`AnimatePresence`), Tailwind + 수기 `components-0X.css`(cr- 레이어), lucide-react. 테스트 = Vitest(슬라이스 단위) + e2e 렌더-스모크(CDP) + 캡처 하니스(시각).

---

## 범위 (Scope)

이 계획은 합의된 분해의 **A + B**만 다룬다 — 독립적으로 동작·배포 가능한 첫 슬라이스:
- **A. 공통 상단 바 + 호출형 오버레이 골격** (탐험 스코프)
- **B. 지도 온디맨드** (콩알 미니맵 → 상단 버튼으로 여는 전체 지도)

**범위 밖(후속 계획):** C = 상점(NPC 클릭)·휴식(선택지 호출형) 씬-우선화, 상단 바를 App 레벨로 승격해 전 화면 지속(현재는 탐험 전용), 전투 화면 통합. 각자 별도 plan.

## 핵심 설계 결정 (검토자·실행자 모두 읽을 것)

1. **상단 바 = 탐험의 영속 chrome.** 컴팩트 HP + 자원 카운트 + 버튼 [지도][가방/덱][상태][메뉴]. **사이드 레일(`exploration-rail`: CharacterStatus·ResourceDisplay·장비 Panel)과 하단 미니맵 footer를 제거**하고, 본문(히어로+카드)을 풀폭으로 — 씬 지배(기획 의도 "scene dominant").
2. **"필수는 상시, 상세는 호출."** HP·자원은 상단 바에 항상 보인다. *전체* 상태(족보/기술/패시브)는 [상태]→기존 `RunStatusModal`, *전체* 경로는 [지도]→신규 `RouteMapOverlay`, 덱/장비는 [가방]→기존 `InventoryPanel`. 다 숨기지 않는다(방향 감각 유지).
3. **오버레이 애니메이션은 JS에서 reducedMotion 게이팅.** framer-motion은 JS(Web Animations)로 애니메이트 → `body.is-reduced-motion *{transition-duration:.01ms}` CSS 가드가 **안 먹는다**. 그래서 컴포넌트가 `gameOptions.reducedMotion`을 읽어 transform(y/scale) 생략 + duration 0.
4. **z 레이어**(tokens.css 기존): 상단 바 = `--z-hud`(50), 오버레이 = `--z-modal-backdrop`(100)/`--z-modal`(110). 콘텐츠(10) 위, 모달 정합.
5. **재사용 우선**: 새 코드는 `RouteMapOverlay`(MiniMap 래핑)와 `RunTopBar`뿐. 가방/상태는 기존 컴포넌트에 버튼만 연결.

## File Structure

**생성**
- `src/components/RouteMapOverlay.tsx` — 온디맨드 전체 경로 지도(오버레이 셸 + 확대 MiniMap). 책임: 지도 오버레이의 표시/접근성/모션.
- `src/components/RunTopBar.tsx` — 탐험 상단 바(컴팩트 필수정보 + 호출 버튼). 책임: 영속 chrome + 오버레이 토글 진입점.
- `src/store/slices/uiSlice.test.ts` — uiSlice 토글 단위 테스트(없으면 생성, 있으면 describe 추가).

**수정**
- `src/store/slices/uiSlice.ts` — `isMapOpen`/`setMapOpen`, `isRunStatusOpen`/`setRunStatusOpen` 추가.
- `src/screens/ExplorationScreen.tsx` — 상단 바 + 오버레이 마운트, 사이드 레일·미니맵 footer 제거, 본문 풀폭.
- `src/styles/components/components-05.css` — `.run-top-bar`, `.route-map-overlay*`, `.exploration-layout` 1열화.
- `scripts/run-e2e-smoke.mjs` — 탐험에서 지도 버튼 클릭 → 오버레이 검증 추가.

---

## Task 1: uiSlice에 호출형 UI 플래그 추가

**Files:**
- Modify: `src/store/slices/uiSlice.ts`
- Test: `src/store/slices/uiSlice.test.ts` (없으면 생성)

- [ ] **Step 1: 인터페이스에 플래그 추가** — `UiSlice` 인터페이스(현재 `isInventoryOpen: boolean;` 근처)에 추가:

```ts
  isInventoryOpen: boolean;
  isMapOpen: boolean;
  isRunStatusOpen: boolean;
```

그리고 액션 시그니처(현재 `setInventoryOpen: (isOpen: boolean) => void;` 아래)에 추가:

```ts
  setInventoryOpen: (isOpen: boolean) => void;
  setMapOpen: (isOpen: boolean) => void;
  setRunStatusOpen: (isOpen: boolean) => void;
```

- [ ] **Step 2: 초기값 + 구현 추가** — `createUiSlice`의 반환 객체에서 `isInventoryOpen: false,` 아래에 초기값:

```ts
  isInventoryOpen: false,
  isMapOpen: false,
  isRunStatusOpen: false,
```

그리고 `setInventoryOpen: (isOpen) => set({ isInventoryOpen: isOpen }),` 아래에 구현:

```ts
  setInventoryOpen: (isOpen) => set({ isInventoryOpen: isOpen }),
  setMapOpen: (isOpen) => set({ isMapOpen: isOpen }),
  setRunStatusOpen: (isOpen) => set({ isRunStatusOpen: isOpen }),
```

- [ ] **Step 3: 단위 테스트 작성** — `src/store/slices/uiSlice.test.ts` 생성(이미 있으면 아래 `describe`만 추가):

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import { createTestStore } from '../../test/store';
import type { GameStore } from '../gameStore';

let store: StoreApi<GameStore>;
beforeEach(() => { store = createTestStore(); });

describe('uiSlice 호출형 UI 토글', () => {
  it('setMapOpen이 isMapOpen을 토글한다', () => {
    expect(store.getState().isMapOpen).toBe(false);
    store.getState().setMapOpen(true);
    expect(store.getState().isMapOpen).toBe(true);
    store.getState().setMapOpen(false);
    expect(store.getState().isMapOpen).toBe(false);
  });

  it('setRunStatusOpen이 isRunStatusOpen을 토글한다', () => {
    expect(store.getState().isRunStatusOpen).toBe(false);
    store.getState().setRunStatusOpen(true);
    expect(store.getState().isRunStatusOpen).toBe(true);
  });
});
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npx vitest run src/store/slices/uiSlice.test.ts`
Expected: PASS (2 tests). 만약 `isMapOpen` undefined로 실패하면 Step 1–2 누락.

- [ ] **Step 5: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 6: Commit**

```bash
git add src/store/slices/uiSlice.ts src/store/slices/uiSlice.test.ts
git commit -m "feat(ui): uiSlice에 isMapOpen/isRunStatusOpen 호출형 UI 플래그 추가"
```

---

## Task 2: RouteMapOverlay — 온디맨드 전체 경로 지도

**Files:**
- Create: `src/components/RouteMapOverlay.tsx`
- Modify: `src/styles/components/components-05.css` (오버레이 + 확대 미니맵 스타일)

- [ ] **Step 1: 컴포넌트 작성** — `src/components/RouteMapOverlay.tsx`:

```tsx
import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Map, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import MiniMap from './MiniMap';
import { getAvailableRouteNodeIndices } from '../utils/gameLogic';

// 콩알 미니맵을 대체하는 호출형 전체 지도. RunStatusModal의 오버레이 셸 패턴을 따른다.
const RouteMapOverlay: React.FC = () => {
  const isMapOpen = useGameStore(s => s.isMapOpen);
  const setMapOpen = useGameStore(s => s.setMapOpen);
  const stageNodes = useGameStore(s => s.stageNodes);
  const currentTurn = useGameStore(s => s.currentTurn);
  const path = useGameStore(s => s.path);
  const reducedMotion = useGameStore(s => s.gameOptions.reducedMotion);

  const currentNodes = stageNodes[currentTurn - 1] || [];
  const availableNodeIndices = getAvailableRouteNodeIndices(currentTurn, path, currentNodes.length);

  // Escape로 닫기 (App의 툴팁 Escape 핸들러와 동일 관례).
  useEffect(() => {
    if (!isMapOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMapOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMapOpen, setMapOpen]);

  // framer-motion은 JS 애니메이션이라 CSS reduced-motion 가드가 안 먹음 → 여기서 직접 게이팅.
  const dur = reducedMotion ? 0 : 0.18;
  const cardMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 16, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 10, scale: 0.98 } };

  return (
    <AnimatePresence>
      {isMapOpen ? (
        <motion.div
          className="route-map-overlay fixed inset-0 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: dur }}
          role="dialog" aria-modal="true" aria-label="런 경로 지도"
          onClick={() => setMapOpen(false)}
        >
          <motion.div
            className="route-map-overlay-card w-full max-w-3xl rounded-lg border border-cyan-200/24 p-4 shadow-2xl shadow-black/60"
            {...cardMotion}
            transition={{ duration: dur, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            data-testid="route-map-overlay"
          >
            <header className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-white">
                <Map className="h-5 w-5 text-cyan-200" /> 런 경로
              </h2>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                aria-label="지도 닫기"
                data-testid="route-map-close"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/6 text-slate-200 transition-colors hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <MiniMap nodes={stageNodes} currentTurn={currentTurn} path={path} availableNodeIndices={availableNodeIndices} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default RouteMapOverlay;
```

- [ ] **Step 2: CSS 추가** — `src/styles/components/components-05.css` 끝에 추가(오버레이 배경 + MiniMap 확대):

```css
/* ============================================================
   호출형 UI — 지도 오버레이 (씬 우선 모델 A+B)
   ============================================================ */
.route-map-overlay {
  z-index: var(--z-modal-backdrop);
  background: rgba(2, 4, 8, 0.66);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

.route-map-overlay-card {
  z-index: var(--z-modal);
  background: rgba(9, 12, 20, 0.94) !important;
}

/* 오버레이 안에서는 미니맵 자체 패널 테두리를 없애고 노드를 크게 — "콩알" 문제 해소 */
.route-map-overlay .mini-map-panel {
  background: transparent !important;
  border: 0 !important;
  padding: 0 !important;
  backdrop-filter: none !important;
}
.route-map-overlay .mini-map-node {
  min-width: 2rem;
  min-height: 2rem;
}
.route-map-overlay .mini-map-board {
  min-height: 48vh;
}
```

- [ ] **Step 3: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음(아직 미마운트라 렌더는 Task 4에서 확인).

- [ ] **Step 4: Commit**

```bash
git add src/components/RouteMapOverlay.tsx src/styles/components/components-05.css
git commit -m "feat(ui): RouteMapOverlay — 호출형 전체 경로 지도(MiniMap 확대 재사용)"
```

---

## Task 3: RunTopBar — 탐험 미니 상단 바

**Files:**
- Create: `src/components/RunTopBar.tsx`
- Modify: `src/styles/components/components-05.css`

- [ ] **Step 1: 컴포넌트 작성** — `src/components/RunTopBar.tsx`:

```tsx
import React from 'react';
import { Map, Package, ScrollText, Home, Heart } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { GameState } from '../types';
import { resourceIconPaths } from '../utils/resourceAssets';
import { assetPath } from '../utils/assetPath';
import { clamp } from '../utils/math';

// "필수는 상시, 상세는 호출" — 컴팩트 HP/자원 + 호출 버튼. 배경을 가리지 않는 얇은 바.
const RunTopBar: React.FC = () => {
  const player = useGameStore(s => s.player);
  const resources = useGameStore(s => s.resources);
  const setMapOpen = useGameStore(s => s.setMapOpen);
  const setInventoryOpen = useGameStore(s => s.setInventoryOpen);
  const setRunStatusOpen = useGameStore(s => s.setRunStatusOpen);
  const setGameState = useGameStore(s => s.setGameState);

  if (!player) return null;
  const hpPercent = player.maxHp > 0 ? clamp((player.currentHp / player.maxHp) * 100, 0, 100) : 0;

  return (
    <header className="run-top-bar" data-testid="run-top-bar">
      <div className="run-top-bar-vitals">
        <span className="run-top-bar-hp" aria-label={`체력 ${player.currentHp}/${player.maxHp}`}>
          <Heart className="h-4 w-4 text-red-300" />
          <span className="run-top-bar-hp-track"><i style={{ width: `${hpPercent}%` }} /></span>
          <strong>{player.currentHp}/{player.maxHp}</strong>
        </span>
        <span className="run-top-bar-res">
          <img src={assetPath(resourceIconPaths.echoRemnants)} alt="" loading="lazy" />{resources.echoRemnants}
        </span>
        <span className="run-top-bar-res">
          <img src={assetPath(resourceIconPaths.senseFragments)} alt="" loading="lazy" />{resources.senseFragments}
        </span>
        <span className="run-top-bar-res">
          <img src={assetPath(resourceIconPaths.memoryPieces)} alt="" loading="lazy" />{resources.memoryPieces}
        </span>
      </div>

      <nav className="run-top-bar-actions" aria-label="런 도구">
        <button type="button" className="run-top-bar-btn" data-testid="top-bar-map-button" onClick={() => setMapOpen(true)}>
          <Map className="h-4 w-4" /><span>지도</span>
        </button>
        <button type="button" className="run-top-bar-btn" data-testid="top-bar-deck-button" onClick={() => setInventoryOpen(true)}>
          <Package className="h-4 w-4" /><span>가방</span>
        </button>
        <button type="button" className="run-top-bar-btn" data-testid="top-bar-status-button" onClick={() => setRunStatusOpen(true)}>
          <ScrollText className="h-4 w-4" /><span>상태</span>
        </button>
        <button type="button" className="run-top-bar-btn is-muted" data-testid="top-bar-menu-button" onClick={() => setGameState(GameState.MENU)}>
          <Home className="h-4 w-4" /><span>메뉴</span>
        </button>
      </nav>
    </header>
  );
};

export default RunTopBar;
```

> 참고: `resourceIconPaths`는 `RunStatusModal`에서 쓰는 것과 동일(`../utils/resourceAssets`). 아이콘은 `lucide-react`에서 import.

- [ ] **Step 2: CSS 추가** — `src/styles/components/components-05.css` 끝(Task 2 블록 아래)에 추가:

```css
/* 호출형 UI — 탐험 미니 상단 바 */
.run-top-bar {
  position: sticky;
  top: 0;
  z-index: var(--z-hud);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.7rem;
  border: 1px solid rgba(244, 241, 231, 0.14);
  border-radius: 8px;
  background: rgba(9, 12, 20, 0.55);
  -webkit-backdrop-filter: blur(12px) saturate(1.1);
  backdrop-filter: blur(12px) saturate(1.1);
}
.run-top-bar-vitals { display: flex; align-items: center; gap: 0.7rem; min-width: 0; }
.run-top-bar-hp { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 800; color: #f4f1e7; }
.run-top-bar-hp-track { position: relative; width: 5.5rem; height: 0.4rem; border-radius: 999px; background: rgba(255,255,255,0.12); overflow: hidden; }
.run-top-bar-hp-track > i { position: absolute; inset: 0; right: auto; background: linear-gradient(90deg, #f87171, #a3e635); border-radius: 999px; }
.run-top-bar-res { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.74rem; font-weight: 800; color: #e2e8f0; }
.run-top-bar-res > img { width: 1rem; height: 1rem; }
.run-top-bar-actions { display: flex; align-items: center; gap: 0.4rem; }
.run-top-bar-btn {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.34rem 0.6rem; border-radius: 6px;
  border: 1px solid rgba(114, 239, 255, 0.28);
  background: rgba(244, 241, 231, 0.06);
  color: #f4f1e7; font-size: 0.74rem; font-weight: 800;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.run-top-bar-btn:hover { background: rgba(244, 241, 231, 0.12); border-color: rgba(114, 239, 255, 0.5); }
.run-top-bar-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(114, 239, 255, 0.6); }
.run-top-bar-btn.is-muted { border-color: rgba(244, 241, 231, 0.14); }
@media (max-width: 767px) {
  .run-top-bar-btn span { display: none; }   /* 모바일은 아이콘만 — 폭 절약 */
  .run-top-bar-hp-track { width: 3.5rem; }
}
```

- [ ] **Step 3: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add src/components/RunTopBar.tsx src/styles/components/components-05.css
git commit -m "feat(ui): RunTopBar — 컴팩트 필수정보 + 지도/가방/상태/메뉴 호출 버튼"
```

---

## Task 4: ExplorationScreen에 통합 (상단 바 마운트 + 사이드 레일/미니맵 제거)

**Files:**
- Modify: `src/screens/ExplorationScreen.tsx`
- Modify: `src/styles/components/components-05.css` (레이아웃 1열화)

- [ ] **Step 1: import 정리** — `ExplorationScreen.tsx` 상단에서 더 이상 안 쓰는 것 제거, 신규 추가. 제거: `CharacterStatus`, `ResourceDisplay`, `MiniMap`, `Panel`, `ActionButton`, `Activity`/`Package`/`ArrowLeft`(상단바로 이동). 추가:

```tsx
import RunTopBar from '../components/RunTopBar';
import RouteMapOverlay from '../components/RouteMapOverlay';
import RunStatusModal from '../components/RunStatusModal';
```

그리고 컴포넌트 안에서 RunStatusModal 제어용 store 셀렉터 추가(다른 셀렉터 옆):

```tsx
  const isRunStatusOpen = useGameStore(state => state.isRunStatusOpen);
  const setRunStatusOpen = useGameStore(state => state.setRunStatusOpen);
```

- [ ] **Step 2: 레이아웃 교체** — `return (...)` 안에서 `.exploration-layout` 그리드의 **사이드 레일 `<aside class="exploration-rail">` 전체 블록을 삭제**하고, `.exploration-footer`의 `<MiniMap .../>` 블록도 삭제한다. `<RunTopBar />`를 레이아웃 최상단에, 오버레이들을 화면 루트 끝에 마운트. 최종 구조:

```tsx
  return (
    <div
      className="exploration-screen relative min-h-screen overflow-x-hidden bg-gray-950 p-3 text-white sm:p-5"
      style={{ '--exploration-bg-image': stageBackground } as React.CSSProperties}
    >
      <div className="pointer-events-none absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />

      <div className="exploration-layout relative z-10 mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col gap-4 sm:min-h-[calc(100vh-2.5rem)]">
        <RunTopBar />

        <main className="exploration-main order-1 flex min-w-0 flex-col gap-4">
          {/* 기존 .exploration-route-hero Panel 블록 그대로 유지 */}
          {/* 기존 NodeSelection 블록 그대로 유지 */}
        </main>
      </div>

      <RouteMapOverlay />
      <RunStatusModal isOpen={isRunStatusOpen} onClose={() => setRunStatusOpen(false)} />
    </div>
  );
```

> 주의: `.exploration-route-hero` Panel과 `<NodeSelection .../>` 블록(현재 89–157행)은 **내용 변경 없이** `<main>` 안에 그대로 둔다. 히어로는 여전히 `Panel`을 쓰므로 `Panel` import는 유지해야 한다 — Step 1의 "제거" 목록에서 `Panel`은 빼고 유지할 것. (`ActionButton`·`CharacterStatus`·`ResourceDisplay`·`MiniMap`·`Activity`·`Package`·`ArrowLeft`만 제거.)

- [ ] **Step 3: 레이아웃 CSS 1열화** — `src/styles/components/components-05.css`의 기존 규칙을 수정:

찾기:
```css
.exploration-layout {
  align-items: start;
  grid-template-columns: minmax(0, 1fr) 18rem !important;
  min-height: calc(100dvh - 2rem) !important;
}
```
교체:
```css
.exploration-layout {
  align-items: stretch;
  min-height: calc(100dvh - 2rem) !important;
}
```
(이제 JSX가 `flex flex-col`이라 그리드 컬럼 불필요. `.exploration-rail`/`.exploration-footer` 규칙은 해당 요소가 사라져 무효지만 그대로 둬도 무해.)

- [ ] **Step 4: 빌드 + 전체 체크**

Run: `npm run check`
Expected: 통과(252+ 테스트, typecheck, build, dist 예산, no-e2e-hooks). 실패 시 미사용 import(예: 안 지운 `MiniMap`) 또는 JSX 누락 점검.

- [ ] **Step 5: 시각 캡처(평상시 + 지도 열림)** — 캡처 스크립트로 상단 바·풀폭·지도 오버레이 확인. `.tmp/ui-review-capture.mjs`의 desktop 블록에 지도-열림 캡처 한 줄 추가(reachExploration 직후):

```js
  await ev(`window.__gameStore.getState().setMapOpen(true)`);
  await sleep(400);
  await shoot(cdp, 'ui-review-desktop-map-open.png');
  await ev(`window.__gameStore.getState().setMapOpen(false)`);
  await sleep(250);
```

Run: `node .tmp/ui-review-capture.mjs`
Expected: `output/e2e/ui-review-desktop-resting.png`(상단 바 + 풀폭, 사이드/미니맵 없음), `ui-review-desktop-map-open.png`(전체 지도 오버레이 — 노드가 크게 보임), `ui-review-mobile-resting.png`(상단 바 아이콘만) 생성. 사람이 육안 확인.

- [ ] **Step 6: Commit**

```bash
git add src/screens/ExplorationScreen.tsx src/styles/components/components-05.css
git commit -m "feat(ui): 탐험 씬-우선화 — 상단 바 + 지도/상태 오버레이, 사이드 레일·콩알 미니맵 제거"
```

---

## Task 5: e2e 렌더-스모크에 지도 오버레이 검증 추가

**Files:**
- Modify: `scripts/run-e2e-smoke.mjs`

- [ ] **Step 1: 탐험 단계에 상단 바/지도 검증 추가** — `run-e2e-smoke.mjs`의 desktop/mobile 공통 플로우에서 exploration 화면 확인 직후(현재 `await checkScreen(... 'exploration', '.exploration-screen' ...)` 다음 줄)에 삽입:

```js
    // 호출형 지도: 상단 바 버튼 → 오버레이 표시 → 닫기
    await waitForSelector(cdp, '[data-testid="run-top-bar"]', { timeout: 8000, label: 'run top bar' });
    await clickSelector(cdp, '[data-testid="top-bar-map-button"]');
    await waitForSelector(cdp, '[data-testid="route-map-overlay"]', { timeout: 8000, label: 'route map overlay' });
    await clickSelector(cdp, '[data-testid="route-map-close"]');
    await waitForCondition(cdp, `!document.querySelector('[data-testid="route-map-overlay"]')`, { timeout: 5000, label: 'map overlay closed' });
```

- [ ] **Step 2: e2e 실행**

Run: `npm run e2e`
Expected: 출력 JSON `"ok": true`, errors 빈 배열. desktop+mobile 양쪽에서 지도 열림/닫힘 통과. (실패 시 testid 오타 또는 오버레이 미마운트 점검.)

- [ ] **Step 3: 최종 전체 체크**

Run: `npm run check`
Expected: 통과.

- [ ] **Step 4: 수동 접근성 확인(사람)** — `npm run dev` 후 탐험 진입:
  - [지도] 클릭 → 오버레이 열림, **Esc**로 닫힘, 백드롭 클릭으로 닫힘.
  - 옵션에서 reducedMotion ON → 오버레이가 슬라이드/스케일 없이 즉시(페이드만) 뜸.
  - 키보드 Tab으로 상단 바 버튼 포커스 가능, 포커스 링 보임.

- [ ] **Step 5: Commit**

```bash
git add scripts/run-e2e-smoke.mjs
git commit -m "test(e2e): 탐험 상단 바 지도 오버레이 열기/닫기 스모크 추가"
```

---

## Self-Review (작성자 체크 — 실행 전 확인)

**1. 스펙 커버리지:**
- 콩알 미니맵 → 온디맨드 전체 지도 ✅ Task 2(오버레이)+4(footer 제거)+5(검증).
- 깔끔한 미니 상단 바(필수 + 버튼) ✅ Task 3+4.
- "필수 상시 / 상세 호출" ✅ 상단 바 HP/자원 상시 + [지도]/[가방]/[상태] 호출.
- 배경 살리기(사이드 패널 제거) ✅ Task 4.
- reducedMotion 존중 ✅ Task 2 JS 게이팅 + Task 5 수동확인.
- 범위 밖(상점/휴식 씬-우선화, App 레벨 승격) — 후속 plan으로 명시 ✅.

**2. 플레이스홀더 스캔:** 모든 코드 단계에 실제 코드 포함. "적절히 처리" 류 없음 ✅.

**3. 타입/이름 일관성:** `isMapOpen`/`setMapOpen`, `isRunStatusOpen`/`setRunStatusOpen`(Task 1) = RunTopBar/RouteMapOverlay/ExplorationScreen(Task 2–4)에서 동일 사용 ✅. data-testid: `run-top-bar`/`top-bar-map-button`/`route-map-overlay`/`route-map-close`(Task 3) = e2e(Task 5)에서 동일 ✅.

**알려진 잔여 위험(실행자 주의):**
- ExplorationScreen import 정리 시 `Panel`은 **유지**(히어로가 사용). 미사용 import는 `noUnusedLocals`로 typecheck가 잡아줌.
- `.exploration-rail`/`.exploration-footer` 잔여 CSS는 무해하지만, 후속 정리 대상.
- 사이드 레일 제거로 `CharacterStatus`의 상태효과 표시가 탐험에서 사라짐 — 탐험 중엔 상태효과가 거의 없고 [상태] 버튼(RunStatusModal)으로 전체 확인 가능하므로 수용. 검토자가 반대하면 상단 바에 상태 칩 추가로 보완.

## Execution Handoff

이 계획은 `docs/superpowers/plans/2026-06-10-scene-first-summoned-ui.md`에 저장됨. 실행 방식 두 가지:

1. **Subagent-Driven (권장)** — 태스크마다 새 서브에이전트 디스패치 + 사이 검토.
2. **Inline 실행** — 이 세션에서 executing-plans로 배치 실행 + 체크포인트.
