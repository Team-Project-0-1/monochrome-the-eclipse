# 아카이브 파운데이션 + 보상 화면 버티컬 슬라이스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아카이브 아트 디렉션(스펙: `docs/superpowers/specs/2026-06-10-archive-art-direction-design.md`)의 Phase 0 파운데이션(토큰·서체·텍스처·공용 컴포넌트 4종)을 구축하고, Phase 1 보상 선택 화면을 "책상 위 사진 3장" 다이어제틱 장면으로 전환해 육안 검증 게이트에 올린다.

**Architecture:** 신규 `.archive-*` CSS 네임스페이스 + 신규 파일 `components-08-archive.css`(import 체인 마지막)로 기존 1,415개 `!important` 캐스케이드와 완전 격리. 텍스처는 절차적 SVG(feTurbulence data-URI)를 기본으로 깔고, Gemini 이미지 생성 스크립트가 성공하면 CSS 변수만 교체해 비트맵으로 승격(실패해도 슬라이스 진행 가능). reducedMotion은 기존 `body.is-reduced-motion` 전역 가드(tokens.css:299-308)가 CSS transition/animation을 죽이므로 CSS 연출만 쓰면 자동 충족 — 단 keyframe 애니메이션은 명시 가드 1줄 추가.

**Tech Stack:** React 19 + TypeScript, Tailwind + 수기 CSS(cr-레이어), @fontsource/gowun-batang(OFL 한글 명조), SVG feTurbulence 절차 텍스처, Gemini `gemini-2.5-flash-image` REST(선택적), ffmpeg(WebP 변환 — `check:asset-tooling`이 이미 요구).

---

## 알아둘 코드베이스 사실 (실행 전 필독)

- **dist 예산**(`scripts/check-dist-budget.mjs`): 총 15MB, PNG 합계 512KB, **`assets/` 아래 PNG 금지** → 신규 텍스처는 반드시 `.webp`.
- **reducedMotion**: `body.is-reduced-motion * { ... }`(tokens.css:306-308)이 transition을 무력화. framer-motion(JS)만 수동 게이팅 필요 — 이 계획은 framer를 쓰지 않고 CSS 연출만 사용.
- **e2e 의존**: `run-e2e-smoke.mjs:551-559`가 REWARD 화면을 `.combat-reward-screen` 루트 셀렉터로 검증 — **이 클래스는 유지**할 것.
- **Orbitron은 유령 폰트**: `@font-face` 없이 폰트명만 선언되어 실제로는 system-ui 폴백. 아카이브 서체는 별도 토큰 `--font-family-archive`로 추가(기존 `--font-family-display`는 건드리지 않음).
- CSS import 체인: `src/index.tsx:14-20`. 신규 파일은 components-07 다음 줄에 추가.

---

## File Structure

**생성**
- `src/styles/components/components-08-archive.css` — `.archive-*` 전체 스타일(유일한 아카이브 CSS 거처)
- `src/components/archive/ArchiveSurface.tsx` — 책상 표면 + 비네팅 + 필름 그레인 래퍼
- `src/components/archive/ArchiveCard.tsx` — 인화지 카드(interactive=버튼/정적=섹션)
- `src/components/archive/ArchiveStamp.tsx` — 잉크 도장 라벨
- `src/components/archive/ArchiveCaption.tsx` — 타자기 캡션
- `scripts/generate-archive-textures.mjs` — Gemini 텍스처 생성(best-effort)
- `public/assets/archive/` — 생성 텍스처(.webp) 보관처

**수정**
- `src/styles/tokens.css` — `--archive-*` 토큰 블록 추가(파일 끝)
- `src/index.tsx` — fontsource import 2줄 + components-08 import 1줄
- `src/screens/CombatRewardScreen.tsx` — 아카이브 장면으로 전환
- `package.json` — `@fontsource/gowun-batang` 의존성

---

## Task 1: 아카이브 토큰 + 서체 번들

**Files:**
- Modify: `src/styles/tokens.css` (파일 끝에 추가)
- Modify: `src/index.tsx:8-9` 부근
- Modify: `package.json` (npm install로 자동)

- [ ] **Step 1: 서체 설치**

Run: `npm install @fontsource/gowun-batang`
Expected: package.json dependencies에 `@fontsource/gowun-batang` 추가. (Gowun Batang = SIL OFL 한글 명조 — 활판 인쇄 질감. 라이선스 안전.)

- [ ] **Step 2: index.tsx에 서체 import** — `import './index.css';` 줄 바로 아래에 추가:

```tsx
// 아카이브 아트 디렉션 디스플레이 서체(OFL). 유니코드 서브셋 분할이라 사용 글리프만 로드된다.
import '@fontsource/gowun-batang/400.css';
import '@fontsource/gowun-batang/700.css';
```

- [ ] **Step 3: tokens.css 끝에 아카이브 토큰 블록 추가**

```css
/* =============================================================================
 * 아카이브 아트 디렉션 토큰 — specs/2026-06-10-archive-art-direction-design.md §2
 * "기록 보관자의 책상": 모노크롬 사진 톤. 네온 글로우 금지, 색은 잉크처럼.
 * ========================================================================== */
:root {
  --font-family-archive: 'Gowun Batang', 'Nanum Myeongjo', serif;

  --archive-desk:        #16120d; /* 책상 표면 기저색(웜 블랙) */
  --archive-desk-edge:   #0a0806; /* 비네팅 가장자리 */
  --archive-lamp:        #e8d9b0; /* 스탠드 불빛(유일 광원) */
  --archive-paper:       #d9d3c5; /* 인화지 밝은 면 */
  --archive-paper-shade: #b6afa0; /* 인화지 그늘 */
  --archive-ink:         #2b2823; /* 잉크/타자 텍스트 */
  --archive-ink-soft:    #524d43;
  --archive-silver:      #c9cdd3; /* 은염 하이라이트 */
  --archive-stamp-ink:   #8a3a32; /* 도장 잉크(저채도 적) */
  --archive-grain-opacity: 0.07;

  /* Task 4(텍스처 생성) 성공 시 url(...)로 교체. 기본은 절차적 폴백만 사용. */
  --archive-desk-image:  none;
  --archive-paper-image: none;
}
```

- [ ] **Step 4: typecheck + dev 기동 확인**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/index.tsx src/styles/tokens.css
git commit -m "feat(archive): 아카이브 토큰 + Gowun Batang 서체 번들 (Phase 0)"
```

---

## Task 2: components-08-archive.css — 아카이브 스타일 레이어

**Files:**
- Create: `src/styles/components/components-08-archive.css`
- Modify: `src/index.tsx:20` 다음 줄

- [ ] **Step 1: CSS 파일 생성** — `src/styles/components/components-08-archive.css`:

```css
/* =============================================================================
 * 아카이브 아트 디렉션 — .archive-* 네임스페이스 전용 파일.
 * 규칙: 기존 components-01~07의 셀렉터를 절대 참조/오버라이드하지 않는다.
 * (신규 네임스페이스 격리로 1,415개 !important 캐스케이드와 무충돌 공존)
 * 스펙: docs/superpowers/specs/2026-06-10-archive-art-direction-design.md
 * ========================================================================== */

/* --- 책상 표면 (화면 배경) --- */
.archive-surface {
  position: relative;
  min-height: 100vh;
  background:
    radial-gradient(ellipse 90% 70% at 50% 18%, rgba(232, 217, 176, 0.10), transparent 60%),
    radial-gradient(ellipse 140% 120% at 50% 50%, transparent 40%, var(--archive-desk-edge) 100%),
    var(--archive-desk-image),
    /* 절차적 나뭇결/펠트 노이즈 */
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='w'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012 0.05' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.10 0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23w)'/%3E%3C/svg%3E"),
    var(--archive-desk);
  background-size: auto, auto, cover, 300px 300px, auto;
  color: var(--archive-paper);
}

/* --- 필름 그레인 오버레이 (전역 통일감 핵심) --- */
.archive-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: var(--archive-grain-opacity);
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
  animation: archive-grain-shift 1.6s steps(3) infinite;
}
@keyframes archive-grain-shift {
  0% { transform: translate(0, 0); }
  33% { transform: translate(-18px, 9px); }
  66% { transform: translate(11px, -14px); }
  100% { transform: translate(0, 0); }
}
body.is-reduced-motion .archive-grain { animation: none; }

/* --- 인화지 카드 --- */
.archive-card {
  position: relative;
  display: flex;
  flex-direction: column;
  text-align: left;
  border: 0;
  border-radius: 2px;
  padding: 0.65rem 0.65rem 0.9rem;
  background:
    var(--archive-paper-image),
    /* 절차적 종이 섬유 */
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.85 0 0 0 0 0.83 0 0 0 0 0.77 0 0 0 0.10 0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23p)'/%3E%3C/svg%3E"),
    linear-gradient(168deg, var(--archive-paper) 0%, var(--archive-paper-shade) 100%);
  background-size: cover, 220px 220px, auto;
  color: var(--archive-ink);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.08) inset,
    0 10px 24px rgba(0, 0, 0, 0.55),
    0 2px 6px rgba(0, 0, 0, 0.4);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
/* 인터랙티브 카드(버튼)만 물리 반응 */
button.archive-card { cursor: pointer; }
button.archive-card:hover,
button.archive-card:focus-visible {
  transform: translateY(-6px) rotate(var(--archive-tilt, -1.2deg));
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.10) inset,
    0 22px 44px rgba(0, 0, 0, 0.65),
    0 4px 10px rgba(0, 0, 0, 0.45);
}
button.archive-card:focus-visible {
  outline: 2px solid var(--archive-silver);
  outline-offset: 3px;
}
/* 은빛 반사 스윕 */
button.archive-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(115deg, transparent 30%, rgba(201, 205, 211, 0.0) 40%, rgba(201, 205, 211, 0.22) 50%, transparent 62%);
  background-size: 240% 100%;
  background-position: 120% 0;
  pointer-events: none;
  transition: background-position 0.45s ease;
}
button.archive-card:hover::after,
button.archive-card:focus-visible::after { background-position: -60% 0; }

/* 카드 등장: 책상 위로 떨어짐 */
.archive-card.is-dealt { animation: archive-deal 0.42s cubic-bezier(0.2, 0.9, 0.3, 1) backwards; }
.archive-card.is-dealt:nth-child(2) { animation-delay: 0.09s; }
.archive-card.is-dealt:nth-child(3) { animation-delay: 0.18s; }
@keyframes archive-deal {
  from { opacity: 0; transform: translateY(-28px) rotate(2.5deg) scale(1.04); }
  to   { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
}
body.is-reduced-motion .archive-card.is-dealt { animation: none; }

/* --- 사진 피사체 영역 (카드 상단) --- */
.archive-photo-frame {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 9.5rem;
  margin-bottom: 0.6rem;
  background:
    radial-gradient(ellipse 80% 70% at 50% 42%, rgba(201, 205, 211, 0.14), transparent 75%),
    linear-gradient(180deg, #232019, #15120d);
  border: 1px solid rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.archive-photo-frame > img {
  width: 4.5rem;
  height: 4.5rem;
  object-fit: contain;
  filter: grayscale(0.85) contrast(1.05) brightness(1.1) sepia(0.12);
}
.archive-photo-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
  opacity: 0.12;
}

/* --- 타자기 캡션 --- */
.archive-caption {
  font-family: var(--font-family-archive);
  color: var(--archive-ink);
  font-size: 0.84rem;
  line-height: 1.5;
  letter-spacing: 0.02em;
}
.archive-caption strong { font-weight: 700; }
.archive-caption-sub {
  color: var(--archive-ink-soft);
  font-size: 0.74rem;
}

/* --- 잉크 도장 --- */
.archive-stamp {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.7rem;
  border: 2px solid var(--archive-stamp-ink);
  border-radius: 3px;
  color: var(--archive-stamp-ink);
  font-family: var(--font-family-archive);
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.14em;
  transform: rotate(-1.6deg);
  /* 도장 잉크 얼룩 */
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40'%3E%3Cfilter id='s'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.18' numOctaves='2'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='1.6' intercept='-0.12'/%3E%3C/feComponentTransfer%3E%3CfeComposite operator='in' in2='SourceGraphic'/%3E%3C/filter%3E%3Crect width='120' height='40' fill='white' filter='url(%23s)'/%3E%3C/svg%3E");
  mask-size: cover;
}

/* --- 책상 메모지 (팁/상세) --- */
.archive-note {
  background: linear-gradient(176deg, #cfc8b6, #b8b09c);
  color: var(--archive-ink);
  font-family: var(--font-family-archive);
  font-size: 0.76rem;
  line-height: 1.55;
  padding: 0.6rem 0.75rem;
  border-radius: 1px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45);
  transform: rotate(0.8deg);
}

/* --- 자원 꼬리표 (사진에 매달린 태그) --- */
.archive-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.18rem 0.5rem;
  background: #cfc8b6;
  border: 1px solid rgba(43, 40, 35, 0.25);
  border-radius: 2px;
  color: var(--archive-ink);
  font-family: var(--font-family-archive);
  font-size: 0.74rem;
  font-weight: 700;
}
.archive-tag > img { width: 1rem; height: 1rem; filter: grayscale(0.5) sepia(0.15); }

/* --- 아카이브 고스트 버튼(상태 보기 등 비-물건 액션) --- */
.archive-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid rgba(217, 211, 197, 0.28);
  border-radius: 3px;
  background: rgba(217, 211, 197, 0.06);
  color: var(--archive-paper);
  font-family: var(--font-family-archive);
  font-size: 0.8rem;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.archive-tool-btn:hover { background: rgba(217, 211, 197, 0.14); }
.archive-tool-btn:focus-visible { outline: 2px solid var(--archive-silver); outline-offset: 2px; }

/* 모바일: 카드 폭 전환 */
@media (max-width: 767px) {
  .archive-photo-frame { min-height: 7rem; }
}
```

- [ ] **Step 2: index.tsx import 체인에 등록** — `import './styles/components/components-07.css';` 다음 줄에:

```tsx
import './styles/components/components-08-archive.css'; // 아카이브 아트 디렉션(.archive-* 격리 네임스페이스)
```

- [ ] **Step 3: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add src/styles/components/components-08-archive.css src/index.tsx
git commit -m "feat(archive): .archive-* 스타일 레이어 — 절차적 텍스처·물리 연출 문법 (Phase 0)"
```

---

## Task 3: 공용 컴포넌트 4종

**Files:**
- Create: `src/components/archive/ArchiveSurface.tsx`
- Create: `src/components/archive/ArchiveCard.tsx`
- Create: `src/components/archive/ArchiveStamp.tsx`
- Create: `src/components/archive/ArchiveCaption.tsx`

- [ ] **Step 1: ArchiveSurface** — `src/components/archive/ArchiveSurface.tsx`:

```tsx
import React from 'react';

interface ArchiveSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

// 책상 표면 + 비네팅 + 필름 그레인. 모든 아카이브 화면의 최외곽 래퍼.
const ArchiveSurface: React.FC<ArchiveSurfaceProps> = ({ children, className = '', ...props }) => (
  <div {...props} className={`archive-surface ${className}`}>
    {children}
    <div className="archive-grain" aria-hidden="true" />
  </div>
);

export default ArchiveSurface;
```

- [ ] **Step 2: ArchiveCard** — `src/components/archive/ArchiveCard.tsx`:

```tsx
import React from 'react';

type ArchiveCardProps = {
  children: React.ReactNode;
  className?: string;
  /** 떨어지는 등장 연출(reducedMotion 시 CSS 가드가 자동 생략) */
  dealt?: boolean;
  /** 인화지 기울기 각도(도). 카드마다 다르게 줘 손으로 놓은 느낌. */
  tilt?: number;
} & (
  | ({ interactive: true } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  | ({ interactive?: false } & React.HTMLAttributes<HTMLElement>)
);

// 인화지 카드. interactive=true면 카드 전체가 <button>(접근성 불변 조항).
const ArchiveCard: React.FC<ArchiveCardProps> = ({ children, className = '', dealt = false, tilt, ...rest }) => {
  const classes = `archive-card ${dealt ? 'is-dealt' : ''} ${className}`;
  const style = tilt !== undefined ? ({ '--archive-tilt': `${tilt}deg` } as React.CSSProperties) : undefined;

  if ('interactive' in rest && rest.interactive) {
    const { interactive: _interactive, ...buttonProps } = rest;
    return (
      <button type="button" {...(buttonProps as React.ButtonHTMLAttributes<HTMLButtonElement>)} className={classes} style={style}>
        {children}
      </button>
    );
  }
  const { interactive: _interactive, ...sectionProps } = rest as { interactive?: false } & React.HTMLAttributes<HTMLElement>;
  return (
    <section {...sectionProps} className={classes} style={style}>
      {children}
    </section>
  );
};

export default ArchiveCard;
```

- [ ] **Step 3: ArchiveStamp** — `src/components/archive/ArchiveStamp.tsx`:

```tsx
import React from 'react';

interface ArchiveStampProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

// 잉크 도장 라벨 — 배지/uppercase 칩의 아카이브 대체물.
const ArchiveStamp: React.FC<ArchiveStampProps> = ({ children, className = '', ...props }) => (
  <span {...props} className={`archive-stamp ${className}`}>
    {children}
  </span>
);

export default ArchiveStamp;
```

- [ ] **Step 4: ArchiveCaption** — `src/components/archive/ArchiveCaption.tsx`:

```tsx
import React from 'react';

interface ArchiveCaptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  sub?: boolean;
}

// 타자기 캡션 — 사진/물건 밑의 기록 텍스트.
const ArchiveCaption: React.FC<ArchiveCaptionProps> = ({ children, sub = false, className = '', ...props }) => (
  <p {...props} className={`archive-caption ${sub ? 'archive-caption-sub' : ''} ${className}`}>
    {children}
  </p>
);

export default ArchiveCaption;
```

- [ ] **Step 5: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음. (컴포넌트 단위 테스트는 없음 — vitest는 node 환경 `.ts` 전용이라 .tsx 테스트 인프라가 없다. 검증은 Task 6의 e2e + 캡처가 담당.)

- [ ] **Step 6: Commit**

```bash
git add src/components/archive/
git commit -m "feat(archive): ArchiveSurface/Card/Stamp/Caption 공용 컴포넌트 (Phase 0)"
```

---

## Task 4: 텍스처 생성 스크립트 (best-effort — 실패해도 슬라이스 진행)

**Files:**
- Create: `scripts/generate-archive-textures.mjs`
- Create(산출물): `public/assets/archive/desk-surface.webp`, `public/assets/archive/photo-paper.webp`
- Modify(성공 시): `src/styles/tokens.css`의 `--archive-desk-image`/`--archive-paper-image`

- [ ] **Step 1: 스크립트 작성** — `scripts/generate-archive-textures.mjs`:

```js
// 아카이브 텍스처 생성 — Gemini 이미지 모델(gemini-2.5-flash-image)로 책상/인화지
// 텍스처를 생성해 WebP로 변환한다. GEMINI_API_KEY는 .env.local에서 읽는다.
// 실패는 치명적이지 않다: CSS 절차적 폴백(--archive-*-image: none)이 그대로 동작.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outDir = path.join(root, 'public', 'assets', 'archive');
const tmpDir = path.join(root, '.tmp', 'archive-textures');

const readApiKey = () => {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return null;
  const match = fs.readFileSync(envPath, 'utf8').match(/^GEMINI_API_KEY\s*=\s*(.+)$/m);
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
};

const TEXTURES = [
  {
    name: 'desk-surface',
    prompt: 'Top-down photograph texture of a dark aged wooden archivist desk surface, '
      + 'worn matte black-brown wood with subtle scratches and ink stains, lit by a single warm '
      + 'desk lamp from the top, heavy vignette toward edges, monochrome near-black palette, '
      + 'no objects, no text, seamless feel, photographic grain',
  },
  {
    name: 'photo-paper',
    prompt: 'Flat scan texture of blank aged silver gelatin photo paper, warm grey off-white, '
      + 'subtle paper fiber and chemical staining at edges, slightly darker corners, '
      + 'monochrome, no text, no objects, full-bleed texture',
  },
];

const apiKey = readApiKey();
if (!apiKey) {
  console.error('SKIP: GEMINI_API_KEY 없음(.env.local) — 절차적 폴백 유지');
  process.exit(2);
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

let generated = 0;
for (const { name, prompt } of TEXTURES) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    },
  );
  if (!res.ok) {
    console.error(`FAIL ${name}: HTTP ${res.status} ${await res.text()}`);
    continue;
  }
  const payload = await res.json();
  const part = payload?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) {
    console.error(`FAIL ${name}: 응답에 이미지 없음`);
    continue;
  }
  const pngPath = path.join(tmpDir, `${name}.png`);
  fs.writeFileSync(pngPath, Buffer.from(part.inlineData.data, 'base64'));

  const webpPath = path.join(outDir, `${name}.webp`);
  const ffmpeg = spawnSync('ffmpeg', ['-y', '-i', pngPath, '-c:v', 'libwebp', '-quality', '80', webpPath], { stdio: 'inherit' });
  if (ffmpeg.status !== 0) {
    console.error(`FAIL ${name}: ffmpeg WebP 변환 실패`);
    continue;
  }
  const kb = Math.round(fs.statSync(webpPath).size / 1024);
  console.log(`OK ${name}.webp (${kb} KB)`);
  generated += 1;
}

console.log(`done: ${generated}/${TEXTURES.length} 생성`);
process.exit(generated > 0 ? 0 : 1);
```

- [ ] **Step 2: 실행**

Run: `node scripts/generate-archive-textures.mjs`
Expected(성공): `public/assets/archive/desk-surface.webp`, `photo-paper.webp` 생성, 각 200KB 이하 권장.
Expected(실패/키 없음): exit 1 또는 2 — **이 경우 Step 3을 건너뛰고 Step 4로**. 절차적 폴백으로 슬라이스를 진행하고, 게이트 리뷰에서 텍스처 품질을 함께 판정받는다.

- [ ] **Step 3: (성공 시에만) tokens.css 변수 교체**

찾기:
```css
  --archive-desk-image:  none;
  --archive-paper-image: none;
```
교체:
```css
  --archive-desk-image:  url('/assets/archive/desk-surface.webp');
  --archive-paper-image: url('/assets/archive/photo-paper.webp');
```
> 주의: 이 프로젝트는 base path 배포(`/monochrome-the-eclipse/`)를 쓰므로 CSS의 절대경로 `/assets/...`는 깨진다. 실제로는 **상대 참조가 필요** — tokens.css는 `src/styles/`에 있으므로 `url('../../public/assets/archive/desk-surface.webp')`가 아니라 Vite public 규칙상 `url('/assets/archive/desk-surface.webp')`를 쓰되, **빌드 후 `npm run check:pages-base` 통과를 반드시 확인**한다. 실패하면 텍스처 적용을 컴포넌트 인라인 스타일(`assetCssUrl('assets/archive/desk-surface.webp')` — `src/utils/assetPath.ts`의 기존 헬퍼, CombatRewardScreen.tsx:51이 사용 중인 패턴)로 옮기고 tokens 변수는 none으로 되돌린다.

- [ ] **Step 4: dist 예산 확인 포함 빌드**

Run: `npm run build` 그리고 `npm run check:dist`
Expected: 통과(WebP는 PNG 예산 비대상, 총량 15MB 이내).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-archive-textures.mjs public/assets/archive/ src/styles/tokens.css
git commit -m "feat(archive): Gemini 텍스처 생성 스크립트 + 책상/인화지 텍스처 (best-effort)"
```

---

## Task 5: CombatRewardScreen 아카이브 전환

**Files:**
- Modify: `src/screens/CombatRewardScreen.tsx` (전면 교체)

- [ ] **Step 1: 화면 교체** — `src/screens/CombatRewardScreen.tsx` 전체를 아래로 교체:

```tsx
import React, { useState } from 'react';
import { UserRoundSearch } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import RunStatusModal from '../components/RunStatusModal';
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveCard from '../components/archive/ArchiveCard';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import ArchiveCaption from '../components/archive/ArchiveCaption';
import { assetPath } from '../utils/assetPath';
import { playGameSfx, playUiSound } from '../utils/sound';
import { playerSkillUnlocks } from '../data/dataSkills';
import { patternUpgrades } from '../data/dataUpgrades';
import { getRewardIconPath } from '../utils/resourceAssets';
import EffectSummary from '../components/EffectSummary';
import { summarizeDescription } from '../utils/effectSummary';
import type { CombatRewardChoice } from '../utils/combatRewards';

const getRewardChoiceCue = (choice: CombatRewardChoice) => {
  if (choice.secretTechniqueId) return '월식 보스 보상: 비기 3개 중 1개를 확정';
  if (choice.skillId) return '기술 슬롯을 바꿔 전투 선택지 확장';
  if (choice.passiveId) return '자동 효과를 추가해 빌드 강화';
  if (choice.rewards.reserveCoin) return '다음 전투의 동전 사고를 줄이기';
  if ((choice.rewards.memoryPieces ?? 0) > 0) return '영구 성장 자원 확보';
  if ((choice.rewards.senseFragments ?? 0) > 0) return '족보 강화 재료 확보';
  return '자원을 고르게 챙기는 안정 선택';
};

const rewardEntryLabel = (key: string) =>
  key === 'echoRemnants' ? '에코'
    : key === 'senseFragments' ? '감각'
      : key === 'memoryPieces' ? '기억'
        : '예비 동전';

// 사진별 기울기 — 손으로 책상에 놓은 느낌(균일하면 그리드로 보인다).
const CARD_TILTS = [-1.4, 0.9, -0.6];

export const CombatRewardScreen = () => {
  const pendingCombatReward = useGameStore(state => state.pendingCombatReward);
  const claimCombatReward = useGameStore(state => state.claimCombatReward);
  const gameOptions = useGameStore(state => state.gameOptions);
  const player = useGameStore(state => state.player);
  const [isRunStatusOpen, setIsRunStatusOpen] = useState(false);

  if (!pendingCombatReward) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        보상 데이터를 불러오는 중...
      </main>
    );
  }

  const claimReward = (choiceId: string) => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    playGameSfx(gameOptions.soundEnabled, 'rewardItem');
    claimCombatReward(choiceId);
  };

  return (
    <ArchiveSurface className="combat-reward-screen overflow-hidden p-4 sm:p-6">
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col justify-center gap-6">
        {/* 책상 위 기록 도장 — 배지/타이틀/설명문의 다이어제틱 대체물 */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <ArchiveStamp>「{pendingCombatReward.enemyName}」의 기록 — 하나를 보관한다</ArchiveStamp>
          <button
            type="button"
            className="archive-tool-btn"
            onClick={() => {
              playUiSound(gameOptions.soundEnabled, 'select');
              setIsRunStatusOpen(true);
            }}
          >
            <UserRoundSearch className="h-4 w-4" />
            현재 상태
          </button>
        </header>

        {/* 책상 위에 떨어진 사진 3장 */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pendingCombatReward.choices.map((choice, index) => {
            const rewardEntries = Object.entries(choice.rewards).filter(([, value]) => value);
            const skillReward = choice.skillId && player
              ? playerSkillUnlocks[player.class]?.[choice.skillId]
              : null;
            const passiveReward = choice.passiveId && player
              ? patternUpgrades[player.class]?.[choice.passiveId]
              : null;
            const subjectIconPath = rewardEntries.length > 0
              ? getRewardIconPath(rewardEntries[0][0])
              : null;

            return (
              <div key={choice.id} className="group relative">
                <ArchiveCard
                  interactive
                  dealt
                  tilt={CARD_TILTS[index % CARD_TILTS.length]}
                  data-testid={`reward-photo-${index}`}
                  aria-label={`${choice.label} — ${getRewardChoiceCue(choice)}`}
                  onClick={() => claimReward(choice.id)}
                  className="w-full"
                >
                  <div className="archive-photo-frame">
                    {subjectIconPath ? (
                      <img src={assetPath(subjectIconPath)} alt="" loading="lazy" />
                    ) : (
                      <span className="font-bold text-4xl" style={{ color: 'var(--archive-silver)' }}>※</span>
                    )}
                  </div>
                  <ArchiveCaption>
                    <strong>{choice.label}</strong>
                  </ArchiveCaption>
                  <ArchiveCaption sub>{getRewardChoiceCue(choice)}</ArchiveCaption>
                  {rewardEntries.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {rewardEntries.map(([key, value]) => {
                        const iconPath = getRewardIconPath(key);
                        return (
                          <span key={key} className="archive-tag">
                            {iconPath && <img src={assetPath(iconPath)} alt="" loading="lazy" />}
                            {rewardEntryLabel(key)} {typeof value === 'boolean' ? '+1' : `+${value}`}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </ArchiveCard>

                {/* 끼워진 메모지 — 스킬/패시브 상세는 호버/포커스 시에만(평시 장면 유지) */}
                {(skillReward || passiveReward) && (
                  <div className="archive-note pointer-events-none absolute left-2 right-2 top-full z-20 mt-2 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                    {skillReward && (
                      <>
                        <strong>기술 · {skillReward.name}</strong>
                        <EffectSummary
                          summary={summarizeDescription(skillReward.description)}
                          compact
                          hideHeadline
                          chipLimit={4}
                          showCue
                          cueLabel="판단"
                        />
                      </>
                    )}
                    {passiveReward && (
                      <>
                        <strong>패시브 · {passiveReward.name}</strong>
                        <EffectSummary
                          summary={summarizeDescription(passiveReward.description)}
                          compact
                          hideHeadline
                          chipLimit={4}
                          showCue
                          cueLabel="역할"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 책상 모서리 메모지로 강등된 팁 */}
        <aside className="archive-note max-w-md self-end">
          보상은 자동 지급되지 않는다. 체력이 넉넉하면 성장 자원을, 다음 전투가 불안하면
          즉시 전투력을 보강할 기록을 보관할 것.
        </aside>
      </section>

      <RunStatusModal isOpen={isRunStatusOpen} onClose={() => setIsRunStatusOpen(false)} />
    </ArchiveSurface>
  );
};
```

> 보존 확인: 루트에 `combat-reward-screen` 클래스 유지(e2e 의존). `claimCombatReward`/사운드/스킬·패시브 데이터 조회 로직 무변경. 정보 손실 없음 — 타이틀/설명문의 정보는 도장 문구로, "선택 이유"는 캡션으로, 상세는 메모지로 이동.

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음. (미사용이 된 import — `Panel`, `ActionButton`, `assetCssUrl`, `ArrowRight`, `Sparkles` — 가 새 코드에 없는지 확인. tsconfig에 noUnusedLocals가 없어 typecheck가 못 잡으므로 육안 확인 필수.)

- [ ] **Step 3: Commit**

```bash
git add src/screens/CombatRewardScreen.tsx
git commit -m "feat(archive): 보상 화면 다이어제틱 전환 — 책상 위 사진 3장 (Phase 1 슬라이스)"
```

---

## Task 6: 검증 + 게이트 제출

- [ ] **Step 1: 전체 체크**

Run: `npm run check`
Expected: 통과 (252+ 테스트, typecheck, build, dist 예산, no-e2e-hooks).

- [ ] **Step 2: e2e + 스크린샷**

Run: `npm run e2e`
Expected: `"ok": true`. `output/e2e/desktop-reward.png`, `output/e2e/mobile-reward.png` 생성 — 책상 표면 + 사진 3장 + 도장 헤더가 보여야 함.

- [ ] **Step 3: reducedMotion 수동 확인**

`npm run dev` → 옵션에서 reducedMotion ON → REWARD 진입(전투 승리 또는 dev 샌드박스): 카드 낙하/스윕 연출이 생략되고 즉시 표시되는지 확인.

- [ ] **Step 4: 게이트 제출 (사람)**

`output/e2e/desktop-reward.png`/`mobile-reward.png`를 사용자에게 제시하고 육안 승인 요청. **승인 전 다른 화면 확산 작업 착수 금지**(스펙 §4 Phase 1 게이트). 거부 시: 텍스처/토큰(Task 1·4)만 교체 후 재캡처.

- [ ] **Step 5: 게이트 통과 시 Commit(잔여 변경분) + 종료**

```bash
git status --short   # 잔여 변경 확인 후
git add -A && git commit -m "chore(archive): Phase 1 게이트 캡처 검증 잔여 정리"
```

---

## Self-Review (작성자 체크)

**1. 스펙 커버리지:** §2 재질(절차적+비트맵 텍스처·그레인) ✅ Task 2·4 / §2.3 타이포(archive 서체 토큰, display 토큰 불간섭) ✅ Task 1 / §2.4 물리 문법+reducedMotion ✅ Task 2(CSS 가드) / §2.5 접근성(카드=button, aria-label, focus-visible) ✅ Task 3·5 / §3.1 보상 화면 3줄 의도 전부 ✅ Task 5 / §4 Phase 0·1 + 게이트 ✅ Task 6.

**2. 플레이스홀더 스캔:** 전 코드 단계 실제 코드 포함. "적절히" 류 없음 ✅. Task 4는 의도된 best-effort 분기(실패 경로 명시) ✅.

**3. 타입/이름 일관성:** `--archive-*` 토큰명(Task 1) = CSS 사용처(Task 2) 일치 ✅. `ArchiveCard`의 `interactive`/`dealt`/`tilt` props(Task 3) = Task 5 사용 일치 ✅. `archive-tool-btn`/`archive-note`/`archive-tag`/`archive-photo-frame` 클래스(Task 2) = Task 5 사용 일치 ✅.

**알려진 잔여 위험:**
- fontsource 한글 서브셋의 dist 용량(2웨이트 ≈ 1~3MB 추정) — `check:dist` 실패 시 700 웨이트 제거(굵기는 합성 볼드로).
- Gemini 텍스처의 타일링/품질 비결정성 — Task 4 실패 경로가 방화벽.
- 호버 메모지(`archive-note` absolute)가 그리드 다음 행 카드와 겹칠 수 있음 — z-20으로 위에 뜨지만, 게이트 캡처에서 확인하고 거슬리면 카드 내부 확장형으로 전환(디테일 자유 영역).
