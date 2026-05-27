# AI 협업 가이드 (Codex · Claude Code · Cursor)

> 코덱스(OpenAI), Claude Code, Cursor 등 모든 AI 협업 에이전트가 이 프로젝트(``)에서 작업할 때 따르는 운영 가이드.
> 체크리스트형 권고 + 예외 명시 형식. **단일 진실(SSoT) 문서 위치를 외워두는 것이 가장 중요**합니다.
>
> ⚠️ 저장소 루트의 `AGENTS.md` / `CLAUDE.md`는 OMX/OMC가 자동 갱신하는 영역입니다.
> 본 파일은 *이 프로젝트 폴더 안*의 협업 규칙 단일 출처로, 루트 파일과는 분리해 관리합니다.

---

## 0. 단일 진실(Single Source of Truth) 4종

작업을 시작하기 전에 아래 4 문서의 위치를 반드시 인지한다. 모든 결정은 이 문서들과 일치해야 한다.

| 문서 | 위치 | 무엇을 담는가 |
|---|---|---|
| **UI 카피 가이드** | `docs/ui-copy-guide.md` | 모든 라벨/용어/톤/색상의 정식 기준 |
| **디자인 토큰** | `src/styles/tokens.css` | 색·공간·z·모션·반경·타입 토큰 |
| **콘텐츠 출처 원장** | `docs/content-source-ledger.md` | 자산/규칙의 기획서 매핑 |
| **후속 백로그** | `docs/followup-backlog.md` | 미완 작업·회귀 위험·외부 이슈 추적 |

추가 외부 참조:
- 게임 디자인 문서(GDD): 구글 드라이브 "03. 동전 전투 (포폴) / 기획 포폴 / 동전 GDD"
- 핵심 슬라이드 v11: 같은 폴더 "핵심 기획 슬라이드"
- 리액트 피드백 리포트(미해결 버그): 같은 폴더 "리액트 피드백 리포트"

---

## 1. 작업 흐름 (every change)

### 1.1 시작 전
- ✅ **카피·라벨**: `docs/ui-copy-guide.md`를 단일 진실로 본다. 새 라벨은 가이드에 먼저 추가하고 코드에 반영.
  - 예외: 신규 캐릭터/적/스테이지 추가 시 가이드를 *동시에* 갱신(둘 중 한쪽만 갱신 금지).
- ✅ **색·공간·모션**: `src/styles/tokens.css`의 토큰만 사용한다. raw hex/Tailwind 색상 클래스 신규 도입 금지.
  - 예외: 일회성 시각 디버그/개발 모드에서만 임시로 raw 값 허용. PR 머지 전 토큰화.
- ✅ **z-index**: 새 값을 raw 숫자로 적지 말고 `var(--z-stage-bg|stage-fx|stage-sprite|stage-overlay|stage-banner|hud|hud-raised|tooltip|coachmark|focus-banner|modal-backdrop|modal|modal-top|toast)` 중 하나를 고른다.
  - 예외: 없음. 토큰에 없는 위계가 필요하면 토큰을 먼저 추가.

### 1.2 작업 중
- ✅ **컴포넌트 추가**: 동일 정보를 다른 컴포넌트가 이미 보여주고 있는지 먼저 확인. 새 컴포넌트는 *고유한 정보*만 책임진다.
- ✅ **CSS 클래스**: 신규 셀렉터를 `src/index.css` 하단에 추가하기 전에 그 클래스가 이미 존재하는지 grep. 동일 셀렉터 재정의 금지.
- ✅ **터치/마우스**: long-press, suppressNextClick 같은 입력 트릭 사용 금지. tap=실행, (i) 버튼=상세 로 분리.

### 1.3 종료 전
- ✅ 다음 명령 묶음을 모두 통과해야 PR 머지:
  ```bash
  npx tsc --noEmit              # 타입체크
  npm run check:text-integrity  # 텍스트 무결성
  npm run validate:passives     # 패시브 시나리오
  npm run build                 # 프로덕션 빌드
  ```
- ✅ UI 변경은 `npm run dev` 후 브라우저에서 직접 확인. 콘솔 에러 0건 보장.

---

## 2. 자주 저지른 실수 패턴 (Do NOT)

이 섹션은 2026-05-25 점검에서 실제 발견된 코덱스/AI 작업물의 패턴이다. 같은 실수를 반복하지 않기 위한 안티패턴 목록.

### 2.1 영문 키커 남발
**증상**: `Expedition Kit`, `Pick One`, `Camp Log`, `Supply Terminal`, `Reward Choice`, `Route Read`, `Run Trace`, `Choices` 같은 영문 키커를 한국어 UI에 무차별 삽입.
**왜 문제**: 한국어 게임 톤이 깨지고 "Pick One" 옆 "선택 이유" 같은 어색한 조합 발생.
**해결**:
- **모든 영문 키커는 한국어 번역.** (가이드 §3.3 표 참조)
- 영문으로 남기는 예외 (가이드 §3.2):
  - 정식 게임 타이틀(`MONOCHROME`, `THE ECLIPSE`)
  - 빌드 버전(`PROTOTYPE V0.1`)
  - 키보드 키 hint(`Enter`) — 의미는 동행 한국어로 표기
- **이력 (2026-05-28)**: 이전 `STAGE/RUN/ROUTE/MODE/SCOPE/OPTIONS/AUDIO MIX` 화이트리스트 7종은 폐지. Phase A에서 메뉴/HUD를 모두 한국어로 통일.

### 2.2 같은 정보를 4~5곳에 노출
**증상**: 예상 피해가 `CombatIntelBar` + `CombatOutcomeRail` + `CombatTicker` + `EnemyIntentDisplay` + `MobileOutcomeSummary`에 모두 표시.
**왜 문제**: 시선이 분산되고 어디를 기준으로 결정해야 할지 모호.
**해결**:
- 한 정보 = 한 권위 컴포넌트. 보조 컴포넌트는 *다른 각도*(요약/예측/이력)일 때만 허용.
- IntelBar는 시너지·패시브 정보만, OutcomeRail은 턴 결과 트랙만, Ticker는 직전 이력만.

### 2.3 동일 CSS 셀렉터 4~5회 재정의
**증상**: `.combat-bottom-hud`, `.combat-pattern-rail`, `.combat-stage` 등이 13,000줄 `src/index.css` 안에 같은 셀렉터로 4~5번 등장.
**왜 문제**: 후속 수정이 어디에 영향 줄지 예측 불가. 동작은 우선순위(나중에 선언된 것)에 의존.
**해결**:
- 신규 셀렉터 추가 전 grep으로 기존 정의 확인.
- 같은 클래스를 두 번 정의해야 한다면 (예: 미디어 쿼리 안과 밖) 두 정의를 *인접*하게 배치.
- 장기: `src/styles/combat.css`, `src/styles/exploration.css` 등으로 분할 (followup P3-1).

### 2.4 raw 색상 hardcoded
**증상**: `bg-red-500`, `border-red-300`, `text-blue-100` 같은 Tailwind 색 클래스를 그대로 컴포넌트에 박음. 토큰 우회.
**왜 문제**: 모드 전환(reducedMotion/highContrast/largeText), 색맹 모드, GDD 색상 정책 변경 시 일괄 변경 불가.
**해결**:
- 색은 `var(--color-*)` 토큰만 사용.
- Tailwind 클래스가 필요하면 `style={{ background: 'var(--color-...)' }}`로 인라인 적용 또는 `src/styles/tokens.css`에 시맨틱 클래스(예: `.token-face-heads`) 추가.
- 예외: `text-white`, `text-slate-300` 같은 *중립* 텍스트 톤은 임시 허용 (장기적으로 `--color-ink-*` 토큰화).

### 2.5 기획서 미참조 라벨 임의 결정
**증상**: 기획서는 "예비 동전"인데 코드엔 "행운 동전". 기획서는 "유일(Only)"인데 코드엔 "단일".
**왜 문제**: 기획자/유저와 어휘가 어긋나 의사소통 비용 증가, 콘텐츠 정합성 무너짐.
**해결**:
- 새 라벨/용어는 GDD 또는 핵심 슬라이드에 있는 표현이 있는지 먼저 확인.
- 모르면 `docs/ui-copy-guide.md` §2(핵심 용어)를 우선 참조. 없으면 추가 후 커밋.

### 2.6 long-press / suppressNextClick 같은 입력 트릭
**증상**: 카드를 길게 누르면 툴팁이 뜨고, 짧게 누르면 선택. 짧고 긴 경계가 모호해 모바일에서 의도하지 않은 동작.
**왜 문제**: 사용자가 "선택"을 의도해도 "툴팁"이 뜨는 일이 잦음. setTimeout / suppressNextClick.current 같은 트릭은 컴포넌트 언마운트/리렌더 시 깨짐.
**해결**:
- tap = 실행, (i) 아이콘 버튼 = 상세. 두 인터랙션을 *공간적으로 분리*.
- (i) 버튼은 `position: absolute; top: 4px; right: 4px` + `::before { inset: -11px }`로 44px 가상 터치 영역.

### 2.7 z-index 값을 흩뿌림
**증상**: `z-index: 70`, `z-[49]`, `z-index: 2000` 같은 임의 숫자가 28종 사용됨.
**왜 문제**: 모달이 코치마크 아래로 깔리거나, 툴팁이 모달 위로 떠 시각적 혼란.
**해결**:
- §1.1의 토큰만 사용.
- TSX에서는 `style={{ zIndex: 'var(--z-modal)' }}` 형태.

### 2.8 동일 컴포넌트 두 시스템 공존
**증상**: HealthBar(Tailwind) vs CombatOverheadVitals(custom CSS) 두 개의 체력바가 다른 화면에 존재.
**왜 문제**: 시각 언어 분기 + 색·간격 일관성 무너짐.
**해결**:
- 같은 의미의 컴포넌트는 하나로 통합. 변형이 필요하면 props로 노출.
- 통합 전이라도 색상은 동일 토큰을 참조하여 시각 일관성은 유지.

---

## 3. 빠른 체크리스트 (PR 디스크립션에 복사)

```
## 체크리스트
- [ ] 라벨/용어가 docs/ui-copy-guide.md를 따르는가 (영문 키커는 화이트리스트만)
- [ ] 색·공간·z-index가 src/styles/tokens.css의 토큰을 참조하는가 (raw 값 X)
- [ ] 같은 정보를 다른 컴포넌트가 이미 보여주지 않는가 (중복 노출 X)
- [ ] 신규 CSS 셀렉터가 index.css에 이미 존재하지 않는가 (재정의 X)
- [ ] 모바일에서 long-press / suppressNextClick 같은 트릭을 쓰지 않는가
- [ ] tsc + check:text-integrity + validate:passives + build 모두 통과
- [ ] dev 서버에서 직접 확인했고 콘솔 에러 0건
```

---

## 4. 디자인 토큰 매핑 (빠른 참조)

자주 쓰는 것만 발췌. 전체는 `src/styles/tokens.css` 참조.

### 4.1 색
```
앞면(공격) :  var(--color-face-heads)   = #ef4444
뒷면(방어) :  var(--color-face-tails)   = #3b82f6
플레이어    :  var(--color-player)       = #22d3ee
적          :  var(--color-enemy)        = #f87171
안전        :  var(--color-tone-safe)    = #4ade80
중립 교환   :  var(--color-tone-trade)   = #fbbf24
위험        :  var(--color-tone-danger)  = #f87171
처치 가능   :  var(--color-tone-lethal)  = #c084fc
보상/희귀   :  var(--color-accent-gold)  = #facc15
일식 잔광   :  var(--color-accent-eclipse) = #a855f7
혈흔 포인트 :  var(--color-accent-blood) = #b91c1c
```

### 4.2 공간 (4px 스케일)
```
--space-1 (4) / -2 (8) / -3 (12) / -4 (16) / -5 (20) / -6 (24)
-7 (28) / -8 (32) / -10 (40) / -12 (48) / -16 (64) / -20 (80)
```

### 4.3 z-index 위계
```
무대 배경        : var(--z-stage-bg)        (1)
무대 효과        : var(--z-stage-fx)        (3)
스프라이트       : var(--z-stage-sprite)    (12)
머리 위 정보     : var(--z-stage-overlay)   (22)
결과 배너        : var(--z-stage-banner)    (36)
HUD              : var(--z-hud)             (50)
HUD raised       : var(--z-hud-raised)      (58)
툴팁             : var(--z-tooltip)         (74)
코치마크         : var(--z-coachmark)       (80)
Focus 배너       : var(--z-focus-banner)    (92)
모달 백드롭      : var(--z-modal-backdrop)  (100)
모달             : var(--z-modal)           (110)
모달 위 모달     : var(--z-modal-top)       (140)
토스트           : var(--z-toast)           (200)
```

### 4.4 모션 (GDD: 0.3~0.5s, 지연 금지)
```
즉시     : var(--motion-instant)  (0.08s)
빠름     : var(--motion-fast)     (0.15s)
기본     : var(--motion-base)     (0.30s)
느림     : var(--motion-slow)     (0.45s)
강조     : var(--motion-emphasis) (0.60s)
```

reducedMotion 활성 시 모든 모션이 0.01s로 강제됨. framer-motion `animate.start()`를 직접 호출하는 경우 컴포넌트 안에서 `gameOptions.reducedMotion` 가드 추가.

---

## 5. 작업 사례별 워크플로

### 사례 A: 새 화면(예: PvP 화면) 추가
1. `docs/ui-copy-guide.md`에 화면 카피 정의 추가
2. `src/styles/tokens.css`에 필요한 새 토큰 추가 (이미 있으면 재사용)
3. 컴포넌트는 Tailwind + 토큰 인라인 스타일 혼합 가능, 색은 토큰만
4. z-index가 필요하면 토큰 선택 (없으면 추가)
5. dev 서버 확인 + tsc/build 통과

### 사례 B: 기존 라벨 수정
1. `docs/ui-copy-guide.md`의 정식 라벨 확인. 없으면 추가.
2. grep으로 코드 전수 확인 (`Grep` 도구).
3. 모든 위치 일괄 교체 후 `npm run check:text-integrity` 통과 확인.
4. dev 서버에서 라벨이 노출되는 모든 화면 시각 확인.

### 사례 C: 새 적/패시브 추가
1. `dataMonsters.ts`에 적 정의 추가
2. `combatLogic.ts`의 `MonsterPassiveId` union에 새 패시브 ID 추가
3. **`src/data/dataMonsters.ts`의 `monsterPassiveSummaries`에 한국어 설명 동시 추가** ← 누락 시 placeholder 표시. (이전엔 CombatIntelPanel에 있었으나 데이터 레이어로 이동됨)
4. `npm run validate:passives` 통과

### 사례 D: CombatHUD 정보 추가
1. 추가하려는 정보가 이미 다른 컴포넌트에 있는지 확인 (IntelBar/OutcomeRail/Ticker/EnemyIntent/MobileOutcome 5곳).
2. 있으면 그곳을 확장. 없으면 위계상 가장 적합한 컴포넌트 선정.
3. 모바일 분기(`CombatMobileHud`)도 동시 갱신.

### 사례 E: 시각 효과 추가
1. framer-motion `animate.start()`는 `gameOptions.reducedMotion` 가드.
2. CSS animation은 자동으로 `body.is-reduced-motion *`에서 0.01ms로 강제됨.
3. 화면 셰이크/플래시는 항상 `reducedMotion=false`일 때만.

---

## 6. 검증 명령 묶음

```bash

# 빠른 검증 (라벨 변경, 작은 컴포넌트 수정)
npx tsc --noEmit
npm run check:text-integrity

# 표준 검증 (전투/패시브 영향)
npx tsc --noEmit
npm run check:text-integrity
npm run validate:passives

# 풀 검증 (PR 직전)
npm run check
# 또는 더 무거운
npm run release:check

# Stage3/콘텐츠 검증
npm run check:stage3-content
npm run check:stage3-assets

# 빌드
npm run build
```

---

## 7. AI 협업 메타 규칙

- **이 가이드 자체를 갱신**해도 좋다 (오히려 권장). 새 안티패턴을 발견하면 §2에 사례로 추가.
- 가이드 위반을 발견하면 *조용히 고치지 말고* 커밋 메시지 또는 PR 디스크립션에 명시.
- 기획자(박재석)와의 어휘 충돌이 생기면 *코드를 바꾸지 말고* 가이드 §2에서 결정 근거를 추가.
- 가이드와 기획서가 충돌하면 항상 *기획서*가 우선. 가이드는 기획서를 보조한다.
- 저장소 루트의 `AGENTS.md` / `CLAUDE.md`는 OMX/OMC가 자동 갱신하는 영역이라 손대지 않는다. 본 가이드는 프로젝트 폴더(``) 안의 `AGENTS.md` 한 곳에서만 관리.

---

## 8. 참조

- 프로젝트 개발 명령/아키텍처: 저장소 루트 `CLAUDE.md`, `AGENTS.md` (OMX/OMC 관리, 손대지 말 것)
- 후속 백로그 (다음 작업 우선순위): `docs/followup-backlog.md`
- 카피 가이드 (라벨 단일 진실): `docs/ui-copy-guide.md`
- 디자인 토큰: `src/styles/tokens.css`
- 콘텐츠 출처 원장: `docs/content-source-ledger.md`
