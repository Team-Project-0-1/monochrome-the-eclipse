# 아키텍처 리뷰 — 구조 분석 및 소프트웨어 엔지니어링 취약점 진단 (2026-06-10)

> 분석 방법: 영역별 병렬 정밀 리뷰 3건(상태관리·도메인 로직 / UI 레이어 / 데이터·테스트·빌드 인프라) + 고심각도 주장 전건 오케스트레이터 직접 재검증. 모든 지적은 `파일:행` 근거를 동반하며, 코드에서 확인된 사실만 기재한다.

---

## 1. 프로젝트 규모

| 영역 | 파일 | LOC | 비고 |
|---|---:|---:|---|
| `src/styles/` (tokens + components-01~07) | 8 | 11,682 | **TS/TSX 전체보다 1.6배 큼** |
| `src/utils/` (+`utils/combat/`) | 30 | 2,969 (+1,765) | 전투 엔진은 `utils/combat/` 분리 |
| `src/store/` (+slices) | 13 | 2,723 | combatSlice 502 LOC 최대 |
| `src/components/` (+combat, ui, intel 등) | 41 | 5,026 | 최대 컴포넌트 354 LOC — 건전 |
| `src/screens/` | 12 | 1,981 | 전부 `React.lazy` 분할 |
| `src/data/` | 8 | 2,295 | 콘텐츠·밸런스 데이터 |
| **합계** | **130** | **29,274** | |

테스트: 단위/통합 **18파일 ~219케이스**(전 슬라이스 + utils 12종, node 환경) + 패시브 시나리오 하네스(14종) + CDP 기반 e2e 스모크 1본(데스크톱/모바일). **컴포넌트·스크린·훅 테스트는 0.**

---

## 2. 아키텍처 맵

### 2.1 상태관리 (Zustand 슬라이스 + persist)

`store/gameStore.ts`(318 LOC)가 6개 슬라이스를 `devtools(persist(...))`로 합성. 모든 슬라이스가 `StateCreator<GameStore,...>` — 즉 **어느 슬라이스든 전체 스토어를 읽고 쓸 수 있다**(느슨한 경계).

| 슬라이스 | LOC | 책임 |
|---|---:|---|
| metaSlice | 53 | 메타 진행 + 런 텔레메트리(`runHistory` 50개 캡) |
| playerSlice | 227 | 캐릭터 생성·구매·스킬·기억 업그레이드·dev 샌드박스 |
| explorationSlice | 230 | 경로 탐색 + **전투 부트스트랩(`beginCombat`)** + 휴식 |
| combatSlice | 502 | 코인·패턴·턴 실행·보상·액티브 스킬·스왑 |
| eventSlice | 187 | 이벤트 선택 해석(이벤트발 전투 포함) |
| uiSlice | 109 | 모달·이펙트·툴팁·옵션·튜토리얼 |

도메인 로직은 `utils/gameLogic.ts`(시드 경로 생성·패턴 감지)와 `utils/combat/{passives 632, turnFlow 500, enemyIntent 192, helpers 131}`로 분리되어 있고, 구조적 부분집합 타입 `GameStoreDraft`(`utils/combat/types.ts:11-20`)만 받는다 — **스토어 비의존·단위테스트 가능. 보존할 핵심 설계.**

**영속 경계**: `partialize`(`gameStore.ts:281-314`)가 메타만이 아니라 **활성 런 전체(~30필드: player, enemy, playerCoins, combatLog, 파생값 포함)를 localStorage에 저장**한다. 하이드레이션은 `migrate`(268-276) → `merge`+`normalizeHydratedState`(90-142, 무효 화면상태 강등 + MENU 복귀 라우팅) 2단을 거친다. ※ CLAUDE.md의 "meta progression만 영속" 서술은 **코드와 불일치(문서 드리프트)**.

대표 흐름(`selectNode`→전투): 단일 `set(produce(...))` 안에서 노드 검증 → `Math.random` 몬스터 선택 → `beginCombat`(적 생성·코인 생성·선천 패시브·인텐트·예측까지 원자적) → COMBAT 전환. 턴 실행은 `executeTurn`(combatSlice.ts:414) 단일 produce + **1200ms `setTimeout`으로 화면 전환**.

### 2.2 UI 레이어

- `App.tsx`(138 LOC): `GameState` enum 스위치로 12개 lazy 스크린 라우팅. 전역 마운트: ErrorBoundary(메뉴 복귀 리셋), KeywordTooltip+스크림, TutorialCoachmark, InventoryPanel, SkillReplacementModal. 접근성 옵션은 `documentElement` dataset/body class로 투영.
- 전투는 `components/combat/`(12파일)+`intel/`(5파일)로 적절히 분해. 거대 컴포넌트 없음(최대 ShopScreen 354).
- **스타일 3층**: ① `tokens.css`(582줄, `--color-*`/`--z-*` 밴드 체계 문서화) ② `components-01~07.css`(11,100줄 — 과거 13k 단일 파일을 **캐스케이드 순서 보존 분할**한 것; `index.tsx:12-20`에 도메인 재편성 거부 사유 명시) ③ Tailwind 3.4(JSX에서 수기 클래스와 혼용).
- 스토어 접근은 **전 컴포넌트 필드 단위 셀렉터로 통일**(객체 셀렉터 0건 — 리렌더 footgun 부재). z-index 원시값 0건(전부 토큰화).

### 2.3 데이터·빌드·배포

- 데이터: TS 레코드 리터럴(`monsterData` 993 LOC 등). 런타임 교차검증은 `contentValidation.ts`가 스테이지→몬스터→패턴 링크만, **DEV에서 console 출력뿐**.
- `npm run check` 11단계 체인(텍스트 무결성→콘텐츠→typecheck→테스트→패시브 검증→빌드→dist 예산→e2e 훅 누출 검사). 가드 스크립트 군이 이례적으로 충실(dist 15MB/PNG 512KB 예산, `__gameStore` 백도어 누출 검사, 경로 결정성 검사 등).
- 배포: main push → GitHub Pages(`prototype:check` 통과 시) + Netlify 미러. e2e job은 **명시적 비차단**.

---

## 3. 취약점 (심각도순)

### 🔴 HIGH

#### H1. TypeScript strict 모드 전면 부재 — 안전망이 사실상 꺼져 있음
`tsconfig.json`에 `strict`, `strictNullChecks`, `noImplicitAny`, `noUnusedLocals`, `noUncheckedIndexedAccess` **전부 없음**(직접 확인). 거의 모든 데이터 접근이 문자열 인덱싱(`monsterData[key]`, `eventData[id]`)인 게임에서 null-deref가 컴파일러에 전혀 안 잡힌다. ESLint도 부재(설정·의존성·스크립트 0)라 **정적 분석이 느슨한 tsc 하나뿐**. 죽은 import 잔재(combatSlice.ts:5-16의 미사용 `monsterData`/`generateCoins` 등)가 이미 그 증거다.
**보완**: `noImplicitAny`→`strictNullChecks`→`noUncheckedIndexedAccess` 순 점진 도입(219개 테스트가 안전망). ESLint(`typescript-eslint`+`react-hooks`) 추가 후 `check` 체인에 편입.

#### H2. 핵심 스킬 테이블이 `any` — `dataSkills.ts:18`
`export const playerAbilities: { [key: string]: any }` — 게임의 중심 데이터 600줄(이펙트 클로저 포함)이 무타입. `fixedDamage`/`temporaryEffect` 형태 오타가 조용히 컴파일된다.
**보완**: `Record<CharacterClass, Partial<Record<PatternType, Partial<Record<CoinFace, AbilityDefinition>>>>>` 적용(또는 `satisfies`).

#### H3. 이벤트발 전투 초기화가 `beginCombat`과 중복·발산 — **실동작 버그**
`explorationSlice.ts:20-84`의 `beginCombat`(주석에 "모든 진입점이 공유"라고 명시)을 `eventSlice.handleEventChoice`(65-116)가 **복붙으로 재구현**하며 누락 3종: ① `activeSkillCooldown` 미리셋 ② `activeSkillState`/`swapState` 미리셋 ③ Rogue 첫 코인 HEADS 오프닝 보정(explorationSlice.ts:72-76) 부재. 이벤트 전투는 **묵은 쿨다운으로 시작하고 Rogue 선천 패시브가 오프닝에 안 먹는다**.
**보완**: `beginCombat`을 util로 추출해 양쪽에서 호출(가장 작은 수정으로 가장 확실한 버그 제거).

#### H4. `totalRuns`가 사망 시에만 증가 — 통계 왜곡 버그
`metaProgress.totalRuns += 1`이 사망 경로 2곳(combatSlice.ts:529, eventSlice.ts:176)에만 존재(직접 확인). 승리 런은 `runHistory`에는 남지만 `totalRuns`엔 안 잡혀, 승률 계산 시 **100% 초과 가능**. `highestStage` 갱신도 콜사이트마다 수동 중복.
**보완**: 증가·최대값 갱신을 `recordRunEnd`(metaSlice) 안으로 이동.

#### H5. `executeTurn` 갓 액션 + 패시브 시스템 이원화
combatSlice.ts:414-575(~160줄)가 턴 오케스트레이션·FX·텔레메트리·보상·라우팅을 전부 수행하고, **킬 트리거 패시브 3종이 매직넘버와 함께 스토어에 인라인**(WARRIOR +5 maxHp :477, TANK +1 cap10 :483, MAGE 저주만큼 힐 :494 — 직접 확인). 다른 모든 패시브는 `utils/combat/passives.ts`의 `applyPassives(trigger)` 체계에 있다. 신규 "처치 시" 패시브가 잘못된 곳에 추가될 구조.
**보완**: `applyPassives`에 `ON_KILL` 트리거 추가 후 3종 이동, `executeTurn`은 페이즈 파이프라인 호출로 축소.

#### H6. 스토어 액션 내부의 `setTimeout` — 비결정성·경합
combatSlice.ts:562-574: 턴 해석 후 1200ms 타이머가 `gameState`를 변경. 창 내 새 런 시작 등 일부 전이는 가드(566-567) 밖이고, 창 내 새로고침 시 `COMBAT`+`pendingCombatReward`가 영속되는 것을 `normalizeHydratedState`(gameStore.ts:108-117)가 **특례로 수습** — 한 시스템의 결함을 다른 시스템이 보상하는 구조. 타이밍은 fake timer 없이 테스트 불가.
**보완**: 지연을 UI 레이어로 이동(CombatScreen이 연출 후 `acknowledgeCombatResolution()` 디스패치), 스토어는 동기·결정적으로.

#### H7. 버전만 있고 마이그레이션 체인이 없는 영속화
`version: 3` 선언(gameStore.ts:267)에도 `migrate:(persistedState: any)=>...`(268-276)는 **버전 인자를 무시**하는 단일 백필. 백필이 `migrate`/`normalizeHydratedState`(97-105)/`partialize` 새니타이즈(310-311) **3곳에 비조정 중복**. 게다가 파생 상태(`detectedPatterns`·`combatPrediction`·`enemyIntent`)까지 영속해(299-304) 마이그레이션 표면을 스스로 넓히고, 밸런스 패치 후 **구버전 예측/인텐트가 재생되는** 위험.
**보완**: `migrate`를 버전 스위치로 재구성, 파생 필드는 partialize에서 제외하고 복원 시 재계산, 검증 실패 시 런 페이로드만 버리고 `metaProgress` 보존하는 타입 가드 추가. CLAUDE.md 영속 서술 정정 포함.

#### H8. PR/브랜치 CI 부재 — 검사가 배포 시점에 처음 돈다
`deploy.yml`은 `push: main`+수동 트리거뿐. 11단계 `check` 체인이 **머지 후 배포 잡 안에서** 처음 실행 — 깨진 커밋이 이미 main에 있다. 조직 협업 리포에서 머지 전 신호 0.
**보완**: `pull_request`+비main push에 `npm run check`(+e2e) 도는 `ci.yml` 추가.

#### H9. CSS `!important` 1,415개 — 캐스케이드 군비경쟁
파일별: components-03 110 / 05 **360** / 06 **469** / 07 **440**. 후행 번호 파일이 선행 파일을 `!important`+긴 자손 셀렉터로 덮어쓰는 append-only 구조(`index.tsx:12-13`이 재편성 위험을 자인). 새 스타일마다 기존 1,400개를 이겨야 하며 JSX의 Tailwind 유틸이 조용히 진다.
**보완**: 네이티브 `@layer`로 슬라이스를 레이어 순서화 → 시각 회귀 체크와 함께 파일 단위 박리. stylelint로 **개수 동결**(증가 차단)부터.

#### H10. 모바일에서 마운트되지 않는 컴포넌트를 겨냥한 죽은 CSS ~1,500줄
`CombatScreen.tsx:14`가 767px에서 HUD를 JS로 스왑(`CombatMobileHud`⟷`CombatDesktopHud`)하는데, `.combat-card-hand`는 **데스크톱 HUD만 렌더**(CombatDesktopHud.tsx:82 유일). 그런데 components-06/07의 `@media (max-width:767px)` 블록(각 675/870줄)에 `.combat-card-hand` 참조 ~140건 — **DOM에 존재하지 않는 폭에서의 스타일**. 동일 브레이크포인트에 JS 스왑+CSS 오버라이드 두 메커니즘이 병행하는 발산 함정.
**보완**: 커버리지 툴로 확인 후 해당 모바일 블록 삭제, 전투 반응형은 JS 스왑으로 단일화.

#### H11. 모달 4중 구현 + 포커스 관리 전무 (접근성)
RunStatusModal(`role="dialog"`+`aria-modal` ✓) / CombatIntelPanel(aria-modal ✗) / InventoryPanel·SkillReplacementModal(**role 자체 없음**). 전 코드베이스에서 `autoFocus|.focus()|focusTrap|inert` **0건** — 어떤 모달도 포커스 트랩·복귀·Escape가 없고 배경이 키보드로 도달 가능.
**보완**: 포커스 트랩·Escape·`aria-modal`·스크롤락·단일 z-토큰을 가진 공용 `<Modal>` 프리미티브(또는 네이티브 `<dialog>`) 1개로 4곳 이주. ※ 진행 중인 씬-우선 UI 계획의 RouteMapOverlay가 5번째 구현이 되므로, 프리미티브 도입 시 함께 흡수할 것.

### 🟡 MEDIUM

| # | 문제 | 근거 | 보완 |
|---|---|---|---|
| M1 | `temporaryEffects: {[key:string]: any}`가 전투의 등뼈 — ~30종 이펙트 키가 무타입, `duration: 999` 무한 센티널 ~10곳 | types.ts:115, 208; turnFlow.ts:132; combatSlice.ts:99-112 | 판별 유니언 `TemporaryEffectMap` + 타입드 액세서(`helpers.ts:13` `getTemporaryNumber`가 씨앗) |
| M2 | 이벤트 데이터 계약 end-to-end `any` — 오타 키 무시, `monsterData[combatToStart]`(eventSlice.ts:66) 무가드 크래시 | types.ts:279-282; eventSlice.ts:15,41 | `EventOutcome` 인터페이스 + `contentValidation` 확장 |
| M3 | "런 리셋" 목록 3중 수기 유지·이미 드리프트 — `resetGame`은 `activeSkillState` 미리셋, `skillReplacementState` 2회 중복(gameStore.ts:247,252) | gameStore.ts:205-262; playerSlice.ts:70-113; combatSlice.ts:399-411 | `createInitialRunState()` 단일 원천 |
| M4 | RNG 주입 불가 — 몬스터/이벤트 선택·코인 플립이 raw `Math.random`(시드 RNG는 경로 생성만) | explorationSlice.ts:148,170; gameLogic.ts:91 | 순수 `resolveEventChoice(choice, player, rng)` 추출, 기존 `createSeededRandom` 주입 |
| M5 | `stageData[stage as keyof typeof]` 무가드 인덱싱 + `draft.enemy!` 단언 — 손상 세이브가 produce 내부 throw | explorationSlice.ts:147,162; combatSlice.ts:502,474,557 | 폴백 있는 `getStageInfo()` + 내로잉 |
| M6 | 최위험 배관이 무테스트: `gameStore.ts`(hydration/migrate) 0건, `turnFlow.ts`(500 LOC 턴 엔진) 간접뿐. **커버리지 리포팅 자체가 미설정**이라 구멍이 안 보임 | vitest.config.ts:15 (`.tsx` 구조적 제외) | `@vitest/coverage-v8`+기준선, turnFlow·hydration 직접 테스트 우선 |
| M7 | 콘텐츠 검증이 부분적·프로덕션 무효 — 스테이지→몬스터→패턴만, `eventPool`/`failure.combat`/`followUp`/패시브 키/상점 id 미검증, DEV console뿐(경고는 출력도 안 됨) | contentValidation.ts:11-50; App.tsx:42-53 | 교차참조 전수 확장 + 테이블 주도 vitest 승격(CI 실패화) |
| M8 | 103MB 고아 디렉터리 `monochrome_-the-eclipse/node_modules/` — 구 중첩 레이아웃 잔재, 어떤 참조도 없음 | git check-ignore로 확인됨 | 디렉터리 삭제 |
| M9 | 팬텀 의존성: `esbuild`를 직접 import하지만 devDependencies에 없음(vite 전이 의존에 편승) — vite 메이저 업이 `validate:passives`→`check`→배포 전체를 무경고 파괴 가능 | run-passive-validation.mjs:1 | devDependencies에 명시(또는 하네스를 vitest로 흡수) |
| M10 | `npm audit`이 배포 경로 안 — 무관한 핫픽스가 신규 moderate 권고로 하드블록 | package.json:27 (release:check); deploy.yml:79 | audit를 PR/스케줄 워크플로로 이동 |
| M11 | 쌍둥이 24-prop HUD 인터페이스(바이트 단위 동일)를 CombatScreen이 두 번 드릴링 — 앱 유일의 드릴링 서브트리, 드리프트 시 무음 버그 | CombatDesktopHud.tsx:20-51 = CombatMobileHud.tsx:20-51 | 공유 `CombatHudProps` 즉시 추출 → 장기적으론 자식이 스토어 셀렉트 |
| M12 | `React.memo` 0건 + CombatScreen이 29필드 구독(`combatLog`·`combatEffects` 포함) — 로그 한 줄에 전투 트리 전체 리렌더, framer 애니메이션과 프레임 경쟁 | CombatScreen.tsx:36-64,116-206 | 핸들러 `useCallback` + HUD 2종·Stage `memo` + combatLog 구독을 Ticker로 하강 |
| M13 | 제2 토큰 네임스페이스 `--cr-*`가 슬라이스 파일 안에 선언 — tokens.css의 "단일 원천" 선언과 모순, `--color-*`와 의미 중복 | components-05.css:200-216 vs tokens.css:1-9 | tokens.css로 이동+관계 문서화(순수 이동) |
| M14 | 테스트 스토어 안전 가정이 주석으로만 강제 — 실제로 cross-slice `get()` 존재(eventSlice.ts:204, playerSlice.ts:235는 produce 내 live-state 읽기 혼용) | test/store.ts:22-25 | 스텁 전역 액션을 throw로(무음 no-op 대신 시끄럽게 실패) |

### 🟢 LOW

- **L1** 뮤테이션 스타일 혼재: produce vs plain set 비일관(combatSlice.ts:233,358), produce 안 스프레드 중복(uiSlice.ts:106-111), 상수 참조 공유 대입(uiSlice.ts:116). → 컨벤션 단일화.
- **L2** 밸런스 매직넘버 로직 산재: 휴식 회복 0.4(explorationSlice.ts:227), 예비코인 100/+50 중복 정의 3곳, HEADS 확률 클램프 0.05/0.95(combatSlice.ts:87-88) 등. → `constants.ts` 집중.
- **L3** 죽은 코드: `TutorialCoachmark.tsx:15-58` 테이블이 오버라이드에 완전 가려짐(~44줄 도달 불가); `KeywordTooltip.tsx:17-27` Tailwind 클래스 문자열→스타일 하드코딩 맵; `InventoryPanel.tsx:99-119` 한국어 설명문 부분문자열로 스킬 분류(카피 변경 = 동작 변경).
- **L4** 툴팁이 자기 토큰 우회: `z-50` 사용, 스크림(58)이 툴팁(50) 위 — `pointer-events-none`이라 무해하나 밴드 체계 역전. → `var(--z-tooltip)`.
- **L5** framer-motion에 `MotionConfig`/`useReducedMotion` 0건 — 모달·툴팁·코인 애니메이션이 reducedMotion 무시(CSS 가드 15곳·전투 연출 대체는 잘 됨). → `<MotionConfig reducedMotion={...}>` 한 줄. ※ 씬-우선 UI 계획이 컴포넌트별 수동 게이팅을 택한 근본 원인 — 전역 해결 시 그 패턴 불요.
- **L6** e2e가 WARRIOR 단일 경로·전투 미완주·GAME_OVER/VICTORY/STAGE_CLEAR 미방문, 비차단. Chrome 경로 하드코딩(CHROME_BIN 우회는 존재). → 4클래스 루프+상태 토글로 미방문 화면 추가, 안정화 후 차단화.
- **L7** `check-text-integrity.mjs:50`이 CJK 한자 전역을 mojibake로 간주 — 향후 한자 콘텐츠 시 오탐. `check-exploration-route.mjs:7-17`은 deprecated `require.extensions` 사용(M9와 함께 TS 실행 메커니즘 이원화).
- **L8** `stageData`/`characterData` 무타입 리터럴 — 필드 누락이 런타임까지 침묵. → `satisfies Record<...>`.
- **L9** CLAUDE.md 드리프트: 영속 범위(§2.1), base path(`/monochrome-the-eclipse/`가 실제, 문서는 `/monocrome-eclips/`), 데이터 파일 위치(`src/data/`)·목록 누락. → 갱신.

---

## 4. 우선순위 로드맵

| 단계 | 내용 | 성격 |
|---|---|---|
| **P0 — 즉시 (버그·저비용)** | H3 이벤트전투 `beginCombat` 통일 · H4 `totalRuns`→`recordRunEnd` · M8 103MB 삭제 · M9 esbuild 명시 · L9 CLAUDE.md 갱신 | 실동작 버그 2건 + 1시간 미만 정리 3건 |
| **P1 — 안전망 구축** | H8 PR CI · H1 ESLint 도입+strict 점진(`noImplicitAny`→`strictNullChecks`→`noUncheckedIndexedAccess`) · H2 `playerAbilities` 타이핑 · M6 커버리지 리포팅 | 이후 모든 리팩터의 전제 조건 |
| **P2 — 구조 개선** | H5 `ON_KILL` 트리거+`executeTurn` 분해 · H6 setTimeout→UI · H7 버전 마이그레이션 체인+파생상태 영속 중단 · M1/M2 이펙트·이벤트 계약 타이핑 · M3 런 리셋 단일 원천 · H11 공용 Modal(씬-우선 UI 계획과 합류) | 스토어 결정성·확장점 정상화 |
| **P3 — CSS·성능 장기전** | H9 `@layer`+stylelint 동결 · H10 죽은 모바일 블록 삭제 · M11/M12 HUD props 공유+memo · M13 토큰 통합 · L5 MotionConfig | 시각 회귀 체크 동반, 슬라이스 단위 진행 |
| **P4 — 잔여 정리** | M4/M5/M7/M10/M14, L1~L8 | 기회 있을 때 배치 처리 |

---

## 5. 보존할 강점 (회귀 금지 목록)

1. **`GameStoreDraft` 구조적 부분집합** — 전투 수학 1,455 LOC가 스토어 비의존. 이 경계를 다른 도메인 로직(이벤트 해석 등)으로 확장하는 것이 P2의 방향.
2. **시드·로깅 경로 생성**(`createSeededRandom`+`routeGenerationLog`) — 나머지 RNG가 따라야 할 모범.
3. **필드 단위 zustand 셀렉터 전면 통일** — 객체 셀렉터 0건.
4. **z-index 토큰 밴드 체계**와 그 마이그레이션 기록(`docs/z-index-migration-map.md`) — H9 `!important` 정리의 실행 모델로 재사용할 것.
5. **가드 스크립트 군**: dist 예산, `__gameStore` 누출 검사, 경로 결정성, 인코딩 무결성 — 프로토타입 수준을 넘는 배포 위생.
6. **12스크린 전부 lazy 분할** + `VITE_E2E` 게이트의 트리셰이킹.
7. **프로덕션 충실 테스트 스토어**(`src/test/store.ts`) — M14 보강 후에도 미들웨어 없는 합성 방식 자체는 유지.
