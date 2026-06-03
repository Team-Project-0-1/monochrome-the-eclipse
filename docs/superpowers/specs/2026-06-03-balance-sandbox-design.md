# 밸런스 시험 Sandbox — 설계 (Spec)

- **날짜**: 2026-06-03
- **상태**: 설계 승인됨 (방향 + 자원 세팅 A안)
- **유형**: DEV 전용 개발 도구 (프로덕션 게임플레이 불변)

## 배경 & 목표

개발자가 밸런스를 빠르게 시험할 **DEV 전용 sandbox**. 기존 `testMode`(캐릭터 잠금 해제 + 전투 중 예비 코인 수동 뒤집기)를 확장한다.

- **목표**: 아무 캐릭터로 임의의 적을 즉석 소환해 한 판씩 빠르게 반복 → 밸런스 감각 확인.
- **sandbox-first 결정 근거**: 현재 실유저 0 + 이후 배포/홍보 예정. 원격 행동수집은 데이터 소급 불가라 서두를 이유가 없고, sandbox는 외부 의존이 0이라 즉시 가치. 행동수집(원격 애널리틱스)은 **배포 직전의 별도 sub-project**로 미룬다.

## 핵심 코드 사실 (설계 근거)

설계 전 코드를 직접 확인한 결과:

1. **적 스탯은 `monsterData[key]` 고정값 — 스테이지 스케일링 없음.** `enemyCoins = generateCoins()`도 스테이지 무관. → **스테이지는 "적 선택 풀"에만 영향, 전투 자체엔 무관.** sandbox는 스테이지를 거칠 필요 없이 적을 직접 고른다.
2. **전투 시작 로직은 `explorationSlice.selectNode`의 COMBAT 분기(76~143줄)에 인라인.** 76~79 = 적 선택(스테이지 RNG), 86~143 = 전투 초기화(enemy 빌드 → 상태 리셋 → `applyInnatePassives` → `gameState=COMBAT` → 예측 계산).
3. **`player`는 `playerSlice.selectCharacter`가 생성 + 런 초기화(원자적).** `echoRemnants` 100, stage 1, route 생성, 모든 전투/이벤트/UI 상태 리셋. testMode 진입이면 player를 공짜로 얻는다.

## 설계

### 1. 진입 — 외부 의존 0
- `CharacterSelectScreen`, **`testMode` ON일 때만** (이미 `import.meta.env.DEV` 게이트 안).
- 캐릭터 선택 → `selectCharacter`가 player + 런 초기화. testMode면 맵(EXPLORATION) 대신 **Sandbox 패널**로 분기.

### 2. Sandbox 패널 (DEV 전용)
- **적 선택**: `monsterData` 전체를 리스트로(이름·티어·HP·ATK). 스테이지 무관 플랫 리스트.
- **빠른 자원 세팅 (A안)**: 플레이어 HP, `echoRemnants`(골드). 두 개만.
- **전투 시작** 버튼 → `beginCombat(monsterKey)`로 즉시 COMBAT.
- **전투 중 조작**: 기존 `testMode` 코인 뒤집기를 그대로 재사용(새로 안 만듦).

### 3. 리팩토링 — `beginCombat` 추출 (재사용 토대)
- `explorationSlice` COMBAT 분기의 전투 초기화(86~143줄)를 **`beginCombat(draft, monsterKey)`** 헬퍼로 추출.
- `selectNode`: 76~79로 `monsterKey`를 정한 뒤 `beginCombat` 호출(동작 불변).
- sandbox: 직접 `monsterKey`로 `beginCombat` 호출.
- **효과**: 인라인 중복 제거, 단일 진실원, 결정론적 임의 적 소환. `beginCombat`은 *노드*가 아니라 *이미 해결된 `monsterKey`*를 받는다 — 이게 "임의 적 소환"의 열쇠.

## 비목표 (YAGNI)

- ✗ `GameState.SANDBOX` 신설 — `testMode` 조건부 렌더로 충분
- ✗ 전투 중 실시간 디버그 패널 — 코인 뒤집기로 충분
- ✗ 적 스탯 인라인 편집

## 영향 파일 (예상)

- `src/store/slices/explorationSlice.ts` — `beginCombat` 추출, `selectNode` 위임
- 전투 시작 헬퍼 위치: `explorationSlice` 내부 모듈 함수(또는 `combatSlice` 공유) — 구현 시 import 순환 없는 쪽으로 결정
- sandbox 전투 시작 액션 — `startSandboxCombat(monsterKey)` (player 보장 후 `beginCombat` 호출)
- sandbox 자원 세팅 액션 — `setSandboxPlayerState({ currentHp, echoRemnants })` (playerSlice)
- `src/screens/CharacterSelectScreen.tsx` — `testMode` 분기, Sandbox 패널 진입
- (새) `src/components/dev/SandboxPanel.tsx` — 적 선택 + 자원 세팅 + 전투 시작 UI

## 구현 순서

1. **`beginCombat(draft, monsterKey)` 추출**: `explorationSlice` COMBAT 분기 86~143을 헬퍼로. `selectNode`가 호출하도록 교체. *동작 불변* — 기존 explorationSlice 테스트 회귀 0 확인.
2. **`startSandboxCombat(monsterKey)` 액션**: player 존재 보장 후 `beginCombat` 재사용.
3. **`setSandboxPlayerState` 액션**: HP·`echoRemnants` 직접 세팅(클램프 포함).
4. **`SandboxPanel` 컴포넌트**: `monsterData` 리스트 + HP/골드 입력 + "전투 시작".
5. **`CharacterSelectScreen` 분기**: testMode일 때 캐릭터 선택 → SandboxPanel.
6. **단위 테스트**: `startSandboxCombat`(지정 적으로 COMBAT 진입, `enemy.key===monsterKey`), `setSandboxPlayerState`(클램프), `beginCombat` 추출 후 selectNode 회귀.
7. **`npm run check`** (typecheck + 238 tests + build + dist 가드) 통과.

## 테스트 계획

- `beginCombat` 추출은 *순수 리팩토링* — `selectNode`의 COMBAT 동작이 불변임을 기존 `explorationSlice.test.ts`로 보장(이미 COMBAT 진입 단언 있음).
- 신규 액션 2개 단위 테스트(238 → +N).
- 빌드/타입/dist 가드는 `check` 체인이 강제.

## v2 — 패시브·스킬 사전 부여 (A안 선택, 구현)

A안 위에 SandboxPanel을 확장. 선택한 캐릭터 클래스 기준으로:
- **패시브(`unlockedPatterns`)**: 클래스별 패시브 패턴 후보 전체를 다중선택 토글로 부여(전투 시 `enemyIntent` 등에서 효과 적용).
- **스킬(`acquiredSkills`)**: 클래스별 액티브 스킬 후보 전체를 다중선택 토글로 부여(코인 패턴 발동 = `getPlayerAbility`).
- 전투 시작 시 선택분을 보유한 상태로 진입.

**족보(코인 패턴)는 v2 비포함** — 전투 중 기존 `testMode` 코인 뒤집기로 맞춤(사용자 결정).

영향:
- `SandboxPanel`: 패시브/스킬 다중선택 UI(선택 클래스 필터, 클래스 변경 시 초기화)
- 세팅 액션: `setSandboxPlayerState`를 `unlockedPatterns?`/`acquiredSkills?`로 확장 또는 새 `setSandboxLoadout` — 깔끔한 쪽
- 후보 열거: `dataSkills`(스킬 카탈로그), 패시브 패턴 풀(`combatRewards`의 패시브 로직/데이터) — 클래스별 *전체* 후보 헬퍼 확인/추가(draft의 랜덤 일부 ≠ 전체)
- 순서: `selectCharacter`가 `unlockedPatterns`/`acquiredSkills`를 `[]`로 리셋하므로, 세팅은 `selectCharacter` *후*에 적용

테스트: 세팅 액션(부여·클래스 필터·omitted 보존), 기존 회귀 0.

## 후속 (별도 sub-project)

- **행동수집(원격 애널리틱스)**: 배포·홍보 직전. PostHog(추천) 또는 GA4. `RunRecord`를 이벤트 페이로드로 재사용. 한국 서비스 → 개인정보처리방침/PIPA + 쿠키리스 모드로 동의 마찰 최소화.
