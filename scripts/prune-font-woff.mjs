// dist에서 *.woff 폰트 폴백을 제거한다(*.woff2는 유지).
// fontsource CSS는 src()에 woff2를 먼저 나열하므로, 모든 모던 브라우저(2016+)는
// woff2를 선택하고 woff 폴백은 요청조차 하지 않는다. 즉 woff를 배포하면
// 폰트 바이트만 2배가 되고 이득은 없다. CSS가 없는 woff를 참조해도 해당
// 항목은 영원히 fetch되지 않으므로 삭제는 안전하다.
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

if (!existsSync(distDir)) {
  console.log('No dist directory to prune.');
  process.exit(0);
}

const walk = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() ? [fullPath] : [];
  });
};

const woffFiles = walk(distDir).filter((file) => file.toLowerCase().endsWith('.woff'));

let removed = 0;
let freedBytes = 0;

for (const woffPath of woffFiles) {
  freedBytes += statSync(woffPath).size;
  rmSync(woffPath);
  removed += 1;
}

console.log(`Pruned ${removed} woff font files from dist (${(freedBytes / 1024 / 1024).toFixed(2)} MB freed).`);
