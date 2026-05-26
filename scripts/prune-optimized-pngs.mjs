import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const keepPngs = new Set([
  'apple-touch-icon.png',
  'icon-512.png',
]);

if (!existsSync(distDir)) {
  console.log('No dist directory to prune.');
  process.exit(0);
}

const manifestSource = readFileSync(path.join(rootDir, 'utils', 'generatedAssetManifest.ts'), 'utf8');
const manifestJson = manifestSource.match(/=\s*(\{[\s\S]*\});?\s*$/)?.[1];
if (!manifestJson) {
  throw new Error('Unable to parse utils/generatedAssetManifest.ts');
}

const publicToWebp = JSON.parse(manifestJson);
let removed = 0;

for (const pngPath of Object.keys(publicToWebp)) {
  const fileName = path.basename(pngPath);
  if (keepPngs.has(fileName)) continue;

  const distPngPath = path.join(distDir, ...pngPath.split('/'));
  const distWebpPath = path.join(distDir, ...publicToWebp[pngPath].split('/'));

  if (!existsSync(distPngPath) || !existsSync(distWebpPath)) continue;

  rmSync(distPngPath);
  removed += 1;
}

console.log(`Pruned ${removed} optimized PNG files from dist.`);
