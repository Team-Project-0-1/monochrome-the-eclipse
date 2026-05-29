# 후속 작업 백로그 (Follow-up Backlog)

> 2026-05-25 UI/UX 점검 세션에서 발견했지만 이번에 손대지 않았거나, 일부만 손댄 항목, 그리고 기획서 대비 회귀/리스크가 있는 항목을 우선순위(P0~P3)로 정리.
> 모든 작업의 카피·용어·톤·색상 기준은 `docs/ui-copy-guide.md`, 디자인 토큰은 `src/styles/tokens.css`를 참조한다.

---

## P0 — ✅ 완료 (2026-05-26 세션)

### P0-1. 동전 색상 시스템을 토큰으로 단일화 ✅
- **완료**: tokens.css에 `.coin-face / .is-heads / .is-tails / .is-unknown` 시맨틱 클래스 추가. CoinDisplay의 raw Tailwind(`bg-red-500 border-red-300` 등)를 `coin-face is-heads/is-tails/is-unknown`으로 교체. 잠금 배지(`bg-gray-700 border-white`)도 `.coin-lock-badge` 토큰 클래스로.
- **단일 출처**: `src/styles/tokens.css` §"Coin face — 동전 본체 색상 단일 출처".
- **정책 전환 방법**: tokens.css의 `--color-face-heads/--color-face-tails` 값만 바꾸면 전 화면 일괄 반영.

### P0-2. ReserveCoinArea ✅ (데드 코드 삭제)
- **완료**: `components/ReserveCoinArea.tsx`는 어떤 파일에서도 import되지 않는 데드 코드. 동일 역할은 `components/combat/CombatControls.tsx`의 `ReserveCoinStrip`이 담당. 파일 삭제로 raw Tailwind 정리 작업 자체가 불필요해졌다.

### P0-3. 전투 보상 화면 `<details>` 펼침 ✅
- **완료**: `screens/CombatRewardScreen.tsx`의 `<details><summary>상세</summary><p>{choice.description}</p></details>`를 `<p className="combat-reward-choice-detail mt-2 ...">{choice.description}</p>` 인라인 노출로 변경. 3개 보상 카드의 설명이 동시에 보여 비교 동선 단순화.
- **부가 정리**: `index.css`의 `details > summary` 잔여 셀렉터 3개 블록 제거.

---

## P1 — 다음 다음 세션, 영향도 큼

### P1-0. 이미지 자산 폴더 통합 (3곳 분산 해소)
- **현재 상태**: 같은 종류 이미지가 3개 위치에 흩어져 있다.
  - `assets/monsters/{portraits,sprites}/` — 프로젝트 루트 (잔재 의심, 코드 참조 여부 확인 필요)
  - `public/assets/{audio,backgrounds,characters,icons,items,monsters}/` — 메인 사용처. 카테고리 정리는 잘 돼 있음
  - `public/sprites/{characters,monsters}/` — 추가 잔재
- **왜 문제**: 같은 이름의 파일이 중복 존재하면 어느 쪽이 단일 진실인지 모호. 빌드 시 둘 다 dist에 포함되어 사이즈 낭비. 새 자산 추가 시 어디에 둘지 매번 고민.
- **작업**:
  1. `assets/` (root)와 `public/sprites/` 내 파일을 grep으로 코드 참조 확인 (`Grep "assets/monsters" "public/sprites"`).
  2. 사용되지 않는 잔재라면 삭제.
  3. 둘 다 사용 중이면 `public/assets/` 하위로 통합 + 코드 import 경로 일괄 교체.
  4. `scripts/check-stage3-assets.mjs` 같은 자산 검증 스크립트도 새 경로로 갱신.
- **단일 출처 후 구조 (제안)**:
  ```
  public/assets/
    audio/
    backgrounds/
    characters/
      portraits/   ← 캐릭터 일러스트
      sprites/     ← 스프라이트시트
    icons/
      combat/
      status/
    items/
    monsters/
      portraits/
      sprites/
      stage2-generated/
      stage3-generated/
  public/
    icon-192.png, icon-512.png, mono.png ...  ← PWA 자산만 루트 유지
  ```
- **위험**: 250여개 파일과 다수 import. 한 PR로 큰 변경 → 별도 PR로 분리 진행 권장.

### P1-1. `index.css` 13,000줄 z-index 토큰 마이그레이션 (잔여 28종)
- **현재 상태**: TSX 3곳만 토큰 사용. `index.css`에는 여전히 `z-index: 70/76/85/100/101/2000` 등 raw 숫자.
- **작업**: 모든 `z-index: <num>;` 선언을 토큰 `var(--z-stage-*)`/`var(--z-hud)`/`var(--z-modal-*)` 등으로 교체. 6단계(아래 표) 매핑.

| 현재 값 범위 | 토큰 |
|---|---|
| 1~9 | `--z-stage-bg` ~ `--z-stage-fx` |
| 10~29 | `--z-stage-sprite`, `--z-stage-overlay` |
| 30~49 | `--z-stage-banner` |
| 50~69 | `--z-hud`, `--z-hud-raised` |
| 70~89 | `--z-tooltip`, `--z-coachmark` |
| 90~99 | `--z-focus-banner` |
| 100~199 | `--z-modal-backdrop`, `--z-modal`, `--z-modal-top` |
| 200+ | `--z-toast` |
| 2000 | `--z-modal-top` (combat-intel-modal 과도하므로 100~140로 정상화) |

### P1-2. HealthBar 완전 통합 (CombatOverheadVitals와 합치기)
- **현재 상태**: 색상은 토큰 공유 OK. 그러나 두 개의 독립 구현이 존재 — `CharacterStatus.tsx`(탐험 패널)는 `HealthBar.tsx` 사용, 전투 무대는 `CombatOverheadVitals` 사용.
- **작업**: `HealthBar.tsx`를 정식 컴포넌트로 두고 `CombatOverheadVitals`를 그 위에 작은 변형(슬림 헤드 + 짧은 트랙)으로 재작성. 또는 반대로.
- **검증**: 탐험 → 전투 진입 시 같은 시각 언어가 이어지는지.

### P1-3. S급 버그(상점/이벤트/휴식 UI 사라짐) 재현 검증 — ✅ 재현 불가 (2026-05-29)
- **결론**: 25.09.05 리액트 피드백 리포트의 "상점/이벤트/휴식 선택 시 UI가 사라지고 게임 진행이 멈춤" S급 버그는 **현재 코드에서 재현되지 않음**.
- **검증 방법**: dev 빌드에서 Zustand 스토어를 일시 노출(`window.__gameStore`, 검증 후 즉시 제거)하고 `setGameState`/`selectNode`로 SHOP·REST·EVENT에 직접 진입. 화면별 `#root` 렌더 여부 + console error 점검.
  - SHOP: 정상 렌더(보급소 UI 전체), console error 0.
  - REST: 정상 렌더(휴식처 UI), console error 0.
  - EVENT: 실제 이벤트(`event_supplies`) 로드 → 선택 → 결과 → 계속 → EXPLORATION 복귀까지 전 구간 정상, console error 0, 진행 멈춤 없음.
- **근본 원인(가설)**: 25.09.05 이후 대규모 리팩터링(데이터 폴더 이동, `src/` 채택, 각 화면 `if (!player)` 가드 추가 등) 과정에서 해소된 것으로 추정. App.tsx `renderGame()` default 케이스가 잘못된 상태에 "알 수 없는 화면 상태"를 표시하므로, 과거 "빈 화면"은 잘못된 상태가 아니라 렌더 예외(throw)였을 가능성이 큼.
- **회귀 방어 적용 완료(2026-05-29)**: App.tsx에 **Error Boundary 부재** 문제를 해소. `src/components/ErrorBoundary.tsx` 신규 추가 후 App.tsx에서 화면 트리(`renderGame()` 등)를 감쌈 → 어떤 화면에서든 렌더 예외가 나도 트리 전체 언마운트(=동일 "UI 사라짐") 대신 폴백 UI("메뉴로 돌아가기"/"새로고침")를 표시. dev에서 ShopScreen 강제 throw로 폴백 표시·메뉴 복구 검증 완료.

### P1-4. CharacterStatus의 사이드 톤 색상 토큰화
- **현재 상태**: `CharacterStatus.tsx`가 `bg-gray-800/90 border-blue-700/50 text-blue-100`(player) / `border-red-700/50`(enemy) 등 raw Tailwind 사용.
- **작업**: `--color-player`/`--color-enemy` 토큰으로 통일. body 클래스(reducedMotion 등)와의 호환 보장.

---

## P2 — 점진적 개선

### P2-1. `index.css`의 동일 셀렉터 4~5회 재정의 정리
- **현재 상태**: `.combat-bottom-hud`, `.combat-pattern-rail`, `.combat-stage` 등이 4~5회 재정의됨(코덱스가 같은 위치를 반복 패치한 흔적).
- **작업**: 중복 셀렉터 통합 또는 모듈 단위 파일로 분할(`styles/combat.css`, `styles/exploration.css` 등).
- **위험**: 한 번에 다 하면 회귀 위험 큼. 한 컴포넌트씩.

### P2-2. 캐릭터 선택 카드 비교 패널
- **현재 상태**: 4종 캐릭터를 한 눈에 비교하는 동선 없음. 카드 클릭이 즉시 선택으로 이어짐.
- **작업**: 카드 hover/focus 시 우측에 상세 비교 패널, 클릭은 "이 캐릭터로 시작" 명시 버튼으로 분리.

### P2-3. NodeSelection 위험/보상 정량화
- **현재 상태**: "위험 높음"/"기대 보상 에코 + 감각 조각" 등 정성적 라벨. 비교 어려움.
- **작업**: 평균 피해/평균 보상 수치 또는 5-점 척도(★~★★★★★) 표기.

### P2-4. 튜토리얼 코치마크 위치 동적 조정
- **현재 상태**: 코치마크가 고정 위치에 떠서 핵심 UI(캐릭터/적/카드)를 가린다(이번 전투 진입 시 화면 중앙을 덮음).
- **작업**: 화면 폭/높이에 따라 좌상단/우상단/하단 중 가장 덜 가리는 위치로 자동 배치. 또는 사용자가 드래그로 옮길 수 있게.

### P2-5. EventScreen `event-player-figure` 모바일 겹침
- **현재 상태**: 우하단 절대 위치라 모바일 좁은 화면에서 본문과 겹친다.
- **작업**: `(max-width: 767px)`에서 figure 숨김 또는 본문 아래로 이동.

### P2-6. RestScreen 3개 버튼 위계 강조
- **현재 상태**: 회복/제단/건너뛰기 3 버튼의 시각 위계가 거의 동일. 추천 동선이 약함.
- **작업**: 체력 % 기준으로 추천 버튼에 highlight + 보조 라벨("권장").

### P2-7. MemoryAltarScreen 다음 효과 차이 표시
- **현재 상태**: Lv.0 → Lv.1 강화 효과 차이가 보이지 않음.
- **작업**: "현재 +0 → 강화 후 +5" 식으로 명시.

---

## P3 — 장기 정리

### P3-1. `index.css` 모듈 분할
- **현재 상태**: 단일 파일 13,000줄.
- **작업**: `styles/base.css` (Tailwind preflight), `styles/combat.css`, `styles/exploration.css`, `styles/shop.css`, `styles/menu.css`로 분할. `tokens.css`는 이미 분리됨.

### P3-2. ✅ Tailwind 빌드 파이프라인 도입 (완료, 2026-05-29)
- **완료**: tailwindcss@3 + postcss + autoprefixer 도입. `src/index.css`는 `@tailwind` 디렉티브 엔트리로 전환되어 빌드 시 유틸리티가 재생성됨. 손글 컴포넌트 CSS는 `scripts/extract-handwritten-css.mjs`로 추출해 `src/styles/components.css`로 분리, index.tsx에서 마지막에 import(cascade 손글 우선). 중복이던 `tailwind-source.css`는 삭제.
- **잔여**: tokens.css 변수를 `theme.extend`로 노출해 `bg-face-heads` 같은 토큰 기반 유틸을 만드는 작업은 후속(선택).

### P3-3. 컬러 일렉트라/색맹 시뮬레이션 테스트
- **현재 상태**: 색 대비/색맹 환경 미검증.
- **작업**: Chrome DevTools의 Vision Deficiencies 시뮬레이션으로 protanopia/deuteranopia/tritanopia에서 게임 상태 구분 가능한지 확인.

### P3-4. 키보드 전체 내비게이션
- **현재 상태**: Enter 단축키 외엔 키보드 동선 미흡. 동전 슬롯에 tabIndex 부여는 추가했지만 다른 인터랙티브 요소(패턴 카드, 액티브 스킬, IntelBar 버튼)는 검증 필요.
- **작업**: 전 화면 Tab 순서 검토 + focus ring 정합성 + Enter/Space 동작 일관화.

### P3-5. 사운드 옵션 슬라이더 키보드 접근성
- **현재 상태**: `MenuScreen` 오디오 슬라이더는 `<details>`로 접혀 있어 키보드 사용자가 발견하기 어려움.
- **작업**: 항상 펼침 또는 명시적 토글 버튼.

---

## 회귀/리스크 (즉시 모니터)

### R-1. `CombatIntelBar` 슬림화 → 모바일 HUD 영향
- 이번 변경에서 `combat-intel-snapshot` 3개 블록을 제거했는데, `CombatMobileHud`는 별도로 `CombatMobileOutcomeSummary`를 가지므로 영향 없을 것으로 추정. 그러나 태블릿(768~1023px)에서 어떻게 보이는지 실기기 확인 필요.

### R-2. (i) 버튼 → 기존 모바일 long-press 사용자 학습
- long-press에 익숙한 기존 유저가 헷갈릴 수 있음. 첫 전투 튜토리얼 코치마크에 "(i) 버튼으로 상세 효과 확인" 안내 추가 고려.

### R-3. `useCombatEffectTimeline` reducedMotion 가드 → 시각적 피드백 부족
- reducedMotion 활성 시 카메라 셰이크/플래시가 0이 됨. 피격이 발생했는지 시각적 단서가 약해질 수 있음. 대안: 화면 가장자리에 짧은 outline pulse(non-spatial).

### R-4. `--color-face-*-alt` 토큰 보존
- GDD 가이드 색(노랑/시안)을 alt 토큰으로 보존. 의도적 결정. 누가 보면 "사용 안 하는 토큰"으로 오해해 삭제할 수 있으므로 tokens.css 주석을 잘 유지.

### R-5. `monsterPassiveSummaries` 동기화
- 새 적/패시브가 추가되면 `combatLogic.ts`의 type union과 `CombatIntelPanel.tsx`의 summaries 두 곳을 동시에 업데이트해야 함. 누락 시 placeholder 표시됨.

---

## 알려진 외부 이슈 (기획서/피드백 보고서 기반)

### EXT-1. 상점/이벤트/휴식 진입 시 UI 멈춤 (S급, 25.09.05) — ✅ 현재 코드 재현 불가
- 출처: 구글 드라이브 "리액트 피드백 리포트" (`1CWcY9SfH3HCkhiY9NzsS-BU1jl06b1Dlr7HkOgMxPck`)
- **2026-05-29 검증: 현재 코드에서 재현되지 않음** (P1-3 참조). 회귀 방어용 Error Boundary 적용 완료(`src/components/ErrorBoundary.tsx` + App.tsx).

### EXT-2. 미니보스 방어력 누적이 너무 강함 (유저 테스트 다수 지적)
- 출처: "모노크롬 클로드 버전 테스트" 스프레드시트
- 밸런스 조정 영역(UI 작업 범위 아님). 별도 추적.

### EXT-3. "공책 게임, 텍스트RPG 느낌"
- 출처: 같은 스프레드시트, 박재석 피드백
- 이미지 자산은 25.07~09에 대거 추가된 것으로 보이지만, 추가 spritesheet/배경 작업이 여전히 필요할 가능성.

---

## Phase C — 큰 구조 변경 (2026-05-28 추가)

폴더/구조 단의 큰 정리 작업을 Phase A/B/C 셋으로 나눠 진행했다. C-1·C-2 완료, C-3는 재평가 결과 보류.

### C-1. ✅ `src/` 디렉터리 도입 (완료, 커밋 `d1e3f1b`)
- `App.tsx`/`index.tsx`/`types.ts`/`constants.ts`/`vite-env.d.ts`/`index.css`와 8개 디렉터리(`screens/components/data/hooks/store/utils/content/styles`)를 `src/` 하위로 통합. git mv로 100% rename 인식 → 파일 히스토리 보존.
- 진입점(`index.html`), alias(`vite.config.ts`, `tsconfig.json`), scripts(`check-*.mjs`, `validate-passives.ts`) 경로 일괄 갱신.
- 부수 정리: `check-text-integrity.mjs`의 평탄화 이전 가정 좀비 코드 제거(`repoDir = appDir의 부모` → 단일 `rootDir`).
- 검증 9종 통과(typecheck, text-integrity, exploration-route, validate-passives, build, check:stage3-content, check:stage3-assets, check:release-assets, check:prototype-readiness).

### C-2. ✅ Tailwind 정식 빌드 도입 + 손글 CSS 분리 (완료, 2026-05-29)
- **완료**: 선행 옵션 중 A(Tailwind 정식 도입) 채택. 16,865줄 `src/index.css`(Tailwind 컴파일 출력 + 손글 하이브리드)를 분해.
  - `tailwindcss@3` + `postcss` + `autoprefixer` 도입, `tailwind.config.js` / `postcss.config.js` 추가.
  - `src/index.css`를 `@tailwind` 디렉티브 엔트리(85줄, `@layer base/utilities` 포함)로 전환 → 빌드 시 유틸리티 재생성.
  - 손글 컴포넌트 CSS는 `scripts/extract-handwritten-css.mjs`(postcss 파서)로 추출 → `src/styles/components.css`(1221 노드). `index.tsx`에서 마지막에 import → cascade 손글 우선.
  - 중복이 된 `tailwind-source.css` 삭제.
- **분류 근거**: `docs/tailwind-migration-classification.md`. drop-audit으로 누락 prefix 7종 적발(duel-/status-effect-/reward-/contrast-button-/contrast-panel/currency-/screen-card-).
- **검증**: build, cascade order(dist에서 `.flex` < `.combat-screen` = 손글 우선), check:dist, text-integrity, **dev 10화면 육안**, CI 배포(#37·#38) 통과.
- 커밋: e938090(분류)·4906290(툴체인)·0ad6d02(추출)·798ffa6(정리).
- **잔여(선택)**: tokens.css 변수를 Tailwind `theme.extend`로 노출해 `bg-face-heads` 같은 토큰 기반 유틸 생성. 화면별 components.css 추가 분할(combat/exploration 등).

### C-3. ⏸️ 모바일/데스크탑 combat HUD 통합 — 재평가 결과 보류 (2026-05-29)
- **재평가**: 코드를 직접 검토하니 초기의 "동일 동작이 두 곳에 중복 정의" 진단은 표면적 오독이었다("파일이 두 개 존재 ≠ 로직 중복").
  - 핸들러(`onCoinClick`/`onTogglePattern`/`onExecuteTurn` 등)는 `CombatScreen`에서 1회 정의해 props로 양쪽에 전달 — 중복 아님.
  - 원자 컴포넌트(`CoinDisplay`/`ActiveSkillPill`/`ReserveCoinStrip`/`PatternRail`/`CombatTicker`)는 이미 `CombatControls.tsx` 등으로 추출·공유 — 중복 아님.
  - 실제 중복은 coin-row `map` + tool 배치 JSX **~25줄**뿐. `OutcomeRail` vs `MobileOutcomeSummary`, `PatternRail` 항상표시 vs drawer는 **의도된 반응형 구조 차이**(CSS 미디어쿼리로 안 되는 차이).
- **결론**: 통합 이득(25줄 중복 제거 + 발생한 적 없는 드리프트 위험 완화) < 비용(게임 핵심 상호작용을 모바일+데스크탑 양 viewport에서 전 동선 dev 검증). **예방적 리팩토링으로 판단해 보류.**
- **정말 필요할 때 최소 범위**: `playerCoins.map(...)` 13줄만 `<CombatPlayerCoinRow>`로 추출(5 props). tool/command-strip은 실제로 다르므로 분리 유지.
- TypeScript가 prop 누락을 잡고 두 호출부가 가까워 grep으로 동기화 확인 가능하므로, 드리프트는 코드 컨벤션(상호 참조 주석) 수준으로 관리해도 충분.

---

## 작업 시 참조 문서

| 문서 | 위치 | 용도 |
|---|---|---|
| UI 카피 가이드 | `docs/ui-copy-guide.md` | 모든 라벨/용어/톤의 단일 진실 |
| 디자인 토큰 | `src/styles/tokens.css` | 색/공간/z/모션 토큰 정의 |
| 콘텐츠 출처 원장 | `docs/content-source-ledger.md` | 자산/규칙 기획서 매핑 |
| 루트 CLAUDE.md / AGENTS.md | 저장소 루트 | OMX/OMC 관리. 개발 명령어/구조 |
| 프로젝트 AGENTS.md | `AGENTS.md` | AI 협업 가이드(이 파일의 단일 출처) |
