import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// After the app was flattened, the app and the repo share a single root.
// The two names are kept to make read sites self-documenting.
const appDir = path.resolve(__dirname, '..');
const repoDir = appDir;

const failures = [];

const readText = (baseDir, relativePath) => {
  const fullPath = path.join(baseDir, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`missing ${path.relative(repoDir, fullPath)}`);
    return '';
  }

  return readFileSync(fullPath, 'utf8');
};

const requireText = (label, text, pattern) => {
  if (!pattern.test(text)) {
    failures.push(`${label} does not include ${pattern}`);
  }
};

const packageJson = JSON.parse(readText(appDir, 'package.json') || '{}');
const indexHtml = readText(appDir, 'index.html');
const manifest = readText(appDir, 'public/manifest.webmanifest');
const headers = readText(appDir, 'public/_headers');
const dataStages = readText(appDir, 'data/dataStages.ts');
const productBrief = readText(appDir, 'docs/design/prototype-product-brief.md');
const opsPlaybook = readText(appDir, 'docs/operations/prototype-operations-playbook.md');
const directionCriteria = readText(repoDir, 'docs/release-direction-criteria.md');
const userActions = readText(repoDir, 'docs/user-required-release-actions.md');

if (!packageJson.scripts?.['prototype:check']) {
  failures.push('package.json is missing scripts.prototype:check');
}

if (!packageJson.scripts?.['release:check']) {
  failures.push('package.json is missing scripts.release:check');
}

requireText('index.html title/metadata', indexHtml, /Prototype v0\.1|프로토타입/i);
requireText('manifest description', manifest, /Prototype|프로토타입/i);
requireText('public/_headers security policy', headers, /Content-Security-Policy:/i);
requireText('public/_headers immutable cache', headers, /Cache-Control:\s*public,\s*max-age=31536000,\s*immutable/i);
requireText('dataStages Stage 3 playable pool', dataStages, /3:\s*\{[\s\S]*combatPool:\s*\[[\s\S]*annihilationAmplifier[\s\S]*fleshCultivator[\s\S]*abyssObserver[\s\S]*\][\s\S]*miniboss:\s*'apostleOfFlesh'[\s\S]*boss:\s*'eclipseChoir'/);
requireText('prototype product brief', productBrief, /Prototype v0\.1|포트폴리오/i);
requireText('prototype operations playbook', opsPlaybook, /운영|rollback|롤백/i);
requireText('release direction criteria', directionCriteria, /무료 공개 프로토타입/);
requireText('user-required actions', userActions, /사용자 TODO|Prototype v0\.1/);

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('PASS prototype readiness checks');
