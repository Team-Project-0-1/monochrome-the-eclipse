import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = path.join(rootDir, '.tmp');
const outfile = path.join(tempDir, 'passive-validation.mjs');

await mkdir(tempDir, { recursive: true });
await build({
  entryPoints: [path.join(rootDir, 'scripts', 'validate-passives.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  logLevel: 'silent',
});

try {
  await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
} finally {
  await rm(outfile, { force: true });
}
