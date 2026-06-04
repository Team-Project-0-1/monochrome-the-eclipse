import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// 탐험 노드 카드 "호버 상세 오버레이"(:focus-within) 단일 캡처용 개발 도구.
// run-e2e-smoke.mjs의 정적 캡처로는 호버 상태가 안 잡히므로, 노드를 focus시켜
// .route-node-detail이 떠 있는 상태를 찍는다. 의존성 0 (Node 내장 fetch/WebSocket).
//   SNAP_SKIP_BUILD=1 이면 기존 dist 재사용(직전 `npm run e2e`의 VITE_E2E 빌드).
// ---------------------------------------------------------------------------
const root = process.cwd();
const basePath = '/monochrome-the-eclipse/';
const port = Number(process.env.SNAP_PORT ?? 4187);
const distDir = path.resolve(root, 'dist');
const outputDir = path.resolve(root, 'output/e2e');
const debugPort = Number(process.env.SNAP_CDP_PORT ?? 9326);
const chromeBin = process.env.CHROME_BIN
  || (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'google-chrome');

fs.mkdirSync(outputDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.env.SNAP_SKIP_BUILD !== '1') {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const r = spawnSync(npx, ['vite', 'build', `--base=${basePath}`], {
    cwd: root, env: { ...process.env, VITE_E2E: '1' }, stdio: ['inherit', 2, 'inherit'], shell: true,
  });
  if (r.status !== 0) throw new Error('vite build (VITE_E2E) failed');
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript'], ['.css', 'text/css'],
  ['.json', 'application/json'], ['.png', 'image/png'], ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'], ['.woff2', 'font/woff2'], ['.woff', 'font/woff'],
  ['.ico', 'image/x-icon'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
]);
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === basePath.slice(0, -1)) pathname = basePath;
  if (!pathname.startsWith(basePath)) { res.writeHead(404); res.end('nf'); return; }
  let rel = pathname.slice(basePath.length);
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  const target = path.resolve(distDir, rel);
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': mime.get(path.extname(target)) ?? 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
});
await new Promise((r) => server.listen(port, '127.0.0.1', r));
const baseUrl = `http://127.0.0.1:${port}${basePath}`;

class Cdp {
  constructor(ws) { this.wsUrl = ws; this.id = 1; this.p = new Map(); }
  connect() {
    return new Promise((res, rej) => {
      const w = new WebSocket(this.wsUrl); this.ws = w;
      w.addEventListener('open', () => res());
      w.addEventListener('error', (e) => rej(e?.error ?? new Error('ws error')));
      w.addEventListener('message', (e) => {
        const m = JSON.parse(typeof e.data === 'string' ? e.data : e.data.toString());
        if (m.id && this.p.has(m.id)) { const { resolve, reject } = this.p.get(m.id); this.p.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); }
      });
    });
  }
  send(method, params = {}) { const id = this.id++; return new Promise((res, rej) => { this.p.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
}

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-chrome-'));
const child = spawn(chromeBin, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--disable-dev-shm-usage', `--remote-debugging-port=${debugPort}`,
  '--window-size=1280,720', `--user-data-dir=${userDataDir}`, 'about:blank',
], { stdio: 'ignore' });

let version = null;
for (let dl = Date.now() + 30000; Date.now() < dl;) {
  try { const r = await fetch(`http://127.0.0.1:${debugPort}/json/version`); if (r.ok) { version = await r.json(); break; } } catch {}
  await sleep(150);
}
if (!version) { child.kill('SIGKILL'); throw new Error('chrome devtools endpoint not ready'); }

let pageTarget = null;
for (let dl = Date.now() + 10000; Date.now() < dl;) {
  const r = await fetch(`http://127.0.0.1:${debugPort}/json`); const t = await r.json();
  pageTarget = t.find((x) => x.type === 'page' && x.webSocketDebuggerUrl); if (pageTarget) break; await sleep(150);
}
const cdp = new Cdp(pageTarget.webSocketDebuggerUrl);
await cdp.connect();
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

const ev = async (expr, awaitPromise = false) => {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval error');
  return r.result?.value;
};
const waitFor = async (expr, label, timeout = 15000) => {
  for (let dl = Date.now() + timeout; Date.now() < dl;) { try { if (await ev(`Boolean(${expr})`) === true) return; } catch {} await sleep(120); }
  throw new Error(`timeout: ${label}`);
};
const nav = async (url) => { await cdp.send('Page.navigate', { url }); await waitFor(`document.querySelector('#root') && document.querySelector('#root').children.length > 0`, 'root'); };

await nav(baseUrl);
await ev(`(() => { try { localStorage.clear(); } catch {} })()`);
await nav(baseUrl);
await waitFor(`window.__gameStore`, '__gameStore hook');
await ev(`window.__gameStore.getState().selectCharacter('WARRIOR')`); // → EXPLORATION
await waitFor(`document.querySelector('.exploration-screen')`, 'exploration screen');
await ev(`(() => { const n = document.querySelectorAll('.tutorial-coachmark-close'); const e = n[n.length - 1]; if (e) e.click(); return !!e; })()`);
await sleep(400);
// SNAP_MIXED=1: 현재 층 노드를 서로 다른 타입으로 바꿔 !allSameType 분기 강제
// → 오버레이가 senseHint + description 둘 다 담는 최대 높이 상태(리뷰어 #1 클립 우려의 실제 조건).
const mixed = process.env.SNAP_MIXED === '1';
if (mixed) {
  const count = await ev(`(() => {
    const store = window.__gameStore; const s = store.getState(); const turn = s.currentTurn - 1;
    const types = ['COMBAT', 'SHOP', 'EVENT'];
    const next = s.stageNodes.map((arr, ti) => ti === turn ? arr.map((n, i) => ({ ...n, type: types[i % types.length] })) : arr);
    store.setState({ stageNodes: next }); return next[turn].length;
  })()`);
  console.log('MIXED: retyped', count, 'nodes on current floor (!allSameType)');
  await sleep(300);
}

// 노드 카드를 focus → :focus-within으로 .route-node-detail 오버레이 노출
const focused = await ev(`(() => { const b = document.querySelector('[data-testid="route-node-1"]'); if (b) { b.focus(); return true; } return false; })()`);
if (!focused) console.error('WARN: route-node-1 not found');
await sleep(500);
// 검증: 오버레이 노출(opacity) + 카드 overflow:hidden 밖으로 넘치는지(클립) px 측정.
const activeTestid = await ev(`document.activeElement && document.activeElement.getAttribute('data-testid')`);
const detail = await ev(`(() => {
  const card = document.querySelector('[data-testid="route-node-1"]');
  const d = card && card.querySelector('.route-node-detail');
  if (!d) return { error: 'no .route-node-detail' };
  const cr = card.getBoundingClientRect(); const dr = d.getBoundingClientRect();
  return { opacity: getComputedStyle(d).opacity, cardH: Math.round(cr.height), detailH: Math.round(dr.height),
    overflowTopPx: +(cr.top - dr.top).toFixed(1), overflowBottomPx: +(dr.bottom - cr.bottom).toFixed(1) };
})()`);
console.log('activeElement:', activeTestid, '| detail:', JSON.stringify(detail));
const outName = mixed ? 'desktop-exploration-hover-mixed.png' : 'desktop-exploration-hover.png';
const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
fs.writeFileSync(path.join(outputDir, outName), Buffer.from(shot.data, 'base64'));
console.log('saved output/e2e/' + outName);

try { child.kill('SIGKILL'); } catch {}
server.close();
process.exit(0);
