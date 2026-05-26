import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const maxTotalBytes = 15 * 1024 * 1024;
const maxPngBytes = 512 * 1024;
const forbiddenPngRoots = [`${path.sep}assets${path.sep}`];

const walk = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() ? [fullPath] : [];
  });
};

const files = walk(distDir);
const totalBytes = files.reduce((total, file) => total + statSync(file).size, 0);
const pngFiles = files.filter((file) => file.toLowerCase().endsWith('.png'));
const pngBytes = pngFiles.reduce((total, file) => total + statSync(file).size, 0);
const forbiddenPngFiles = pngFiles.filter((file) => forbiddenPngRoots.some((root) => file.includes(root)));

const formatMb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
const failures = [];

if (totalBytes > maxTotalBytes) {
  failures.push(`dist total ${formatMb(totalBytes)} exceeds budget ${formatMb(maxTotalBytes)}`);
}

if (pngBytes > maxPngBytes) {
  failures.push(`dist PNG total ${formatMb(pngBytes)} exceeds budget ${formatMb(maxPngBytes)}`);
}

if (forbiddenPngFiles.length > 0) {
  failures.push(`optimized PNG files remain under assets/: ${forbiddenPngFiles.map((file) => path.relative(distDir, file)).join(', ')}`);
}

console.log(`dist total: ${formatMb(totalBytes)}`);
console.log(`dist PNG total: ${formatMb(pngBytes)} (${pngFiles.length} files)`);

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('PASS dist size budget');
