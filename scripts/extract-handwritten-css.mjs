// src/index.css(Tailwind 컴파일 출력 + 손글 혼합)에서 손글 컴포넌트 CSS만 추출.
// Tailwind 유틸리티/preflight와 src/index.css가 복원하는 @layer 원본은 제외한다.
//
// 사용법:
//   node scripts/extract-handwritten-css.mjs          # 카운트/audit만 출력 (파일 안 씀)
//   node scripts/extract-handwritten-css.mjs --write   # src/styles/components.css 생성
//
// 분류는 docs/tailwind-migration-classification.md의 prefix 목록을 따른다.
import postcss from 'postcss';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cssPath = path.join(root, 'src', 'index.css');
const outPath = path.join(root, 'src', 'styles', 'components.css');
const WRITE = process.argv.includes('--write');

// 손글 컴포넌트 prefix. selector에 `.<prefix>`가 substring으로 들어가면 보존.
const PRESERVE = [
  'combat-', 'duel-', 'exploration-', 'shop-', 'rest-', 'event-', 'menu-', 'mini-map-',
  'route-', 'run-status-', 'run-result-', 'inventory-', 'tutorial-', 'character-', 'memory-',
  'effect-', 'skill-', 'enemy-', 'coin-', 'pattern-', 'resource-', 'node-', 'game-', 'entity-',
  'keyword-', 'victory-', 'defeat-', 'stage-clear-', 'token-face-', 'portrait-', 'sprite-',
  'vital-', 'decision-', 'focus-banner-', 'synergy-', 'contrast-button-', 'contrast-panel',
  'currency-', 'screen-card-', 'status-effect-', 'reward-',
];

// prefix 매칭이 안 되지만 보존해야 하는 손글 셀렉터:
//  - :root 커스텀 변수 블록(--mono-*, --cr-* 등; tokens.css와 별개)
//  - 접근성 모드 토글(App.tsx가 html dataset로 설정)
const keepSpecialSelector = (sel) => {
  const s = sel.trim();
  if (s.startsWith(':root')) return true;
  return ['[data-reduce-motion', '[data-high-contrast', '[data-large-text'].some((a) => s.includes(a));
};

// src/index.css의 @layer utilities가 복원하는 원본 → 추출 대상 아님(drop OK).
const SOURCE_KEYFRAMES = ['scan', 'pulse-shadow'];

// dropped 셀렉터가 Tailwind 유틸리티로 "보이는지" 판정용 힌트(audit 노이즈 제거).
const TAILWIND_HINTS = [
  'flex', 'grid', 'block', 'inline', 'table', 'hidden', 'absolute', 'relative', 'fixed', 'sticky', 'static',
  'bg-', 'text-', 'border', 'rounded', 'shadow', 'ring', 'outline',
  'p-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-', 'm-', 'mx-', 'my-', 'mt-', 'mb-', 'ml-', 'mr-',
  'gap', 'space-', 'w-', 'h-', 'min-', 'max-', 'top-', 'left-', 'right-', 'bottom-', 'inset', 'z-',
  'opacity', 'transition', 'duration', 'delay', 'ease', 'transform', 'scale', 'rotate', 'translate', 'skew',
  'font-', 'leading', 'tracking', 'uppercase', 'lowercase', 'capitalize', 'italic', 'underline', 'truncate',
  'overflow', 'object-', 'order', 'cursor', 'pointer-events', 'select-', 'resize',
  'from-', 'via-', 'to-', 'backdrop', 'blur', 'brightness', 'contrast-', 'grayscale', 'saturate', 'filter',
  'drop-shadow', 'sr-only', 'not-sr-only', 'whitespace', 'break-', 'line-clamp', 'decoration', 'list-',
  'items-', 'justify-', 'content-', 'self-', 'place-', 'col-', 'row-', 'flex-', 'basis-', 'grow', 'shrink',
  'after', 'before', 'hover', 'focus', 'active', 'disabled', 'peer', 'group', 'first', 'last', 'odd', 'even',
  'sm:', 'md:', 'lg:', 'xl:', '2xl:', 'aspect', 'divide', 'animate-', 'will-change', 'origin-',
  'visible', 'invisible', 'isolate', 'mix-blend', 'antialiased', 'appearance', 'accent-', 'fill-', 'stroke-',
  'snap', 'touch-', 'scroll-', 'align-', 'vertical-', 'float', 'clear', 'box-', 'container', 'columns',
];

const selHandwritten = (sel) => PRESERVE.some((p) => sel.includes('.' + p)) || keepSpecialSelector(sel);

// `.after\:absolute::after` → `after:absolute::after` 로 정규화 후 Tailwind 힌트 매칭.
const looksTailwind = (sel) => {
  const cls = sel.trim().replace(/^[.:]+/, '').replace(/\\/g, '');
  return TAILWIND_HINTS.some((h) => cls.startsWith(h));
};

const css = readFileSync(cssPath, 'utf8');
const ast = postcss.parse(css);

const kept = postcss.root();
let keepRules = 0;
let dropRules = 0;
const suspiciousDropped = [];
const keptKeyframes = [];
const unknownAt = [];

const classifyRule = (rule, target) => {
  if (rule.selectors.some(selHandwritten)) {
    if (target) target.append(rule.clone());
    keepRules += 1;
    return true;
  }
  dropRules += 1;
  // 손글일 수도 있는데 prefix에 안 걸린 것: Tailwind 힌트에 안 맞는 selector
  const suspect = rule.selectors.filter((s) => !looksTailwind(s) && !selHandwritten(s));
  if (suspect.length) suspiciousDropped.push(suspect.join(', ').slice(0, 110));
  return false;
};

ast.each((node) => {
  if (node.type === 'rule') {
    classifyRule(node, kept);
  } else if (node.type === 'atrule') {
    const n = node.name;
    if (n === 'media' || n === 'supports' || n === 'container') {
      const at = postcss.atRule({ name: n, params: node.params });
      node.walkRules((r) => classifyRule(r, at));
      if (at.nodes && at.nodes.length) kept.append(at);
    } else if (n === 'keyframes') {
      if (SOURCE_KEYFRAMES.includes(node.params.trim())) {
        // src/index.css가 복원
      } else {
        kept.append(node.clone());
        keptKeyframes.push(node.params);
      }
    } else if (n === 'font-face') {
      kept.append(node.clone());
    } else if (n !== 'charset' && n !== 'import' && n !== 'tailwind' && n !== 'layer') {
      unknownAt.push(`@${n} ${node.params}`.slice(0, 80));
    }
  }
});

console.log('=== EXTRACTION COUNTS ===');
console.log('keep rules :', keepRules);
console.log('drop rules :', dropRules);
console.log('kept @keyframes :', keptKeyframes.join(', ') || '(none)');
console.log('unknown at-rules:', unknownAt.length ? unknownAt.join(' | ') : '(none)');
console.log('');
console.log(`=== SUSPICIOUS DROPPED (${suspiciousDropped.length}) — audit: any of these hand-written? ===`);
if (suspiciousDropped.length === 0) {
  console.log('  (none — every dropped selector looks like a Tailwind utility)');
} else {
  [...new Set(suspiciousDropped)].forEach((s) => console.log('  ?', s));
}

if (WRITE) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  const header = [
    '/* 손글 컴포넌트 CSS — scripts/extract-handwritten-css.mjs 로 src/index.css에서 추출.',
    ' * Tailwind 유틸리티/preflight와 @layer 원본(src/index.css가 복원)은 제외됨.',
    ' * 이 파일을 직접 편집해도 되지만, src/index.css 재추출 시 덮어쓰지 않도록 주의. */',
    '',
    '',
  ].join('\n');
  writeFileSync(outPath, header + kept.toString() + '\n');
  console.log('');
  console.log('WROTE', path.relative(root, outPath), `(${kept.nodes.length} top-level nodes)`);
}
