# z-index 토큰 마이그레이션 맵 (P1-1)

> 2026-05-29 작성, 2026-05-30 갱신. `src/styles/components.css`의 raw `z-index` 값을 디자인 토큰(`src/styles/tokens.css` §10의 `--z-*`)으로 전환하기 위한 맵.
>
> **bulk 일괄 치환은 위험하다.** 같은 범위 내 1단위 차이(예: 26/27/28/29)가 의도된 stacking 순서일 수 있어, 토큰 하나로 통일하면 두 요소가 화면에서 겹치는 순간에만 드러나는 은밀한 시각 회귀가 생긴다.

## 채택 방침 — "현재 화면 보존" (2026-05-30, 사용자 결정)

값이 바뀌는 토큰화는 **하지 않는다.** 각 요소는 **현재 값과 정확히 일치하는 토큰으로만** 전환한다(=순수 리네임, computed 변화 0). 순수 보존이 불가능한 항목(중간 토큰이 없어 값이 이동해야 하는 경우)은 **raw로 두고 보류**하며, 새 중간 토큰 추가나 케이스별 육안 승인은 별도 결정으로 미룬다.

근거: z-index 회귀가 실제로 shipped된 이력 없음(`git log` 확인) → 현재 불일치는 가설적(preemptive). 서두를 이유 없고, 시각 회귀 0이 최우선.

## ⚠️ 값-역할 불일치 주의 (2026-05-30 발견)

맵 초안은 z-index를 **값**으로 토큰에 매핑했으나, 실제 셀렉터의 **역할**과 어긋나는 사례가 있다. 토큰명을 그대로 신뢰하지 말고 셀렉터를 직접 확인할 것.
- `--z-coachmark`(80)인데 실제 코치마크 `.tutorial-coachmark`는 raw 60(툴팁 70~76보다 아래)이었다 → 값 보존 위해 `--z-hud-raised`(58)로 전환함.
- raw 80은 코치마크가 아니라 `.combat-flash`였다 → 값 일치라 `--z-coachmark`로 전환(레이어 의미만 일치, 역할명은 불일치).
- §10 밴드 주석은 `90~99: 페이지 가드 (FocusBanner)`라 적었지만, 공용 FocusBanner(`.combat-focus-banner.is-focus`, 기본 variant)는 raw **70**으로 intel-bar(76)·intel-modal(75)보다 **아래**다. 90대에 있는 건 `.is-notice` variant(92)뿐. → 70/75/76 전환 시 값은 보존하되 토큰명을 `--z-focus-banner-base`로 분리해 이 사실을 명시함. 밴드 주석과 실제 base 값(70)의 괴리는 잠재 비일관성으로 남김(값 이동 금지 방침상 보정 안 함).

## ✅ 완료

### 무위험 trivial (commit c23161d, 이전 세션)
| raw | 토큰 | 비고 |
|---|---|---|
| `-1` | `var(--z-below)` | 1곳 |
| `0` | `var(--z-base)` | 8곳 (`!important` 변형 1곳 포함) |
| `2000` | `var(--z-modal-top)` | 1곳. `combat-intel-modal` 과도값 정상화 |

### 값 일치 전환 (2026-05-30 세션, 회귀 0)
| raw | 토큰 (값) | 곳 | 커밋 |
|---|---|---|---|
| `80` | `var(--z-coachmark)` (80) | 1 (`.combat-flash`) | 80·92 묶음 |
| `92` | `var(--z-focus-banner)` (92) | 1 (`.combat-focus-banner.is-notice`) | 80·92 묶음 |
| `60` | `var(--z-hud-raised)` (58) | 1 (`.tutorial-coachmark`) | −2, 59에 타 요소 없음·58 동률은 DOM 순서로 보존 |
| `1` | `var(--z-stage-bg)` (1) | 12 | 값일치 일괄 |
| `3` | `var(--z-stage-fx)` (3) | 3 | 값일치 일괄 |
| `12` | `var(--z-stage-sprite)` (12) | 1 | 값일치 일괄 |
| `36` | `var(--z-stage-banner)` (36) | 2 | 값일치 일괄 |

### 전용 토큰 신설 (2026-05-30 세션, #7·#9, 회귀 0)

기존 토큰에 값 일치 멤버가 없는 값들은 **값 보존 + 역할 분리**를 위해 `tokens.css` §10에 전용 토큰을 신설하고 1:1 매핑했다(값 이동 0). "방침상 진행하려면 새 토큰 추가 또는 육안 승인" 중 **새 토큰 추가** 경로. 85(#9)는 "80이면 동률·92면 과상승"이라 두 기존 토큰 어디에도 못 붙던 값 → 전용 토큰으로 결정 자체를 해소.

| raw | 신설 토큰 (값) | 곳 | 비고 |
|---|---|---|---|
| `76` | `var(--z-intel-bar)` (76) | 1 (`.combat-intel-bar`) | 인텔 바 — 자기 모달(75) 위 헤더 nav |
| `75` | `var(--z-intel-modal)` (75) | 1 (`.combat-intel-modal`) | 인텔 바가 여는 dialog 패널 |
| `70` | `var(--z-focus-banner-base)` (70) | 1 (`.combat-focus-banner` 기본=`.is-focus`) | `.is-notice`만 `--z-focus-banner`(92) |
| `85` | `var(--z-skill-detail)` (85) | 1 (`.combat-active-skill-detail`) | 호버 팝오버. coachmark(80) 위·focus-banner(92) 아래 보존 |

검증: 브라우저 computed `getComputedStyle` 주입 측정 — 네 셀렉터 모두 76/75/70/85 정확 보존(pass). `--z-tooltip`(74)은 실제 툴팁 용도로 보존, 이 그룹에선 미사용.

### stage-overlay 전용 토큰 (2026-05-30 세션, #8, 회귀 0)

20·26·27·28·29 버킷(10곳)은 캐노니컬 `--z-stage-overlay`(22)와 값이 달라 토큰 1개로 통일하면 적층이 무너진다. **값 보존 + 역할 분리** 경로로 §10에 전용 토큰 7개를 신설하고 1:1 매핑(값 이동 0). 특히 20은 무대(클래시)·상점 헤더·코인 배지 3개 서브시스템이 *값만 공유*(각자 다른 stacking context라 실제로 경쟁 안 함)라 역할별 3토큰으로 분리.

| raw | 신설 토큰 (값) | 곳 | 비고 |
|---|---|---|---|
| `20` | `var(--z-stage-overlay-low)` (20) | 2 (`.combat-clash-meter`, `.combat-clash-compare`) | 중앙 클래시 — 오버레이(22) 아래 |
| `20` | `var(--z-shop-header)` (20) | 1 (`.shop-header`) | 상점 sticky 헤더(`max-width:767px` 게이트). stage 무관 |
| `20` | `var(--z-coin-badge)` (20) | 1 (`.coin-slot-badge`) | 코인 슬롯 배지. stage 무관 |
| `26` | `var(--z-stage-overlay-card)` (26) | 1 (`.combat-hud-card`) | |
| `27` | `var(--z-stage-overlay-vitals)` (27) | 2 (`.combat-overhead-vitals`, `.combat-enemy-strip`) | |
| `28` | `var(--z-stage-overlay-fx)` (28) | 2 (`.combat-foot-status-tray`, `.combat-motion-arc`/`-impact-burst`/`-class-effect`) | ⚠️ 아래 발견 참조 |
| `29` | `var(--z-stage-overlay-top)` (29) | 1 (`.combat-enemy-overhead-stack`) | 오버레이 최상단 |

⚠️ **발견 — `.combat-foot-status-tray`의 28은 그림자(shadowed) 선언**: 6851행 테마 오버라이드 블록이 같은 셀렉터에 `z-index: 31`(raw)을 *더 나중에* 선언 → 동일 specificity라 캐스케이드상 **효과값은 31**(보류 `31/32/34` 버킷 소속, 미수정). 799행의 28은 가려진 선언이므로 토큰 치환은 순수 리네임(효과 불변). 즉 이 셀렉터의 raw 31은 여전히 보류로 남는다.

검증: 브라우저 `getComputedStyle` 주입 측정 — 10곳 효과값 전부 보존. hud-card 26·overhead-vitals/enemy-strip 27·motion-arc 28·enemy-overhead-stack 29·clash-meter/clash-compare/coin-slot-badge 20·shop-header 토큰 20(미디어 게이트). foot-status-tray만 **31**(위 발견대로 그림자 31 규칙이 효과값), 나머지 9곳은 매핑값 그대로(pass).

누계: 값일치 21 + 전용토큰 신설(#7·#9 4 + #8 10) = 비-trivial 54 중 **35곳 전환**, **19곳 잔존**.

## ⏸️ 보류 — 값이 바뀌어야 하는 멤버 (별도 결정 필요)

방침상 값 이동은 금지이므로 아래는 모두 raw 유지. 진행하려면 **새 중간 토큰 추가** 또는 **케이스별 브라우저 육안 승인**이 필요하다. "토큰 1개로 bucket collapse"가 불가한 이유는 1 vs 2 등 내부 값 차이가 **load-bearing**(같은 컴포넌트 내 의도된 국소 레이어링)이기 때문.

| 보류 raw | 개수 | 가까운 토큰 | load-bearing 근거 / 위험 |
|---|---|---|---|
| 2 | 6 | `--z-stage-bg`(1) | ⚠️ `.run-status-modal`(1)/`-header`(2), `.event-player-figure`(2)가 다른 figure(1) 위, `.character-class-card > .relative` 콘텐츠(2)가 오버레이(1) 위. 2→1 시 적층 붕괴 |
| 4, 5, 8 | 5 | `--z-stage-fx`(3) | 무대 이펙트 세분. 3과의 상대 순서 확인 후에만 |
| 10, 15, 18 | 4 | `--z-stage-sprite`(12) | 방향 혼재(10↑, 15·18↓). 특히 `.combat-sprite-slot.is-attacking`(18) 하강 시 공격 스프라이트 적층 변화 |
| 31, 32, 34 | 4 | `--z-stage-banner`(36) | 31~34→36 상승. 순서 의도 확인. **주의**: 31 중 1곳은 `.combat-foot-status-tray` 오버라이드(6851행)로, #8의 그림자 28을 덮어 효과값을 지배 — 이 버킷 처리 시 함께 본다 |

> ~~70, 75, 76~~ (#7), ~~85~~ (#9), ~~20, 26, 27, 28, 29~~ (#8) → 전용 토큰 신설로 해소 (위 ✅ 완료 참조). 보류 합계 33 → **19곳**.

## 보류 해소 절차 (다음 세션)

1. 한 보류 그룹 선택 → 해당 raw 값 셀렉터를 grep으로 전부 확인.
2. 같은 그룹 내 셀렉터들이 화면에서 겹치는지·순서가 중요한지 판단.
   - 안 겹치면 단일 토큰 통일 OK(육안 확인 후).
   - 겹치고 순서 중요하면 `tokens.css`에 중간 토큰 추가(예: `--z-stage-bg-raised: 2`) 후 매핑.
3. 치환 → `npm run build` → 영향 화면 `npm run dev` 육안(특히 두 요소가 겹치는 상태) → 커밋(1 그룹 = 1 commit).
4. ~~20대 그룹(20,26~29)~~ → #8에서 전용 토큰으로 해소 완료. 남은 보류는 `2` / `4,5,8` / `10,15,18` / `31,32,34`.

## 셀렉터 빠른 조회

```
grep -nE "z-index:\s*<값>;" src/styles/components.css
```
