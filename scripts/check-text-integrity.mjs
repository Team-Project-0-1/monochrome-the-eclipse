import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// 평탄화 이후 app 디렉터리와 repo가 동일하다. 이전 로직은 repoDir을 한 단계 위로 잡고
// docs 폴더를 별도로 스캔했지만, 그 경로는 더 이상 존재하지 않아 사실상 죽은 가지였다.
const scanRoots = [rootDir];

const allowedExtensions = new Set([
  '.css',
  '.html',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.webmanifest',
  '.yml',
  '.yaml',
]);

const ignoredDirs = new Set([
  '.git',
  '.omx',
  'dist',
  'node_modules',
  'output',
]);

const mojibakePatterns = [
  { label: 'replacement character', pattern: /\uFFFD/ },
  {
    label: 'UTF-8 mojibake marker',
    pattern: new RegExp([
      '\\u00c3',
      '\\u00c2',
      '\\u00e2\\u20ac',
      '\\u00f0\\u0178',
      '\\u00ec',
      '\\u00eb',
      '\\u00ea',
      '\\u00ed',
    ].join('|')),
  },
  { label: 'C1 control character', pattern: /[\u0080-\u009f]/ },
  { label: 'Korean mojibake CJK marker', pattern: /[\u3400-\u4dbf\u4e00-\u9fff]/ },
];

const walk = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) return [];
      return walk(path.join(dir, entry.name));
    }

    if (!entry.isFile()) return [];
    const fullPath = path.join(dir, entry.name);
    return allowedExtensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
};

const failures = [];

for (const file of scanRoots.flatMap(walk)) {
  const text = readFileSync(file, 'utf8');
  const relativePath = path.relative(rootDir, file);

  for (const { label, pattern } of mojibakePatterns) {
    const match = pattern.exec(text);
    if (!match) continue;

    const before = text.slice(0, match.index);
    const line = before.split(/\r?\n/).length;
    failures.push(`${relativePath}:${line} contains ${label}: ${JSON.stringify(match[0])}`);
  }
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('PASS text integrity checks');
