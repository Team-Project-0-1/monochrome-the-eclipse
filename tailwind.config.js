/** @type {import('tailwindcss').Config} */

// 디자인 토큰 브리지 — src/styles/tokens.css의 CSS 변수를 Tailwind 유틸리티로 노출한다.
// 값을 복제하지 않고 var(--token)을 참조하므로 단일 출처는 tokens.css에 유지되고,
// 접근성 모드 등 런타임 테마 전환도 그대로 동작한다.
// 안전 원칙: Tailwind 기본 키(sm/md/lg/xl, text-sm 등)를 덮지 않는다 — 덮으면 기존
// 사용처의 시각이 바뀐다. 기본과 충돌하지 않는 신규 토큰명만 추가한다.
// 미사용 유틸은 빌드에서 생성되지 않으므로 현재 dist CSS에는 영향이 없다(점진 도입용).
const color = (name) => `var(--color-${name})`;

const colorTokens = {
  // 배경 / 표면 / 경계 / 잉크
  'bg-deep': color('bg-deep'),
  'bg-base': color('bg-base'),
  'bg-raised': color('bg-raised'),
  'bg-overlay': color('bg-overlay'),
  'bg-scrim': color('bg-scrim'),
  'surface-1': color('surface-1'),
  'surface-2': color('surface-2'),
  'surface-3': color('surface-3'),
  'border-faint': color('border-faint'),
  'border-soft': color('border-soft'),
  'border-strong': color('border-strong'),
  'ink-primary': color('ink-primary'),
  'ink-secondary': color('ink-secondary'),
  'ink-muted': color('ink-muted'),
  'ink-faint': color('ink-faint'),
  'ink-inverse': color('ink-inverse'),
  // 동전 앞/뒤면
  'face-heads': color('face-heads'),
  'face-heads-strong': color('face-heads-strong'),
  'face-heads-soft': color('face-heads-soft'),
  'face-heads-on': color('face-heads-on'),
  'face-tails': color('face-tails'),
  'face-tails-strong': color('face-tails-strong'),
  'face-tails-soft': color('face-tails-soft'),
  'face-tails-on': color('face-tails-on'),
  'face-unknown': color('face-unknown'),
  'face-unknown-soft': color('face-unknown-soft'),
  // 진영(플레이어/적)
  player: color('player'),
  'player-strong': color('player-strong'),
  'player-soft': color('player-soft'),
  'player-on': color('player-on'),
  enemy: color('enemy'),
  'enemy-strong': color('enemy-strong'),
  'enemy-soft': color('enemy-soft'),
  'enemy-on': color('enemy-on'),
  // 가치 톤(안전/거래/위험/치명)
  'tone-safe': color('tone-safe'),
  'tone-safe-soft': color('tone-safe-soft'),
  'tone-trade': color('tone-trade'),
  'tone-trade-soft': color('tone-trade-soft'),
  'tone-danger': color('tone-danger'),
  'tone-danger-soft': color('tone-danger-soft'),
  'tone-lethal': color('tone-lethal'),
  'tone-lethal-soft': color('tone-lethal-soft'),
  'tone-empty': color('tone-empty'),
  'tone-empty-soft': color('tone-empty-soft'),
  // 전투 의미색
  damage: color('damage'),
  defense: color('defense'),
  heal: color('heal'),
  'accent-blood': color('accent-blood'),
  'accent-blood-soft': color('accent-blood-soft'),
  'accent-eclipse': color('accent-eclipse'),
  'accent-gold': color('accent-gold'),
  'accent-memory': color('accent-memory'),
  // 상태이상
  'status-amplify': color('status-amplify'),
  'status-pursuit': color('status-pursuit'),
  'status-mark': color('status-mark'),
  'status-counter': color('status-counter'),
  'status-curse': color('status-curse'),
  'status-resonance': color('status-resonance'),
  'status-bleed': color('status-bleed'),
  'status-shatter': color('status-shatter'),
  'status-seal': color('status-seal'),
  'status-buff': color('status-buff'),
  'status-debuff': color('status-debuff'),
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: colorTokens,
      // 신규 키만 — Tailwind 기본(sm/md/lg/xl/2xl)은 덮지 않는다.
      borderRadius: {
        pill: 'var(--radius-pill)',
        circle: 'var(--radius-circle)',
      },
      boxShadow: {
        'glow-player': 'var(--shadow-glow-player)',
        'glow-enemy': 'var(--shadow-glow-enemy)',
        'glow-danger': 'var(--shadow-glow-danger)',
        'glow-safe': 'var(--shadow-glow-safe)',
      },
      fontFamily: {
        // src/styles/tokens.css의 --font-family-display와 일치.
        // src/index.css의 @layer utilities .font-orbitron와 동일.
        orbitron: ['Orbitron', 'system-ui', 'sans-serif'],
        display: ['var(--font-family-display)', 'Orbitron', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
