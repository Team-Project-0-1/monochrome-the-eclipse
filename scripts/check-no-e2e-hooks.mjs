import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Guards the deploy bundle: the VITE_E2E-only test hooks (window.__gameStore /
// __eventData / __detectPatterns in src/index.tsx) must be tree-shaken out of any
// build that did NOT set VITE_E2E. Run this only after a non-E2E `vite build`.
//
// The hooks live behind `if (import.meta.env.VITE_E2E)`, which Vite statically
// replaces with `false` (then dead-code-eliminates) when VITE_E2E is unset. If a
// refactor ever broke that gating, these property names would leak into a public
// deploy and expose the live store to the page — this check fails loudly first.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'dist', 'assets');
const forbidden = ['__gameStore', '__eventData', '__detectPatterns'];
const failures = [];

if (!existsSync(assetsDir)) {
  failures.push('missing dist/assets — run a production build before this check');
} else {
  const jsFiles = readdirSync(assetsDir).filter((file) => file.endsWith('.js'));
  if (jsFiles.length === 0) {
    failures.push('no JS bundles found in dist/assets');
  }

  for (const file of jsFiles) {
    const contents = readFileSync(path.join(assetsDir, file), 'utf8');
    for (const token of forbidden) {
      if (contents.includes(token)) {
        failures.push(`E2E hook "${token}" leaked into deploy bundle dist/assets/${file}`);
      }
    }
  }
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('PASS no E2E hooks present in deploy bundle');
