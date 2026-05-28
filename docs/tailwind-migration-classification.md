# Tailwind 재도입 — 셀렉터 분류 (Phase C-2)

> 2026-05-29 작성. `src/index.css`(16,865줄)를 Tailwind 정식 빌드 파이프라인으로 전환하기 위한 **사전 분류 문서**.
> 이 문서의 분류가 100% 완성되기 전에는 어떤 추출/재작성도 하지 않는다 — 잘못 drop된 손글 규칙은 빌드가 통과해도 조용히 사라지기 때문이다.

## 배경 (현재 상태의 진실)

- `tailwind-source.css`(85줄)는 **stale**. `@tailwind` 디렉티브 + `@layer base`(body/scrollbar) + `@layer utilities`(font-orbitron/scanlines/perspective/rotate-y/animate-pulse-shadow)만 있고, `.combat-*` 같은 손글 컴포넌트 CSS는 전혀 없다.
- `src/index.css`(16,865줄)는 한때 `tailwind-source.css`의 컴파일 출력이었으나, 이후 **누군가 직접 손으로 편집하고 재생성을 멈췄다**. 손글 규칙(`.run-status-modal` 등)이 Tailwind 컴파일 출력(`.scanlines`, `.perspective`, `@keyframes scan`) 한가운데 임의 위치에 삽입되어 있다.
- 즉 src/index.css는 **컴파일 출력 + 손글이 라인 단위로 뒤엉킨 하이브리드**다. 라인 위치로는 분리 불가, 셀렉터 이름으로만 분리 가능.

## 분류 방법론

`grep -oE '^\.[a-zA-Z][a-zA-Z0-9_-]*' src/index.css | sort -u` → **836개 unique top-level 셀렉터**. 각각을 세 부류로 분류한다.

### (a) DROP — Tailwind 유틸리티 (재생성됨, 보존 불필요)
표준 유틸리티 클래스 전부. content path 스캔으로 Tailwind가 다시 생성한다.
- 레이아웃/박스: `.flex`, `.grid`, `.grid-cols-{1,2}`, `.items-*`, `.justify-*`, `.gap-*`, `.p{,x,y,t,b,l,r}-*`, `.m{,x,y,t,b,l,r}-*`, `.space-y-*`, `.w-*`, `.h-*`, `.min-h-*`, `.max-w-*`, `.inset-*`, `.top/left/right/bottom-*`, `.order-*`, `.overflow-*`, `.relative`, `.absolute`, `.fixed`, `.hidden`
- 타이포: `.text-{xs..6xl}`, `.text-{color}-{n}`, `.font-{black,bold,medium,semibold}`, `.leading-*`, `.tracking-*`, `.uppercase`, `.italic`, `.underline`, `.truncate`, `.line-clamp-2`, `.whitespace-pre-wrap`, `.text-{left,center,right}`
- 색/테두리/그림자: `.bg-{color}-{n}`, `.bg-gradient-*`, `.from/via/to-*`, `.border*`, `.border-{color}-{n}`, `.rounded*`, `.shadow*`, `.ring*`, `.opacity-*`, `.drop-shadow*`, `.blur*`, `.backdrop-blur*`, `.brightness-*`, `.grayscale`, `.filter`
- 인터랙션/모션: `.transition*`, `.duration-*`, `.scale-105`, `.transform`, `.cursor-*`, `.pointer-events-none`, `.sr-only`, `.z-{0,10,20,40,50}`
- variant 베이스: `.after`, `.before`, `.hover`, `.focus`, `.focus-visible`, `.active`, `.disabled`, `.peer`, `.group`
- arbitrary value의 잘린 prefix(`.bg-`, `.text-`, `.h-`, `.grid-cols-` 등 끝에 `-`만): grep 아티팩트. 원본은 `bg-[radial-gradient(...)]` 형태 → JSX에서 Tailwind가 재생성.

### (b) PORT — `@layer utilities/base` 원본 (새 엔트리로 이식)
`tailwind-source.css`에 이미 정의된 커스텀 유틸리티. 새 엔트리의 `@layer utilities`로 그대로 이식.
- `.font-orbitron`, `.scanlines::before`, `.perspective`, `.preserve-3d`, `.rotate-y-0`, `.rotate-y-180`, `.animate-pulse-shadow`
- `@keyframes scan`, `@keyframes pulse-shadow`
- `@layer base`: body font, `::-webkit-scrollbar*`

### (c) PRESERVE — 손글 컴포넌트 CSS (반드시 보존, ~344개 + 누락분)
도메인 prefix를 가진 모든 셀렉터. 새 엔트리의 `@layer components` 또는 별도 import로 보존.

**확인된 prefix**: `combat-*`, `duel-*`, `exploration-*`, `shop-*`, `rest-*`, `event-*`, `menu-*`, `mini-map-*`, `route-*`, `run-status-*`, `run-result-*`, `inventory-*`, `tutorial-*`, `character-*`, `memory-*`, `effect-*`, `skill-*`, `enemy-*`, `coin-*`, `pattern-*`, `resource-*`, `node-*`, `game-*`, `entity-*`, `keyword-*`, `victory-*`, `defeat-*`, `stage-clear-*`, `token-face-*`, `portrait-*`, `sprite-*`, `vital-*`, `decision-*`, `focus-banner-*`, `synergy-*`

> 주의: `duel-*`(21개)는 초기 prefix 리스트에서 누락됐다가 prefix 집계에서 발견됨. 추출 시 반드시 포함.

### ⚠️ DROP 후보 audit에서 발견된 손글 누락 (치명적 — 반드시 PRESERVE)

prefix 패턴에 안 잡혀 Tailwind로 오분류될 뻔한 손글 규칙:

| 셀렉터 | 정체 |
|---|---|
| `.contrast-button-danger` / `-dark` / `-disabled` / `-light` | 고대비 버튼 (손글) |
| `.contrast-panel` / `-cyan` / `-gold` / `-neutral` / `-red` | 고대비 패널 (손글) |
| `.currency-button-icon-img` / `.currency-inline-icon-img` | 통화 아이콘 이미지 (손글) |
| `.screen-card-header` | 화면 카드 헤더 (손글) |

## arbitrary-value 클래스 (config 영향)

JSX에서 정적 문자열로 사용되어 Tailwind v3가 native 처리한다. content path가 `./src/**/*.{ts,tsx}`를 포함하면 추출됨.
- `bg-[radial-gradient(...)]` (배경 그라데이션 8종+)
- `grid-cols-[18rem_minmax(0,1fr)]` 등 (7종)
- `min-h-[calc(100vh-1.5rem)]`, `h-[90vh]`, `max-h-[calc(...)]`
- `text-[clamp(2.65rem,8.8vw,7.5rem)]`, `text-[10px]`, `text-[11px]`
- `shadow-[...]`, `tracking-[0.14em..0.3em]`, `w-[560px]`

**다음 세션 검증 항목**: 동적 className 조합(`text-${color}-300` 같은 런타임 문자열 결합)이 있으면 Tailwind가 못 잡으므로 safelist 필요. `grep -rE "[a-z]+-\$\{" src/`로 확인.

## ⚠️ 블로커: 툴체인 설치 (2026-05-29)

`npm install -D tailwindcss@^3 postcss autoprefixer`가 **SSL 인증서 검증 실패**로 막혔다.

```
npm error code UNABLE_TO_VERIFY_LEAF_SIGNATURE
npm error request to https://registry.npmjs.org/autoprefixer failed,
         reason: unable to verify the first certificate
```

현재 환경(회사 네트워크/프록시/방화벽이 자체 서명 인증서로 트래픽을 가로채는 것으로 추정)에서 npm 레지스트리 인증서 체인을 검증하지 못한다. 설치가 선행되어야 Tailwind 재도입을 진행할 수 있다. 해결 방법(택 1):

1. 신뢰 네트워크(개인 핫스팟 등)에서 설치 후 다시 사내망 복귀
2. 사내 CA 인증서 등록: `npm config set cafile <회사 CA 경로>` 또는 환경변수 `NODE_EXTRA_CA_CERTS=<경로>`
3. 임시 우회(보안 약화, 비권장): `npm config set strict-ssl false` → 설치 → 즉시 `npm config set strict-ssl true`

설치가 성공하면 `tailwind.config.js` / `postcss.config.js`를 다시 작성한다(내용은 아래 작업 순서 2번 참조). 두 config 파일은 이번 세션에 작성했다가 설치 실패로 빌드가 깨져 **제거**했다 — 설치 성공 후 재생성 필요.

## 다음 세션 작업 순서 (추출은 여기서 시작)

0. **선행**: 위 블로커 해소 → `npm install -D tailwindcss@^3 postcss autoprefixer` 성공.
   - `tailwind.config.js`: `content: ['./index.html', './src/**/*.{ts,tsx}']`, `theme.extend.fontFamily.orbitron`.
   - `postcss.config.js`: `{ plugins: { tailwindcss: {}, autoprefixer: {} } }`.

1. 위 PRESERVE prefix + 누락 12개로 손글 규칙 전체를 한 파일(예: `src/styles/components.css`)로 추출. **추출 후 원본과 셀렉터 개수 대조** (344 + 12 + media query 내부 정의).
2. 새 엔트리 `src/index.css` 재작성: `@tailwind base/components/utilities` + `@import './styles/tokens.css'` + PORT 원본 + 손글 import.
3. `index.tsx` import 확인.
4. 빌드 → **dist CSS 사이즈는 306kB → 150~200kB로 크게 감소가 정상** (tree-shaking). "사이즈 불변" 체크는 더 이상 유효하지 않음.
5. **사용자 주도 dev 스모크 테스트**: 메뉴/캐릭터/탐험/전투/상점/휴식/사건/제단/보상/결과 전 화면을 dev에서 육안 확인. 누락 prefix 발견 시 반복.
