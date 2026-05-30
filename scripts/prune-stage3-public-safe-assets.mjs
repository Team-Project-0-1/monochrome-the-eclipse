import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicSafeValue = process.env.VITE_STAGE3_PUBLIC_SAFE_MODE?.toLowerCase();
const isStage3PublicSafeMode = ['1', 'true', 'yes', 'on'].includes(publicSafeValue ?? '');

if (!isStage3PublicSafeMode) {
  console.log('Stage 3 public-safe mode is off; keeping generated Stage 3 assets in dist.');
  process.exit(0);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

if (!existsSync(distDir)) {
  console.log('No dist directory to prune for Stage 3 public-safe mode.');
  process.exit(0);
}

const resolveDistPath = (...segments) => {
  const target = path.resolve(distDir, ...segments);
  if (target !== distDir && !target.startsWith(`${distDir}${path.sep}`)) {
    throw new Error(`Refusing to prune outside dist: ${target}`);
  }
  return target;
};

const sensitiveTargets = [
  ['assets', 'monsters', 'stage3-generated'],
  ['assets', 'backgrounds', 'combat-stage-3-eclipse-sanctum.png'],
  ['assets', 'backgrounds', 'combat-stage-3-eclipse-sanctum.webp'],
  ['assets', 'backgrounds', 'event-stage3-resonance-relay.png'],
  ['assets', 'backgrounds', 'event-stage3-resonance-relay.webp'],
  ['assets', 'backgrounds', 'event-stage3-flesh-vat.png'],
  ['assets', 'backgrounds', 'event-stage3-flesh-vat.webp'],
  ['assets', 'backgrounds', 'event-stage3-eclipse-sanctuary.png'],
  ['assets', 'backgrounds', 'event-stage3-eclipse-sanctuary.webp'],
];

let removed = 0;

for (const targetSegments of sensitiveTargets) {
  const target = resolveDistPath(...targetSegments);
  if (!existsSync(target)) continue;

  rmSync(target, { recursive: true, force: true });
  removed += 1;
}

const spriteManifestPath = resolveDistPath('assets', 'monsters', 'sprites', 'manifest.json');
let manifestEntriesRemoved = 0;

if (existsSync(spriteManifestPath)) {
  const manifest = JSON.parse(readFileSync(spriteManifestPath, 'utf8'));

  const removeStage3GeneratedEntries = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;

    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry === 'string' && entry.includes('stage3-generated/')) {
        delete value[key];
        manifestEntriesRemoved += 1;
      } else {
        removeStage3GeneratedEntries(entry);
      }
    }
  };

  removeStage3GeneratedEntries(manifest);

  if (manifestEntriesRemoved > 0) {
    writeFileSync(spriteManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

console.log(`Pruned ${removed} Stage 3 public-safe asset target${removed === 1 ? '' : 's'} and ${manifestEntriesRemoved} manifest entr${manifestEntriesRemoved === 1 ? 'y' : 'ies'} from dist.`);
