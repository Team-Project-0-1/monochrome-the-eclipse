import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const indexPath = path.join(distDir, 'index.html');
const basePath = '/monochrome-the-eclipse/';
const failures = [];

if (!existsSync(indexPath)) {
  failures.push('missing dist/index.html');
} else {
  const html = readFileSync(indexPath, 'utf8');
  if (!html.includes(basePath)) {
    failures.push(`dist/index.html does not include ${basePath}`);
  }

  const rootAssetRefs = [...html.matchAll(/\b(?:src|href)="\/(?!monochrome-the-eclipse\/|\/|#)([^"]+)"/g)]
    .map((match) => `/${match[1]}`);

  if (rootAssetRefs.length > 0) {
    failures.push(`root-relative asset refs without GitHub Pages base: ${rootAssetRefs.join(', ')}`);
  }

  if (!/\/monochrome-the-eclipse\/assets\/[^"]+\.js/.test(html)) {
    failures.push('dist/index.html is missing a JS entry under /monochrome-the-eclipse/assets/');
  }

  const basedRefs = [...html.matchAll(/\b(?:src|href)="\/monochrome-the-eclipse\/([^"]+)"/g)]
    .map((match) => match[1])
    .filter((ref) => !ref.startsWith('#'));

  for (const ref of basedRefs) {
    const cleanRef = ref.split(/[?#]/)[0];
    const targetPath = path.join(distDir, cleanRef);
    if (!existsSync(targetPath)) {
      failures.push(`base-path asset reference is missing from dist: /monochrome-the-eclipse/${ref}`);
    }
  }
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('PASS GitHub Pages base path checks');
