<div align="center">

# Monochrome: The Eclipse

**동전을 굴려라. 패턴이 곧 검이 된다.**

일식 이후 어긋난 감각의 세계 — 5개의 동전, 6가지 패턴, 끝없이 다시 시작되는 잔향.
턴제 로그라이트 RPG 프로토타입.

[![Play Demo](https://img.shields.io/badge/▶_Play_Demo-Live-success?style=for-the-badge)](https://team-project-0-1.github.io/monochrome-the-eclipse/)
[![Status](https://img.shields.io/badge/Status-Prototype_v0.1-orange?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/License-Proprietary-lightgrey?style=for-the-badge)](#라이선스)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-5-000?logo=react&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-0055FF?logo=framer&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&logoColor=white)

</div>

<!-- 메인 히어로 스크린샷: 전투 중 동전 5개와 감지된 패턴, 적 의도가 한 화면에 보이는 컷을 권장. 파일: docs/screenshots/combat-hero.png -->
[![전투 화면 — 동전 5개, 감지된 패턴, 적 의도와 예측 피해가 한눈에 보이는 핵심 루프](docs/screenshots/combat-hero.png)](https://team-project-0-1.github.io/monochrome-the-eclipse/)

---

## 목차

- [지금 플레이하기](#지금-플레이하기)
- [왜 이 프로젝트인가](#왜-이-프로젝트인가)
- [게임 소개](#게임-소개)
- [한 턴에 일어나는 일](#한-턴에-일어나는-일)
- [런 흐름](#런-흐름)
- [빠른 시작](#빠른-시작)
- [프로젝트 구조](#프로젝트-구조)
- [아키텍처 & 구현 노트](#아키텍처--구현-노트)
- [검증 파이프라인](#검증-파이프라인)
- [환경 변수 & 배포](#환경-변수--배포)
- [추가 문서](#추가-문서)
- [기술 스택 요약](#기술-스택-요약)
- [라이선스](#라이선스)

---

## 지금 플레이하기

**▶ [team-project-0-1.github.io/monochrome-the-eclipse](https://team-project-0-1.github.io/monochrome-the-eclipse/)**

별도 설치 없이 브라우저에서 바로 플레이 가능합니다. 플레이 가능 범위는 스테이지 1 ~ 3 (보스 처치 + 비기 보상 3선택까지)입니다.

> **공개 라벨**: `Prototype v0.1` — 포트폴리오/프로토타입 공개용 빌드입니다. 유료 1.0 상업 출시가 아니라 핵심 전투 루프 · 비주얼 방향 · 운영 디스크플린을 증명하는 빌드라는 점을 명시해 둡니다.

---

## 왜 이 프로젝트인가

**Monochrome: The Eclipse**는 단순한 게임이 아니라, "운영 가능한 프로토타입은 어떻게 생겨야 하는가"를 증명하는 빌드입니다.

- **핵심 전투 루프의 완결성** — 동전 → 패턴 → 스킬 → 적 의도 비교로 이어지는 예측 가능한 의사결정 사이클을 한 턴 안에 압축.
- **확장 가능한 상태 아키텍처** — Zustand 6슬라이스 + Immer로 도메인을 분리, 런 복구·이벤트 분기·상태이상 시스템이 같은 어휘를 공유.
- **단일 진실 원칙(SSoT)** — `tokens.css`(디자인)와 `ui-copy-guide.md`(카피)가 일관성을 자동 검증.
- **3계층 검증 파이프라인** — PR 머지 / 일반 릴리스 / 프로토타입 공개 빌드가 각자 다른 게이트를 통과.
- **외부 런타임 종속 없음** — 클라이언트 단독 동작, 키 없이 빌드, 정적 호스팅으로 배포.

채용 담당자·리뷰어에게: 이 README는 코드를 열기 전에도 시스템 전체 구조를 파악할 수 있도록 작성되었습니다.

---

## 게임 소개

`일식(Eclipse)` 이후 감각이 어긋난 세계에서, 네 명의 인물이 각자 다른 감각으로 잔향을 추적합니다.

| 캐릭터 | 시그니처 | 핵심 효과 | 입문 난이도 |
|---|---|---|---|
| 김훈희 (Warrior) | 청각 · 공명파의 기술자 | 증폭(AMPLIFY) / 공명(RESONANCE) | 쉬움 |
| 신제우 (Rogue) | 후각 · 잔향을 추적하는 자 | 추적(PURSUIT) / 출혈(BLEED) | 보통 |
| 곽장환 (Tank) | 촉각 · 철벽으로 버티는 자 | 반격(COUNTER) / 분쇄(SHATTER) | 보통 |
| 박재석 (Mage) | 영적 · 마력의 시야를 보는 자 | 저주(CURSE) / 봉인(SEAL) | 어려움 |

### 한 턴에 일어나는 일

1. **동전 5개 던지기** — 각 동전은 앞면(공격)/뒷면(방어) 중 하나.
2. **패턴 감지** — 같은 면이 모이면 PAIR(2), TRIPLE(3), QUAD(4), PENTA(5)가 자동 검출됩니다. 캐릭터별 UNIQUE / AWAKENING 패턴도 별도 조건으로 활성화.
3. **스킬 선택** — 감지된 패턴 위에 해금된 스킬을 얹어 발동. 예측 패널이 예상 피해/방어를 미리 보여줍니다.
4. **적 의도 비교** — 적은 다음 행동을 예고합니다(공격 / 디버프 / 패시브 발동 등). 예측을 바탕으로 어떤 패턴을 우선 쓸지 결정.
5. **턴 종료** — 상태이상(공명/출혈/저주/추적 등) 처리 → 다음 턴.

### 런 흐름

```
캐릭터 선택 → 탐험(노드 선택) → [전투 / 이벤트 / 상점 / 휴식] 반복 → 미니보스 → 스테이지 클리어
→ 다음 스테이지 → ... → 스테이지 3 보스 → 비기 보상 3선택 → 승리
```

게임을 도중에 닫아도 다음 실행 시 `이어하기`로 마지막 상태에서 복구됩니다 (전투 한복판, 이벤트 분기, 보상 대기 모두 지원).

### 스크린샷

<!-- 갤러리 스크린샷은 docs/screenshots/ 폴더에 아래 파일명 그대로 저장하면 자동 표시됩니다.
     character-select.png · exploration.png · event.png -->

| 캐릭터 선택 | 탐험 (스테이지 노드) | 이벤트 분기 |
|---|---|---|
| ![캐릭터 선택 — 4명의 라인업과 캐릭터별 시그니처](docs/screenshots/character-select.png) | ![탐험 — 노드 기반 스테이지 라우팅](docs/screenshots/exploration.png) | ![이벤트 — 분기 선택과 결과 패널](docs/screenshots/event.png) |

---

## 빠른 시작

```powershell
npm install
npm run dev          # Vite 개발 서버 — http://127.0.0.1:5173/
```

요구 사항: **Node 22.22.0 이상** (Browser Use / Codex 자동화 호환).

빌드와 미리보기:

```powershell
npm run build        # dist/ 생성
npm run preview      # 빌드 결과 미리보기
```

---

## 프로젝트 구조

저장소 루트가 곧 앱 루트입니다(2026-05-26 평탄화 이후 별도 하위 폴더 없음).

```
.
├─ App.tsx                  # 게임 상태(GameState)에 따라 화면 라우팅
├─ index.tsx                # React 엔트리
├─ types.ts                 # 핵심 enum/인터페이스 (GameState, CoinFace, PatternType, …)
├─ constants.ts             # 동전 수, 턴 기준 등 게임 상수
│
├─ screens/                 # GameState별 최상위 화면
│   ├─ MenuScreen.tsx
│   ├─ CharacterSelectScreen.tsx
│   ├─ ExplorationScreen.tsx
│   ├─ CombatScreen.tsx
│   ├─ EventScreen.tsx · ShopScreen.tsx · RestScreen.tsx
│   ├─ CombatRewardScreen.tsx · MemoryAltarScreen.tsx
│   └─ StageClearScreen.tsx · GameOverScreen.tsx · VictoryScreen.tsx
│
├─ components/              # 재사용 UI
│   ├─ combat/              #   전투 HUD: IntelPanel, OutcomeRail, Sprites, MobileHud …
│   ├─ modals/              #   SkillReplacementModal 등
│   └─ ui/                  #   GameShell, Panel, ScreenHeader
│
├─ store/                   # Zustand 슬라이스 아키텍처
│   ├─ gameStore.ts         #   슬라이스 조립 + persist + 런 복구
│   └─ slices/
│       ├─ metaSlice.ts        # 메타 진행도 (영구 저장)
│       ├─ playerSlice.ts      # 플레이어, 자원, 해금 패턴
│       ├─ explorationSlice.ts # 스테이지 노드, 라우트 시드
│       ├─ combatSlice.ts      # 동전, 패턴, 적, 예측, 전투 로그
│       ├─ eventSlice.ts       # 이벤트 분기/결과
│       └─ uiSlice.ts          # 모달, 효과, 옵션, 튜토리얼 플래그
│
├─ data/                    # 데이터 드리븐 콘텐츠 (TypeScript)
│   ├─ dataCharacters.ts    #   4종 캐릭터 정의
│   ├─ dataSkills.ts        #   스킬 + 패턴 매핑
│   ├─ dataMonsters.ts      #   적 + 페이즈 + 패시브
│   ├─ dataEvents.ts        #   이벤트 시나리오
│   ├─ dataShop.ts · dataUpgrades.ts
│   └─ dataStages.ts
│
├─ utils/                   # 순수 로직 (UI 비의존)
│   ├─ combatLogic.ts       #   피해/방어/상태이상 계산, 적 AI
│   ├─ gameLogic.ts         #   동전 생성, 패턴 검출
│   ├─ combatPresentation.ts · effectSummary.ts
│   ├─ stageProgression.ts · eventScenes.ts
│   ├─ contentValidation.ts #   passive/문구 무결성 검사
│   ├─ audioManager.ts · audioManifest.ts · sound.ts
│   └─ assetPath.ts         #   배포 base-path 분기
│
├─ styles/
│   └─ tokens.css           # 색 · 공간 · z-index · 모션 디자인 토큰 (단일 진실)
│
├─ docs/                    # 제품/운영/콘텐츠 문서 (아래 "추가 문서" 참조)
├─ scripts/                 # 검증·번들·자산 최적화 Node 스크립트
└─ public/                  # 정적 자산 (캐릭터, 적, UI 아이콘 등)
```

---

## 아키텍처 & 구현 노트

### 상태: Zustand × 슬라이스 × Immer

`store/gameStore.ts`가 6개 슬라이스(`meta`/`player`/`exploration`/`combat`/`event`/`ui`)를 하나의 스토어로 조립합니다. 각 슬라이스는 자기 도메인의 상태 + 액션만 노출하고, 액션 내부에선 Immer `produce`로 불변 업데이트를 작성합니다.

```ts
// store/gameStore.ts (요약)
export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      (set, get, api) => ({
        ...createMetaSlice(set, get, api),
        ...createPlayerSlice(set, get, api),
        ...createExplorationSlice(set, get, api),
        ...createCombatSlice(set, get, api),
        ...createEventSlice(set, get, api),
        ...createUiSlice(set, get, api),
        // ...
      }),
      { name: 'monochrome-the-eclipse-save', /* partialize, merge, migrate */ }
    )
  )
);
```

### 런 복구: `normalizeHydratedState`

`localStorage`에서 상태를 복원할 때 단순히 그대로 주입하지 않고, **현재 진행 위치를 다시 추론**합니다.

- 전투 중이었지만 적이 죽어 있다면 → 보상 화면으로.
- 이벤트가 살아있다면 → 이벤트 화면으로.
- HP가 0이면 → 게임오버.
- 어느 것도 아니면 → 마지막 안전한 화면(메뉴/캐릭터 선택).

복구된 화면은 `resumeGameState`에 저장되고, 메뉴의 `이어하기` 버튼이 그 지점으로 사용자를 다시 데려갑니다.

### 전투 시스템: 동전 → 패턴 → 스킬

- `utils/gameLogic.ts`의 `generateCoins`가 동전 5개를 생성하고, `detectPatterns`가 같은 면 카운트로 PAIR/TRIPLE/QUAD/PENTA를 만듭니다.
- 캐릭터마다 잠금 해제 가능한 **UNIQUE / AWAKENING 패턴**이 별도로 존재합니다(예: 교대 패턴, 단일 면 1개 조합).
- `utils/combatLogic.ts`가 선택된 패턴 → 스킬 효과(`AbilityEffect`) → 피해/방어/상태이상 변화를 계산합니다. 적 패시브(예: `PASSIVE_CHOIR_ECLIPSE_PHENOMENON`)는 동일 파이프라인에서 훅 형태로 끼어듭니다.
- 모든 상태이상은 `StatusEffectType`(`AMPLIFY`, `RESONANCE`, `MARK`, `BLEED`, `COUNTER`, `SHATTER`, `CURSE`, `SEAL`, `PURSUIT`) enum 한 곳에서 관리되어 캐릭터/적/이벤트가 같은 어휘를 공유합니다.

### 화면 라우팅: 상태 머신

라우터 라이브러리 없이 `GameState` enum 한 변수로 화면을 스위칭합니다. `App.tsx`가 `useGameStore`를 구독하여 현재 enum 값에 맞는 화면 컴포넌트를 렌더링.

### 디자인 토큰 & 카피 가이드

UI 일관성은 두 개의 단일 진실(SSoT)이 책임집니다.

- `styles/tokens.css` — 모든 색/공간/z-index/모션 값. 컴포넌트는 raw hex/Tailwind 색을 쓰지 않고 `var(--color-…)` / `var(--z-…)` / `var(--motion-…)`만 참조.
- `docs/ui-copy-guide.md` — 모든 한국어 라벨/용어/톤. 영문 키커는 화이트리스트(`STAGE N`, `RUN`, `ROUTE`, `MODE`, `SCOPE`, `OPTIONS`, `AUDIO MIX`)만 허용.

이 규칙들은 `npm run check:text-integrity`로 자동 검증됩니다.

### 콘텐츠 데이터 드리븐

캐릭터·스킬·적·이벤트·상점이 모두 `data/*.ts`의 TypeScript 리터럴로 정의되어 enum/타입 체크가 콘텐츠 무결성을 그대로 보장합니다. 별도의 JSON 스키마 없이, 컴파일러가 곧 검증기.

---

## 검증 파이프라인

3계층으로 분리되어 있으며, PR 머지 / 일반 빌드 / 포트폴리오 공개 빌드가 각자 다른 게이트를 통과해야 합니다.

| 명령 | 포함 단계 | 언제 |
|---|---|---|
| `npm run check` | text-integrity · stage3-content · stage3-assets · exploration-route · typecheck · validate:passives · check:release-assets · build · check:dist | PR 머지 전 표준 게이트 |
| `npm run release:check` | check:asset-tooling · optimize:assets · security:audit + `check` | 일반 릴리스 빌드 |
| `npm run prototype:check` | `release:check` + check:prototype-readiness | 포트폴리오/프로토타입 공개 빌드 |

개별 명령:

```powershell
npm run typecheck             # TypeScript 타입체크
npm run check:text-integrity  # 한국어 카피 가이드 위반 검사
npm run validate:passives     # 적 패시브 시나리오 검증
npm run check:stage3-content  # 스테이지 3 콘텐츠 무결성
npm run check:dist            # 빌드 산출물 용량 예산
npm run security:audit        # npm audit (moderate 이상)
```

---

## 환경 변수 & 배포

배포 베이스 경로는 `VITE_BASE_PATH` 하나로 결정됩니다. 클라이언트 빌드에는 API 키를 주입하지 않습니다(키가 필요해지면 서버 사이드 엔드포인트 경유).

### Cloudflare Pages (권장)

```text
Framework preset:        Vite
Root directory:          .
Install command:         npm ci
Build command:           npm run prototype:check
Build output directory:  dist
Environment variable:    VITE_BASE_PATH=/
```

### GitHub Pages (대체 경로)

`.github/workflows/deploy.yml`이 `main` 푸시 시 `VITE_BASE_PATH=/monochrome-the-eclipse/`로 빌드해 자동 배포합니다.

로컬에서 동일하게 빌드하려면:

```powershell
$env:VITE_BASE_PATH="/monochrome-the-eclipse/"
npm run build
```

> 커밋 금지 항목: `.env.local`, 로컬 dev 서버 로그, 브라우저 스크린샷, Playwright MCP 산출물.

---

## 추가 문서

| 문서 | 내용 |
|---|---|
| `AGENTS.md` | AI 협업 가이드 (Codex / Claude Code / Cursor 공용 운영 규칙) |
| `docs/ui-copy-guide.md` | 한국어 라벨/용어/톤 단일 진실 |
| `styles/tokens.css` | 디자인 토큰 단일 진실 |
| `docs/design/prototype-product-brief.md` | 포트폴리오 포지셔닝 · 데모 스크립트 · 품질 기준 |
| `docs/design/stage-3-prd.md` | 스테이지 3 게이트/보스/보상 PRD |
| `docs/content/stage-3-content-brief.md` | 스테이지 3 콘텐츠 출처 원장 |
| `docs/content/content-source-ledger.md` | 자산/규칙의 기획서 매핑 |
| `docs/operations/prototype-operations-playbook.md` | 배포 · 스모크 · 모니터링 · 롤백 |
| `docs/release-direction-criteria.md` | 프로토타입 / Early Access / 1.0 기준선 |
| `docs/followup-backlog.md` | 미완 작업 · 회귀 위험 · 외부 이슈 추적 |

---

## 기술 스택 요약

- **React 19** + **TypeScript 5.8** + **Vite 6**
- **Zustand 5** + **Immer 10** — 슬라이스 기반 상태, persist 미들웨어
- **Framer Motion 11** — 화면 전환/전투 이펙트 (`reducedMotion` 가드 포함)
- **Lucide React** — 아이콘
- 외부 런타임 종속 없음 · 클라이언트 단독 동작 · 키 없이 빌드 가능

---

## 라이선스

© 2026 프로젝트 0.1% (기획 박재석 · 개발 김훈희). **All Rights Reserved**.

이 저장소의 모든 코드·디자인·이미지·사운드·텍스트는 팀에 귀속됩니다. 사전 문서 허가 없이 복제·재배포·파생·상업적 이용을 금합니다.

- **포트폴리오 열람**은 허용됩니다. 채용 담당자·리뷰어는 코드를 자유롭게 읽고 평가해 주세요.
- 재사용·인용 요청은 저장소 이슈로 문의.

### 자산 출처

이 프로젝트의 이미지·사운드 자산은 생성 AI 도구를 활용해 제작되었으며, 프롬프팅·큐레이션·후보정은 팀에서 직접 수행했습니다. 자산 출처와 권리 매핑은 [`docs/content/content-source-ledger.md`](./docs/content/content-source-ledger.md) 참조.

### 크레딧

- **기획·아이디어 원안** — 박재석
- **개발** — 김훈희
- **밸런스** — 박재석 · 김훈희 공동
