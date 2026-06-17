# 탐험 화면 아카이브 전환 (§3.5 네거티브 콘택트 시트) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미 머지된 씬-우선 탐험 구조(상단 바 + 온디맨드 지도 + 1열 레이아웃) 위에, 스펙 §3.5 "네거티브 콘택트 시트" 아카이브 재질을 입힌다 — 조작 방식은 그대로, 시각 재질만 교체한다.

**Architecture:** `ExplorationScreen`의 루트를 `ArchiveSurface scene={getStageBackgroundCss(stage)}`로 감싸 스테이지 배경을 딤 처리한 콘택트 시트 무대를 만든다. 루트 클래스를 `.exploration-screen` → `.archive-exploration-screen`으로 개명해 components-03/05의 레거시 글래스/네온 `!important` 캐스케이드를 통째로 분리(clean slate)한다. 노드 카드(`NodeSelection`)는 기존 `motion.button`을 유지한 채 새 `.archive-film-frame` 재질을 입혀 필름 프레임화하고, 기능색(위험/보상 위계)을 **네온 글로우가 아닌 채도 낮춘 잉크/그리스펜슬 가장자리 표식**으로 재매핑한다. 라우트 히어로 Panel은 도장+캡션 재질로 교체하되 정보(진행도·압력·DEV seed)는 보존한다.

**Tech Stack:** React 19, TypeScript, Zustand, Framer Motion, 손글 CSS(`components-08-archive.css`, import 체인 끝), Tailwind 유틸.

---

## 배경: 스펙 인용

### §1 불변 규칙 (요약, 어기는 자유 없음)
- **재질**: 화면 배경 = 책상 표면 또는 (런 중) 딤 처리된 스테이지 장면 + 비네팅 + 필름 그레인. 패널/카드 = 인화지·필름. 정보 칩 = 잉크 스탬프/타자 캡션/연필 주석.
- **색**: 한랭 모노크롬 사진 톤(은염). 네온 글로우 금지, 웜톤(세피아) 금지. 유일 강조 = 월식 사이안 `--archive-accent`. **기능색(노드 타입)은 유지하되 채도를 낮춰 "잉크/스탬프" 느낌으로** — 색이 빛나는 게 아니라 종이에 스며든 것처럼. CSS에 색 하드코딩 금지 — `--archive-*` 토큰 경유.
- **타이포**: 대형 헤드라인으로 화면을 설명하지 않는다. 화면 정체는 장면이 말하고, 텍스트는 물건 위 기록(캡션·스탬프).
- **연출**: 호버=물건이 살짝 들림. reducedMotion 시 물리 연출 생략. framer-motion은 컴포넌트에서 `gameOptions.reducedMotion` 직접 게이팅.
- **접근성**: 선택 가능한 물건은 실제 `<button>`. 포커스 시 가시 링. 정보 손실 금지 — 제거하는 건 표현이지 정보가 아니다.

### §3.5 탐험 의도 (전환 대상)
- **장면**: 네거티브 콘택트 시트 — 필름 인덱스를 들여다보며 다음 프레임을 고른다. 런 중 화면이라 `ArchiveSurface`의 `scene` prop(스테이지 배경 딤).
- **만지는 물건**: 노드 카드 = 필름 프레임(`NodeSelection`). 경로 지도(`RouteMapOverlay`) = 콘택트 시트 위 그리스펜슬 표시. 상단 바(`RunTopBar`) = 책상 가장자리 도구.
- **건드리지 않음**: 씬-우선 구조(상단 바·오버레이 토글 *동작*), 노드 가용성 로직, 기능색 위계(게임적 의미), `data-testid`.

---

## 핵심 함정 (이 화면 고유)

1. **루트 개명 = 레거시 캐스케이드 분리 (트랩 #3 + 직접 확인됨).** `.exploration-screen`은 components-03/05에 광범위하게 스코프됨:
   - `05:644-651` `.exploration-screen { background: stage-art + scrim !important }` → `ArchiveSurface` scene 배경을 직접 덮음. **개명 없이는 전환 자체가 무효.**
   - `05:637-716` "허브 시각 재구성" 글래스 `!important` 블록(투명 보드, 글래스 패널, 네온 node-type 배경) = §2.2가 제거하라는 웹 대시보드 문법. 개명하면 공짜로 벗겨짐.
   - 결론: 루트를 `.archive-exploration-screen`으로 개명 → 레거시 `.exploration-screen`-prefixed 규칙 전부 분리. **단 같은 커밋에서 e2e `run-e2e-smoke.mjs:471` + dev 스크립트 `snap-hover.mjs:112` 동시 수정.**

2. **개명은 root-scoped 규칙만 분리한다 (advisor 경고).** components-03.css의 **bare** `.route-node-card`, `.route-signal-board`, `.route-node-detail`, `.mini-map-*`, `.route-node-lock-badge` 규칙은 root-scoped가 아니라 **개명 후에도 살아남아** 해당 클래스명을 단 마크업에 계속 적용됨. 그래서 inner 클래스도 개명/유지를 명시적으로 결정한다(아래 표).

3. **기능색은 네온 Tailwind로 못 옮긴다 (make-or-break, advisor 강조).** 현재 기능색은 belt-and-suspenders:
   - `nodePresentation.ts`의 `meta.className`(`bg-red-950/50` 등 네온 Tailwind)
   - `05:678-708`의 `.exploration-screen .route-node-card[data-node-type] !important` 배경
   루트 개명이 `!important` 레이어를 죽이면 **네온 Tailwind만 남아** = §2.2가 금지하는 글로우. 따라서 `meta.className`을 **채도 낮춘 아카이브 변형으로 교체가 필수**. 색→잉크 매핑(아래 §기능색 재매핑)을 코드로 박는다.

4. **밝은 패널엔 어두운 텍스트 / 어두운 패널엔 밝은 텍스트 (시리즈 최빈 버그, 트랩 #10).** 콘택트 시트는 어두운 scene 딤 위라 그 위 텍스트는 밝게. 밝은 인화지/메모지(`.archive-note`) 위 텍스트는 어두운 ink.

5. **그레인 위 자식은 자체 스택 컨텍스트 필요.** `.archive-grain`은 `z-index:1`. 그 위에 보여야 하는 콘텐츠는 `position:relative; z-index:2`(또는 Tailwind `relative z-10`).

6. **노드는 ArchiveCard로 강제하지 말 것 (advisor 점 #3).** 노드는 select fly-up·hover lift·disabled/locked·per-node 색 슬롯을 가진 `motion.button`. ArchiveCard는 paper 텍스처+ink 색+silver sweep 하드코딩에 비-motion이라 기능색과 싸우고 애니메이션을 죽인다. **기존 `motion.button`에 새 `.archive-film-frame` 재질만 입힌다.** data 속성(`data-testid="route-node-N"`, `data-route-available`, `data-node-type`) 전부 보존.

---

## 기능색 재매핑 (§2.2 "잉크로 스며든 색")

현재 네온 → 채도 낮춘 잉크 표식. **글로우 채움 금지, 가장자리 표식만.** 필름 프레임의 좌측 색인 띠(grease-pencil 마크)와 신호 도장 색으로 위계를 표현한다. 새 토큰을 `tokens.css`에 추가하고 `.archive-film-frame[data-node-type=...]`에서 경유한다.

| 노드 타입 | 게임 의미 | 신규 토큰(채도 낮춘 잉크) | 비고 |
|---|---|---|---|
| COMBAT | 위험 2 | `--archive-ink-danger: #9c5a52` (탁한 적갈) | 프레임 좌측 색인 띠 + 도장 |
| MINIBOSS | 위험 4 | `--archive-ink-danger` + 띠 두께/불투명 강화 | COMBAT<MINI<BOSS 램프(두께로) |
| BOSS | 위험 5 | `--archive-ink-danger` + 최대 강조 | |
| EVENT | 변동 3 | `--archive-ink-volatile: #8a7d52` (탁한 황 — 웜 글로우 아닌 흐린 잉크) | amber 네온의 채도 낮춘 대체 |
| SHOP / REST | 보급 1 | `--archive-stamp-ink` (#1d7480 청록, 기존) | 사이안 계열 |
| UNKNOWN | 불명 0 | `--archive-ink-soft` (#44525a, 기존) | 중성 회색 |

- **램프(위험 강도)**: 색은 같고 좌측 색인 띠의 두께(`border-left-width`)와 불투명도로 COMBAT→MINIBOSS→BOSS 강화. 글로우 박스섀도 금지.
- **amber/yellow 결정(advisor 명시 요청)**: EVENT는 따뜻한 글로우를 버리고 **탁한 황 잉크**(`#8a7d52`, 채도 낮음)로 흐리게 표식. 라우트 히어로의 `text-yellow-*` 압력 카드는 사이안 도장+어두운 메모지 톤으로 교체(웜 제거).

---

## 파일 구조

| 파일 | 책임 | 작업 |
|---|---|---|
| `src/styles/tokens.css` | `--archive-ink-danger`, `--archive-ink-volatile` 신규 토큰 2종 | Modify |
| `src/styles/components/components-08-archive.css` | `.archive-exploration-screen`, `.archive-contact-sheet`, `.archive-film-frame`(+data-node-type 변형·램프·locked·detail), `.archive-route-meta` 등 신규 어휘 | Modify(append) |
| `src/utils/nodePresentation.ts` | `meta.className`/`lineClassName`/`iconClassName`을 아카이브 변형으로 교체 | Modify |
| `src/components/NodeSelection.tsx` | `route-signal-board`→`archive-contact-sheet`, `route-node-card`→`archive-film-frame` 마크업 재질화. 기능·data 속성·애니메이션 보존 | Modify |
| `src/screens/ExplorationScreen.tsx` | 루트를 `ArchiveSurface scene`로 교체, 라우트 히어로 Panel→도장/캡션/메모지, 루트 클래스 개명 | Modify |
| `scripts/run-e2e-smoke.mjs:471` | exploration selector `.exploration-screen`→`.archive-exploration-screen` | Modify |
| `scripts/snap-hover.mjs:112,137-138` | dev 호버 스냅 selector 동기화(`.exploration-screen`, `.route-node-detail`) | Modify |

### inner 클래스 개명/유지 결정 (함정 #2)
- `route-signal-board` → **개명** `archive-contact-sheet` (레거시 03:43 투명/글래스 배경 분리)
- `route-node-card` → **개명** `archive-film-frame` (레거시 03/05 네온·구조 규칙 전부 분리, clean slate)
- `route-node-detail` / `route-node-detail-sense` / `route-node-detail-desc` → **개명** `archive-film-detail*` (03:718 progressive disclosure 재작성). snap-hover.mjs도 동기화.
- `route-node-lock-badge` → **개명** `archive-film-lock` (03:63 재작성)
- `route-node-meta` → **개명** `archive-route-meta`
- `mini-map-*` (RouteMapOverlay 내부, MiniMap) → **유지** (지도 오버레이는 이번 범위에서 구조 유지; §3.5는 "그리스펜슬 표시"지만 MiniMap 재작성은 회귀 표면이 커 별도. 단 오버레이 카드 셸은 아카이브 톤으로 가볍게 맞춤 — 아래 Task 5 옵션). 개명 안 하므로 03 mini-map 규칙 그대로 적용.
- `run-top-bar*` (RunTopBar) → **유지** (data-testid 기반, §3.5 "책상 가장자리 도구"는 가벼운 톤 정합만 — Task 6).

---

## Task 1: 기능색 잉크 토큰 추가

**Files:**
- Modify: `src/styles/tokens.css` (`--archive-*` 블록, 현재 line 666-686 인근)

- [ ] **Step 1: 토큰 2종 추가**

`src/styles/tokens.css`의 `--archive-grain-opacity: 0.07;` 줄 바로 뒤(또는 `--archive-frame-glow` 인근)에 추가:

```css
  --archive-ink-danger:  #9c5a52; /* 탁한 적갈 — 전투/보스 위험(네온 적색의 채도 낮춘 잉크) */
  --archive-ink-volatile:#8a7d52; /* 탁한 황 — 사건 변동(amber 네온의 흐린 잉크 대체, 웜 글로우 금지) */
```

- [ ] **Step 2: 빌드 타입체크로 CSS 파싱 회귀 없음 확인**

Run: `npm run typecheck`
Expected: PASS (CSS는 타입체크 대상 아니나, 변경 격리 확인용 기준선)

- [ ] **Step 3: 커밋**

```bash
git add src/styles/tokens.css
git commit -m "$(cat <<'EOF'
feat(archive): 탐험 노드 기능색 잉크 토큰 추가 — 네온 대체

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 필름 프레임 + 콘택트 시트 CSS 어휘

**Files:**
- Modify: `src/styles/components/components-08-archive.css` (파일 끝 모바일 `@media` 블록 직전에 append)

- [ ] **Step 1: 콘택트 시트 + 필름 프레임 CSS 추가**

`components-08-archive.css`의 마지막 `@media (max-width: 767px) {` 블록 **직전**에 아래를 삽입한다(모바일 블록 안에 새 모바일 규칙은 Step 2에서 별도 추가):

```css
/* --- 탐험(네거티브 콘택트 시트, §3.5): 스테이지 장면 딤 위 필름 인덱스. --- */
/* 루트는 .archive-exploration-screen(ArchiveSurface가 .is-scene와 함께 부여).
   레거시 .exploration-screen 스코프 규칙(components-03/05)과 분리됨 — 클린 슬레이트. */

/* 콘택트 시트 — 노드(프레임)가 놓이는 무대. scene 딤 위라 자체 스택 컨텍스트. */
.archive-contact-sheet {
  position: relative;
  z-index: 2;
}
/* 콘택트 시트 머리말 도장 줄 */
.archive-contact-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
/* 같은 유형 다중 노드일 때 공통 브리핑 = 시트 여백 캡션(밝은 글씨, 어두운 딤 위) */
.archive-contact-brief {
  margin-bottom: 1.1rem;
  padding: 0.7rem 0.85rem;
  background: rgba(6, 12, 14, 0.55);
  border: 1px solid rgba(114, 239, 255, 0.18);
  border-left: 3px solid var(--archive-accent);
  border-radius: 2px;
  color: var(--archive-paper);
  font-family: var(--font-family-archive);
}
.archive-contact-brief p { font-size: 0.82rem; line-height: 1.55; }
.archive-contact-brief p + p { margin-top: 0.45rem; color: rgba(201, 211, 214, 0.78); }

/* 필름 프레임 = 노드 카드. 기존 motion.button에 입힌다(애니메이션·data 속성 보존).
   네거티브 콘택트 시트의 한 컷: 어두운 셀룰로이드 + 좌측 색인 띠(기능색 grease-pencil). */
.archive-film-frame {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 14rem;
  padding: 0.85rem 0.9rem 0.9rem 1.05rem;
  text-align: left;
  color: var(--archive-paper);
  background:
    linear-gradient(168deg, rgba(18, 24, 27, 0.92), rgba(8, 12, 14, 0.95));
  border: 1px solid rgba(201, 211, 214, 0.14);
  border-left: 3px solid var(--archive-ink-soft); /* 색인 띠 기본(기능색 변형이 덮음) */
  border-radius: 2px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.5);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
/* 셀룰로이드 입자 */
.archive-film-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  opacity: 0.1;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
}
.archive-film-frame > * { position: relative; z-index: 1; }
button.archive-film-frame { cursor: pointer; }
button.archive-film-frame:hover,
button.archive-film-frame:focus-visible {
  border-color: rgba(201, 211, 214, 0.4);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.6);
}
button.archive-film-frame:focus-visible {
  outline: 2px solid var(--archive-accent);
  outline-offset: 2px;
}

/* 기능색 = 좌측 색인 띠(grease-pencil) + 신호 도장. 채도 낮춘 잉크, 글로우 없음. */
.archive-film-frame[data-node-type="COMBAT"]   { border-left-color: var(--archive-ink-danger); }
.archive-film-frame[data-node-type="MINIBOSS"] { border-left-color: var(--archive-ink-danger); border-left-width: 5px; }
.archive-film-frame[data-node-type="BOSS"]     { border-left-color: var(--archive-ink-danger); border-left-width: 7px; }
.archive-film-frame[data-node-type="EVENT"]    { border-left-color: var(--archive-ink-volatile); }
.archive-film-frame[data-node-type="SHOP"],
.archive-film-frame[data-node-type="REST"]     { border-left-color: var(--archive-stamp-ink); }
.archive-film-frame[data-node-type="UNKNOWN"]  { border-left-color: var(--archive-ink-soft); }

/* 잠긴 경로 프레임 — 물리 반응 제거, 탈색 */
.archive-film-frame.is-route-locked {
  cursor: not-allowed;
  filter: grayscale(0.6);
  opacity: 0.6;
}
.archive-film-frame.is-route-locked:hover,
.archive-film-frame.is-route-locked:focus-visible {
  transform: none;
  border-color: rgba(201, 211, 214, 0.14);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.5);
}
.archive-film-lock {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  z-index: 2;
  padding: 0.15rem 0.5rem;
  font-family: var(--font-family-archive);
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  color: var(--archive-paper);
  background: rgba(6, 12, 14, 0.85);
  border: 1px solid rgba(201, 211, 214, 0.3);
  border-radius: 2px;
}

/* 프레임 인덱스 번호 + 라우트명(필름 가장자리 각인 톤) */
.archive-film-index {
  font-family: var(--font-family-archive);
  font-size: 0.66rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(201, 211, 214, 0.55);
}

/* 위험/보상 꼬리표 줄 = 필름 하단 데이터 스트립 */
.archive-route-meta {
  margin-top: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.archive-route-meta > div {
  padding: 0.45rem 0.55rem;
  background: rgba(6, 12, 14, 0.45);
  border: 1px solid rgba(201, 211, 214, 0.12);
  border-radius: 2px;
}
.archive-route-meta-key {
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(201, 211, 214, 0.5);
}
.archive-route-meta-val { font-weight: 700; color: var(--archive-paper); }

/* 호버/포커스 시 감각 정보 공개(progressive disclosure, 03 .route-node-detail 대체) */
.archive-film-detail {
  position: absolute;
  inset-inline: 0.6rem;
  bottom: 0.6rem;
  z-index: 3;
  padding: 0.55rem 0.65rem;
  background: rgba(4, 8, 10, 0.92);
  border: 1px solid rgba(114, 239, 255, 0.22);
  border-radius: 2px;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.16s ease, transform 0.16s ease;
  pointer-events: none;
}
button.archive-film-frame:hover .archive-film-detail,
button.archive-film-frame:focus-within .archive-film-detail,
button.archive-film-frame:focus-visible .archive-film-detail {
  opacity: 1;
  transform: translateY(0);
}
.archive-film-detail-sense {
  font-family: var(--font-family-archive);
  font-size: 0.72rem;
  line-height: 1.45;
  color: rgba(201, 211, 214, 0.92);
}
.archive-film-detail-desc {
  margin-top: 0.3rem;
  font-size: 0.7rem;
  line-height: 1.4;
  color: rgba(201, 211, 214, 0.66);
}
body.is-reduced-motion .archive-film-detail { transition: none; }

/* 라우트 히어로 압력 메모지 = 책상 모서리 청록 메모(웜 yellow 제거) */
.archive-route-pressure {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.5rem;
}
```

- [ ] **Step 2: 모바일 `@media (max-width: 767px)` 블록 안에 필름 프레임 반응형 추가**

`components-08-archive.css` 마지막 `@media (max-width: 767px) {` 블록 안(`.archive-purse { ... }` 뒤, 닫는 `}` 앞)에 추가:

```css
  /* 모바일: 필름 프레임 최소높이 축소 + 호버 detail은 정적 표시(터치 사용자가 감각 정보를 잃지 않게) */
  .archive-film-frame { min-height: 11rem; }
  .archive-film-detail {
    position: static;
    inset: auto;
    opacity: 1;
    transform: none;
    margin-top: 0.6rem;
  }
```

- [ ] **Step 3: 빌드로 CSS 파싱 검증**

Run: `npm run typecheck`
Expected: PASS (기준선; CSS 문법 오류는 다음 빌드 Task에서 vite가 잡음)

- [ ] **Step 4: 커밋**

```bash
git add src/styles/components/components-08-archive.css
git commit -m "$(cat <<'EOF'
feat(archive): 탐험 필름 프레임·콘택트 시트 CSS 어휘 (§3.5)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: nodePresentation 기능색을 아카이브 변형으로 교체

**Files:**
- Modify: `src/utils/nodePresentation.ts` (`baseNodePresentation`의 각 타입 `className`/`lineClassName`/`iconClassName`)

**맥락:** 현재 `className`은 네온 Tailwind(`border-red-400/50 bg-red-950/50 ...`). 루트 개명으로 `!important` 백업이 사라지므로 이걸 비우거나 아카이브용으로 바꿔야 네온이 안 남는다. 기능색은 이제 CSS `.archive-film-frame[data-node-type]`(좌측 띠)가 담당하므로, 여기서는 Tailwind 색 클래스를 제거하고 도장 신호 색 토큰만 인라인 변수로 넘긴다. `lineClassName`(상단 그라데이션 선)과 `iconClassName`(아이콘 색)은 NodeSelection 마크업 재작성에서 안 쓰게 되므로 빈 문자열로 둔다(미사용 — Task 4에서 참조 제거).

- [ ] **Step 1: 각 타입의 색 클래스 비우기**

`baseNodePresentation`의 6개 타입 + UNKNOWN에서 `className`, `lineClassName`, `iconClassName`을 아래로 교체한다(나머지 필드 label/signal/description/risk/reward/level/stake는 그대로):

```ts
  [NodeType.COMBAT]: {
    label: '전투',
    signal: '적성 신호',
    description: '기본 전투입니다. 체력을 잃을 수 있지만 빌드 성장에 필요한 자원을 안정적으로 얻습니다.',
    risk: '체력 손실',
    reward: '에코 + 감각 조각',
    riskLevel: 2,
    rewardLevel: 2,
    stake: '안정적인 성장',
    className: '',
    lineClassName: '',
    iconClassName: '',
  },
  [NodeType.SHOP]: {
    label: '상점',
    signal: '보급 신호',
    description: '전투 없이 다음 전투를 준비합니다. 보유 에코를 회복, 예비 동전, 기술 강화로 바꿉니다.',
    risk: '전투 보상 없음',
    reward: '즉시 보강',
    riskLevel: 1,
    rewardLevel: 2,
    stake: '현재 빌드 보정',
    className: '',
    lineClassName: '',
    iconClassName: '',
  },
  [NodeType.REST]: {
    label: '휴식',
    signal: '회복 지대',
    description: '체력을 회복하거나 기억의 제단에 들러 장기 성장을 정리합니다. 다음 전투 전 숨을 고르는 선택입니다.',
    risk: '보상 성장 지연',
    reward: '회복 / 기억 정비',
    riskLevel: 1,
    rewardLevel: 1,
    stake: '생존 안정화',
    className: '',
    lineClassName: '',
    iconClassName: '',
  },
  [NodeType.EVENT]: {
    label: '사건',
    signal: '흔들리는 기억',
    description: '확률과 조건이 섞인 장면입니다. 큰 보상, 손실, 전투 진입이 모두 가능합니다.',
    risk: '예측 불가',
    reward: '고변동 보상',
    riskLevel: 3,
    rewardLevel: 3,
    stake: '런의 방향 전환',
    className: '',
    lineClassName: '',
    iconClassName: '',
  },
  [NodeType.MINIBOSS]: {
    label: '중간 보스',
    signal: '고밀도 위협',
    description: '난도가 높지만 예비 동전과 핵심 보상을 노릴 수 있습니다. 런을 강하게 밀어붙이는 선택입니다.',
    risk: '큰 피해 가능',
    reward: '희귀 보상',
    riskLevel: 4,
    rewardLevel: 4,
    stake: '고위험 성장',
    className: '',
    lineClassName: '',
    iconClassName: '',
  },
  [NodeType.BOSS]: {
    label: '보스',
    signal: '이클립스 핵',
    description: '층의 종착점입니다. 지금까지 만든 조합, 자원, 체력 관리가 한 번에 검증됩니다.',
    risk: '치명적 전투',
    reward: '층 돌파',
    riskLevel: 5,
    rewardLevel: 5,
    stake: '런 진행 관문',
    className: '',
    lineClassName: '',
    iconClassName: '',
  },
  [NodeType.UNKNOWN]: {
    label: '미확인',
    signal: '불명 신호',
    description: '정체를 알 수 없는 지점입니다. 위험과 보상이 모두 가려져 있습니다.',
    risk: '불명',
    reward: '불명',
    riskLevel: 0,
    rewardLevel: 0,
    stake: '정보 부족',
    className: '',
    lineClassName: '',
    iconClassName: '',
  },
```

- [ ] **Step 2: 단위 테스트 회귀 확인**

Run: `npm run test:run`
Expected: PASS. nodePresentation을 단언하는 테스트가 색 클래스 문자열을 검사하면 그 단언을 함께 수정한다(아래 Step 3). 먼저 실행해 어떤 테스트가 깨지는지 본다.

- [ ] **Step 3: 색 클래스 단언 테스트가 있으면 수정**

`route-node`/`nodePresentation` 테스트가 `className`에 `bg-red`/`border-cyan` 등을 단언하면, 그 단언을 제거하거나 `riskLevel`/`label` 같은 의미 필드 단언으로 바꾼다. (색은 이제 CSS data-attr 책임이므로 presentation 데이터 단언 대상 아님.)

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add src/utils/nodePresentation.ts src/utils/__tests__/ 2>/dev/null; git add -A
git commit -m "$(cat <<'EOF'
refactor(archive): 노드 presentation 네온 색 클래스 제거 — 기능색은 CSS data-attr로 이관

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: NodeSelection을 필름 프레임으로 재질화

**Files:**
- Modify: `src/components/NodeSelection.tsx`

**불변(보존):** `motion.button`, select fly-up `animate`/`transition`, `disabled`, `aria-disabled`, `data-route-available`, `data-node-type`, `data-testid={route-node-${index+1}}`, `handleSelect` 로직, `availableNodeSet`, `allSameType`/`commonMeta` 로직, `RatingMeter`.

**교체:** `route-signal-board`→`archive-contact-sheet`, 네온 그라데이션/글래스 div 제거, `route-node-card ${meta.className}`→`archive-film-frame`, 헤더/메타/디테일 마크업을 아카이브 클래스로.

- [ ] **Step 1: import에 ArchiveStamp 추가, 미사용 lucide 정리**

상단 import를 아래로 교체(네온 장식용 `Sparkles`/`RadioTower`는 콘택트 시트 머리말 도장으로 대체하며 제거, `AlertTriangle`/`ArrowRight`는 유지):

```tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { StageNode, NodeType } from '../types';
import type { PlayerCharacter } from '../types';
import NodeIcon from './NodeIcon';
import { getNodePresentation } from '../utils/nodePresentation';
import { useGameStore } from '../store/gameStore';
import { playGameSfx, playUiSound } from '../utils/sound';
import ArchiveStamp from './archive/ArchiveStamp';
```

- [ ] **Step 2: RatingMeter는 그대로 두고, return 마크업 전체 교체**

`return (` 부터 컴포넌트 끝까지를 아래로 교체:

```tsx
  return (
    <section className="archive-contact-sheet w-full">
      <div className="archive-contact-head">
        <ArchiveStamp>{currentTurn}층 인덱스 — 다음 프레임을 고른다</ArchiveStamp>
        <span className="hidden text-xs text-slate-300/80 sm:inline">
          프레임에 마우스를 올리면 감각 기록이 떠오릅니다
        </span>
      </div>

      {allSameType && commonMeta ? (
        <div className="archive-contact-brief">
          <p>{commonMeta.description}</p>
          <p>{commonMeta.senseHint}</p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {nodes.map((node, index) => {
          const meta = getNodePresentation(node, index, player);
          const isSelected = selectedNode?.id === node.id;
          const isAvailable = availableNodeSet.has(index);
          const isDanger = [NodeType.COMBAT, NodeType.MINIBOSS, NodeType.BOSS].includes(node.type);

          return (
            <motion.button
              key={node.id}
              type="button"
              onClick={() => handleSelect(node, index)}
              disabled={selectedNode !== null || !isAvailable}
              aria-disabled={!isAvailable}
              data-route-available={isAvailable ? 'true' : 'false'}
              data-node-type={node.type}
              data-testid={`route-node-${index + 1}`}
              animate={isSelected ? { scale: 1.05, opacity: 0, y: -12 } : { scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: 'easeInOut' }}
              whileHover={selectedNode || !isAvailable ? undefined : { y: -3 }}
              className={`archive-film-frame group ${!isAvailable ? 'is-route-locked' : ''} disabled:cursor-wait`}
            >
              {!isAvailable ? <div className="archive-film-lock">경로 잠김</div> : null}

              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="archive-film-index">프레임 {String(index + 1).padStart(2, '0')} · {meta.routeName}</div>
                  <h3 className="mt-1 text-lg font-black text-white">{meta.label}</h3>
                </div>
                <span className="shrink-0 text-slate-200/80"><NodeIcon type={node.type} size="lg" /></span>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <ArchiveStamp className="archive-stamp-mini">{meta.signal}</ArchiveStamp>
                {isDanger ? <AlertTriangle className="h-4 w-4 text-slate-200/70" /> : null}
              </div>

              <div className="archive-route-meta">
                <div>
                  <div className="archive-route-meta-key">위험</div>
                  <div className="archive-route-meta-val">{meta.risk}</div>
                  <RatingMeter level={meta.riskLevel} label="위험도" />
                </div>
                <div>
                  <div className="archive-route-meta-key">기대 보상</div>
                  <div className="archive-route-meta-val">{meta.reward}</div>
                  <RatingMeter level={meta.rewardLevel} label="보상" />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-200/80">
                <span className="truncate">{meta.routeHint} · {meta.stake}</span>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </div>

              <div className="archive-film-detail">
                <p className="archive-film-detail-sense">{meta.senseHint}</p>
                {!allSameType ? <p className="archive-film-detail-desc">{meta.description}</p> : null}
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default NodeSelection;
```

> 주의: `RatingMeter`의 pip은 `bg-current`를 쓴다. 필름 프레임 본문 텍스트색이 밝은 회색(`--archive-paper` 상속 아님 — 인라인 white 계열)이므로 pip이 밝게 보인다. 의미 위계(위험도)는 좌측 색인 띠가 담당하고 pip은 단계 수치만 — 색 일관 OK.

- [ ] **Step 3: 타입체크 — 미사용 import/심볼 없는지 수동 확인**

Run: `npm run typecheck`
Expected: PASS. `noUnusedLocals`가 없으므로 미사용 import는 컴파일 안 막힘 → `RadioTower`, `Sparkles` 등 제거됐는지 위 import 블록과 대조해 수동 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/components/NodeSelection.tsx
git commit -m "$(cat <<'EOF'
feat(archive): 노드 선택을 필름 프레임 콘택트 시트로 재질화 (§3.5)

기능·data-testid·select 애니메이션 보존, 마크업만 아카이브화.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: ExplorationScreen 루트를 ArchiveSurface로, 히어로 재질화, 루트 개명 + e2e/dev 동시 수정

**Files:**
- Modify: `src/screens/ExplorationScreen.tsx`
- Modify: `scripts/run-e2e-smoke.mjs:471`
- Modify: `scripts/snap-hover.mjs:112,137-138`

**불변(보존):** `RunTopBar`, `RouteMapOverlay`, `RunStatusModal`, `NodeSelection` 호출, store selectors, `selectNode`, 진행도 %, 압력 텍스트(`routePressureText`), DEV seed 로그, `getStageBackgroundCss`.

- [ ] **Step 1: ExplorationScreen import 교체**

상단 import에 ArchiveSurface/Stamp 추가, Panel·MapPinned·RadioTower 등 네온 장식 제거. 새 import 블록:

```tsx
import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import NodeSelection from '../components/NodeSelection';
import RunTopBar from '../components/RunTopBar';
import RouteMapOverlay from '../components/RouteMapOverlay';
import RunStatusModal from '../components/RunStatusModal';
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import { NodeType } from '../types';
import { getNodeTypeCounts } from '../utils/nodePresentation';
import { STAGE_TURNS } from '../constants';
import { stageData } from '../data/dataStages';
import { getAvailableRouteNodeIndices } from '../utils/gameLogic';
import { getStageBackgroundCss } from '../utils/stageBackground';
```

- [ ] **Step 2: return 마크업 교체 (루트 ArchiveSurface + 개명 + 히어로 재질화)**

`if (!player)` 가드는 그대로 두고, 그 아래 `return (` 부터 컴포넌트 끝까지 교체:

```tsx
  const sensoryProfile = player.signature ?? '감각 동기화';
  const currentPath = path.length > 0
    ? path.map(step => `${step.turn}층-${step.nodeIndex + 1}`).join(' / ')
    : '진입 전';

  return (
    // 네거티브 콘택트 시트 — 스테이지 장면 딤 위에서 다음 프레임을 고른다(런 중 화면, 슬더스 문법).
    <ArchiveSurface
      scene={getStageBackgroundCss(currentStage)}
      className="archive-exploration-screen overflow-x-hidden p-3 sm:p-5"
    >
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col gap-4 sm:min-h-[calc(100vh-2.5rem)]">
        <RunTopBar />

        <main className="order-1 flex min-w-0 flex-col gap-4">
          {/* 콘택트 시트 라벨 — 키커/대형 타이틀/설명문단의 다이어제틱 대체물. 정보는 보존. */}
          <header className="archive-contact-sheet flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ArchiveStamp>스테이지 {currentStage} · {stageInfo?.name ?? '미확인 구역'}</ArchiveStamp>
              <span className="text-xs font-bold text-cyan-100">{progressPercent}%</span>
            </div>

            <p className="max-w-2xl text-xs leading-relaxed text-slate-300/85">
              {stageInfo?.description ?? '구역 정보를 불러오는 중입니다.'} {player.name}의 {sensoryProfile} 신호가 다음 프레임을 읽어냅니다.
            </p>

            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-200/80" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate">현재 경로: {currentPath}</span>
              <span>{currentTurn}/{STAGE_TURNS} 층</span>
            </div>

            <div className="archive-route-pressure text-slate-200/85">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
              <p className="text-xs leading-relaxed">
                <span className="font-bold text-cyan-100">현재 압력 · </span>{routePressureText(nodeCounts)}
              </p>
            </div>

            {import.meta.env.DEV ? (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span>Seed: {routeSeed ?? '미기록'}</span>
                <span>생성 로그 {routeGenerationLog.length}건</span>
              </div>
            ) : null}
          </header>

          <div className="flex flex-1 items-start">
            <NodeSelection
              nodes={currentNodes}
              availableNodeIndices={availableNodeIndices}
              onSelect={(node, index) => selectNode(node, index)}
              currentTurn={currentTurn}
              player={player}
            />
          </div>
        </main>
      </div>

      <RouteMapOverlay />
      <RunStatusModal isOpen={isRunStatusOpen} onClose={() => setRunStatusOpen(false)} />
    </ArchiveSurface>
  );
};
```

> 주의: 위 마크업은 `weaponProfile`을 더 이상 안 쓴다. `if (!player)` 위쪽에 선언된 `sensoryProfile`/`weaponProfile`/`currentPath`가 중복 선언되지 않게, 기존 컴포넌트 본문에서 그 줄들을 제거하고 위 Step 2 블록의 선언만 남긴다(중복 `const` = 타입 오류). 마찬가지로 `stageBackground` 지역변수는 미사용이 되므로 제거. `ArchiveSurface`가 `style`로 받던 `--exploration-bg-image`는 더 이상 불필요(scene prop이 대체).

- [ ] **Step 3: 미사용 지역변수/중복 선언 정리 확인**

`ExplorationScreen` 본문에서 `const stageBackground = ...`, 기존 `const sensoryProfile`/`weaponProfile`/`currentPath`(가드 아래 중복분) 제거. `stageInfo`/`progressPercent`/`nodeCounts`/`routeSeed`/`routeGenerationLog`는 유지(사용됨).

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: e2e selector 동시 수정**

`scripts/run-e2e-smoke.mjs:471`:

```js
    await checkScreen(cdp, errors, name, 'exploration', '.archive-exploration-screen', overflows, screenshots);
```

- [ ] **Step 5: dev 호버 스냅 스크립트 selector 동기화 (트랩 #7 — 런타임 orphan 방지)**

`scripts/snap-hover.mjs`:
- line 112: `await waitFor(\`document.querySelector('.archive-exploration-screen')\`, 'exploration screen');`
- line 137: `const d = card && card.querySelector('.archive-film-detail');`
- line 138: `if (!d) return { error: 'no .archive-film-detail' };`
- 주석(line 10, 129)의 `.route-node-detail` 언급도 `.archive-film-detail`로 갱신(선택, 정확성).

- [ ] **Step 6: 타입체크 + 커밋**

Run: `npm run typecheck`
Expected: PASS

```bash
git add src/screens/ExplorationScreen.tsx scripts/run-e2e-smoke.mjs scripts/snap-hover.mjs
git commit -m "$(cat <<'EOF'
feat(archive): 탐험 루트 ArchiveSurface 전환 + 히어로 재질화 + 루트 개명 (§3.5)

.exploration-screen→.archive-exploration-screen 개명으로 레거시 글래스/네온
!important 캐스케이드 분리. e2e/dev 스냅 selector 동시 수정.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 상단 바 stacking + 지도 오버레이 웜톤 제거 (§3.5 "책상 가장자리 도구" + §2.2 웜톤 금지)

**Files:**
- Modify: `src/styles/components/components-08-archive.css` (탐험 블록에 append)

**맥락:** RunTopBar(`.run-top-bar*`)·RouteMapOverlay·MiniMap은 data-testid/구조 유지(개명 안 함, 지도 geometry 재작성은 회귀 표면이 큼). 레거시 bare `.mini-map-*`/`.run-top-bar*` 규칙은 root 개명에도 **살아남는다**(advisor 함정 #2). MiniMap은 **웜 yellow 톤**(`text-yellow-400`, `#facc15`, `rgba(250,204,21,…)`)을 쓰는데 이는 §2.2 불변(웜톤 금지) 위반이고, e2e가 `exploration-map-open`을 **양 뷰포트** 캡처(`run-e2e-smoke.mjs:475-477`)하므로 Task 7 육안에서 반드시 잡힌다 → **웜톤 중화가 필수.**

**중요(스코프 닿음 확인):** RouteMapOverlay는 `fixed inset-0`이지만 fixed는 *레이아웃*만 바꾸지 DOM 조상은 그대로다 — `<ArchiveSurface className="archive-exploration-screen">` 안에서 렌더되므로 `.archive-exploration-screen .mini-map-*` 자손 셀렉터가 매칭된다(특이성 0,3,0 > bare 0,2,0, 08은 cascade 끝). **MiniMap은 RouteMapOverlay 단독 사용**(grep 확인 — RunStatusModal 등 미사용)이라 cross-screen 회귀 없음. MiniMap.tsx 직접 수정 대신 **archive 스코프 CSS 오버라이드**로 처리(레거시 무수정, 시리즈 패턴).

- [ ] **Step 1: 상단 바 stacking + 지도 웜톤 중화 추가**

`components-08-archive.css`의 탐험 블록(Task 2에서 추가한 영역) 끝에 추가:

```css
/* 상단 바 = 책상 가장자리 도구. 콘택트 시트 무대 위 stacking 보장(구조·testid 불변). */
.archive-exploration-screen .run-top-bar {
  position: relative;
  z-index: 2;
}

/* 지도 오버레이(콘택트 시트 위 그리스펜슬 표시) — 웜 yellow 톤을 월식 사이안/중성으로 중화(§2.2).
   geometry는 레거시 유지, 색만 archive 스코프로 덮는다. RouteMapOverlay가 fixed여도
   .archive-exploration-screen 자손이라 매칭됨. */
.archive-exploration-screen .mini-map-board {
  background:
    radial-gradient(circle at 50% 0%, rgba(114, 239, 255, 0.1), transparent 44%),
    linear-gradient(180deg, rgba(6, 12, 14, 0.7), rgba(4, 8, 10, 0.85));
}
.archive-exploration-screen .mini-map-path {
  filter: drop-shadow(0 0 6px rgba(114, 239, 255, 0.14));
}
.archive-exploration-screen .mini-map-turn-zone {
  background: linear-gradient(180deg, rgba(114, 239, 255, 0.12), rgba(114, 239, 255, 0.03));
}
.archive-exploration-screen .mini-map-turn-label.is-current {
  color: var(--archive-accent);
}
/* MiniMap 머리말 카운터(text-yellow-400 Tailwind)도 사이안으로 — h3 우측 span */
.archive-exploration-screen .mini-map-panel h3 .text-yellow-400,
.archive-exploration-screen .mini-map-panel .text-yellow-400 {
  color: var(--archive-accent) !important;
}
```

> 주의: `.text-yellow-400`는 Tailwind 유틸이라 `!important`로 덮어야 안전(Tailwind 생성 순서 의존 제거). 나머지 `.mini-map-*`는 손글 클래스라 특이성+cascade로 충분(`!important` 불요).

- [ ] **Step 2: 빌드 + 커밋**

Run: `npm run typecheck`
Expected: PASS

```bash
git add src/styles/components/components-08-archive.css
git commit -m "$(cat <<'EOF'
feat(archive): 탐험 상단 바 stacking + 지도 오버레이 웜톤 제거 (§3.5, §2.2)

지도 미니맵의 yellow 톤을 월식 사이안으로 중화(archive 스코프 오버라이드,
MiniMap.tsx 무수정). geometry 레거시 유지.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 전체 검증 (check + e2e + 캡처 육안)

**Files:** 없음 (검증만)

- [ ] **Step 1: 풀 체크 체인**

Run: `npm run check`
Expected: PASS (text-integrity, stage3, exploration-route, typecheck, test:run, validate:passives, release-assets, build, dist budget 전부 통과). 실패 시 멈추고 원인 수정 — 추측 강행 금지.

- [ ] **Step 2: e2e 스모크 + `ok` 값 확인**

Run: `npm run e2e`
Expected: 출력 끝의 결과 JSON/요약에서 `ok: true`(에러 0, 오버플로 0). exploration/exploration-map-open 캡처가 생성됐는지 확인.

- [ ] **Step 3: 캡처 육안 검증 (Read 툴로 직접 본다)**

아래 파일을 Read 툴로 열어 육안 판정:
- `output/e2e/desktop-exploration.png`
- `output/e2e/mobile-exploration.png`
- `output/e2e/desktop-exploration-map-open.png`

체크리스트:
- [ ] 필름 프레임 노드 3장이 콘택트 시트 위에 정상 배치(좌측 정렬 뭉침·겹침 없음, 가로 오버플로 없음)
- [ ] 기능색 위계 보존: COMBAT/BOSS = 적갈 색인 띠(BOSS가 더 두꺼움), SHOP/REST = 청록, EVENT = 탁한 황, 글로우 없음
- [ ] 상단 바(HP/자원/도구 버튼) 정상, scene 딤 위에서 가독
- [ ] 지도 오버레이가 열린 상태로 정상 렌더(map-open 캡처), **웜 yellow 톤 0** — 미니맵 보드/경로/현재 층 라벨/카운터가 전부 사이안/중성(§2.2 웜톤 금지). 데스크톱·모바일 둘 다 확인.
- [ ] 텍스트 대비: 밝은 글씨가 어두운 콘택트 시트 딤 위에서 읽힘(트랩 #10)
- [ ] 스테이지 배경이 딤 처리되어 보임(scene 연속성), 책상 텍스처 아님

문제 발견 시: 구체적으로 어느 캡처의 무엇인지 기록하고, 해당 Task의 CSS/마크업으로 돌아가 수정 후 Step 1-3 재실행.

- [ ] **Step 4: reducedMotion 수동 확인 (선택, 캡처로는 미검증)**

dev에서 옵션 reducedMotion ON 시 필름 detail 트랜지션·그레인 애니메이션이 생략되는지 확인(`body.is-reduced-motion` 가드). 캡처 자동화 범위 밖이라 수동.

---

## Self-Review (작성자 체크리스트)

**1. 스펙 커버리지:**
- §3.5 장면(콘택트 시트) → Task 5 ArchiveSurface scene ✅
- 노드=필름 프레임 → Task 2 CSS + Task 4 마크업 ✅
- 지도=그리스펜슬(오버레이 geometry 유지 + 웜톤→사이안 중화) → Task 6 (MiniMap geometry 재작성은 명시적 범위 밖, 색 중화는 §2.2 불변이라 필수) ✅
- 상단 바=책상 도구(stacking 정합) → Task 6 ✅
- 기능색 위계 보존 → Task 1 토큰 + Task 2 data-attr + Task 3 네온 제거 ✅
- 씬-우선 구조 불변 → 모든 Task가 동작/store/testid 보존 ✅
- §2.2 네온/웜 제거 → Task 3(Tailwind 네온 제거) + 루트 개명(`!important` 네온 분리) ✅
- §2.5 정보 손실 금지(진행도·압력·DEV seed) → Task 5에서 전부 보존 ✅

**2. 플레이스홀더 스캔:** 모든 코드 스텝에 실제 코드 포함. TBD/적절히/유사 없음 ✅

**3. 타입 일관성:** 클래스명 `archive-film-frame`/`archive-film-detail`/`archive-contact-sheet`/`archive-route-meta`/`archive-film-lock`/`archive-film-index`가 CSS(Task 2)·마크업(Task 4)·dev 스크립트(Task 5)에서 동일 표기 ✅. 토큰 `--archive-ink-danger`/`--archive-ink-volatile`가 tokens(Task 1)·CSS(Task 2) 동일 ✅.

**잠재 리스크 메모:**
- Task 3에서 `lineClassName`/`iconClassName`을 빈 문자열로 두지만 `NodePresentation` 인터페이스는 필수 필드 유지(타입 안전). 다른 소비자(MiniMap 등)가 이 필드를 안 쓰는지 확인됨 — MiniMap은 `nodeTypeNames`/`NodeIcon` 자체 사용, presentation 미사용.
- 루트 개명으로 03/05의 bare inner 규칙(`.route-node-card` 등)이 살아남지만, 마크업이 그 클래스명을 더는 안 달므로(개명) 적용 안 됨 — orphan CSS만 남고 시각 영향 0. (정리는 별도 트랙, 스펙 §6 CSS 부채 비범위.)
