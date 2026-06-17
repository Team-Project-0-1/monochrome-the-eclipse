import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// E2E render-smoke (dependency-free).
//
// Drives the production bundle with system Chrome over CDP (Node built-in fetch
// + WebSocket — no playwright/puppeteer). For each major gameState it asserts:
//   (1) the screen's root selector renders,
//   (2) zero console errors / page exceptions / 4xx-5xx responses,
//   (3) no horizontal overflow,
// across desktop (1280x720) and mobile (390x844) viewports.
//
// Reach is hybrid:
//   - Natural entry (real transitions) for MENU -> CHARACTER_SELECT ->
//     EXPLORATION -> COMBAT via testid clicks.
//   - State toggle for the deep screens (SHOP/REST/EVENT/MEMORY_ALTAR/REWARD)
//     via the VITE_E2E-only window.__gameStore hook. localStorage seeding is
//     impossible here because normalizeHydratedState() forces gameState=MENU on
//     hydration; setState bypasses that.
//
// Full click-through (playing combat to completion) is intentionally out of
// scope (that is a separate, heavier phase).
// ---------------------------------------------------------------------------

const root = process.cwd();
const basePath = process.env.E2E_BASE_PATH ?? '/monochrome-the-eclipse/';
const port = Number(process.env.E2E_PORT ?? 4185);
const distDir = path.resolve(root, process.env.E2E_DIST_DIR ?? 'dist');
const outputDir = path.resolve(root, process.env.E2E_OUTPUT_DIR ?? 'output/e2e');
const externalBaseUrl = process.env.E2E_BASE_URL;
const skipBuild = process.env.E2E_SKIP_BUILD === '1';
const debugPort = Number(process.env.E2E_CDP_PORT ?? 9322);

const chromeBin = process.env.CHROME_BIN
  || (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'google-chrome');

fs.mkdirSync(outputDir, { recursive: true });

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ico', 'image/x-icon'],
]);

const normalizeBasePath = (value) => {
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
};

const resolvedBasePath = normalizeBasePath(basePath);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Production build with the E2E hook enabled. The base is pinned to the
// GitHub Pages base so the static server below (which serves under the same
// base) does not 404 on the entry HTML, assets, or lazy chunks.
// ---------------------------------------------------------------------------
const buildForE2e = () => {
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(
    npxCmd,
    ['vite', 'build', `--base=${resolvedBasePath}`],
    {
      cwd: root,
      env: { ...process.env, VITE_E2E: '1' },
      // Route build output to stderr so the script's stdout carries only the
      // final JSON report (keeps `npm run e2e` output machine-parseable).
      stdio: ['inherit', 2, 'inherit'],
      shell: true,
    },
  );
  if (result.status !== 0) {
    throw new Error(`vite build (VITE_E2E) failed with exit code ${result.status}`);
  }
};

// ---------------------------------------------------------------------------
// Static file server (serves dist under resolvedBasePath).
// ---------------------------------------------------------------------------
const createStaticServer = () => http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === resolvedBasePath.slice(0, -1)) pathname = resolvedBasePath;
  if (!pathname.startsWith(resolvedBasePath)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }

  let relativePath = pathname.slice(resolvedBasePath.length);
  if (!relativePath || relativePath.endsWith('/')) relativePath += 'index.html';

  const target = path.resolve(distDir, relativePath);
  const insideDist = target === distDir || target.startsWith(`${distDir}${path.sep}`);
  if (!insideDist || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }

  res.writeHead(200, { 'content-type': mime.get(path.extname(target)) ?? 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
});

// ---------------------------------------------------------------------------
// CDP client over a single page target's WebSocket.
// ---------------------------------------------------------------------------
class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;
      ws.addEventListener('open', () => resolve());
      ws.addEventListener('error', (event) => reject(event?.error ?? new Error('CDP websocket error')));
      ws.addEventListener('message', (event) => this.onMessage(event.data));
    });
  }

  onMessage(raw) {
    let payload;
    try {
      payload = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
    } catch {
      return;
    }

    if (payload.id !== undefined) {
      const entry = this.pending.get(payload.id);
      if (entry) {
        this.pending.delete(payload.id);
        if (payload.error) entry.reject(new Error(payload.error.message ?? 'CDP error'));
        else entry.resolve(payload.result);
      }
      return;
    }

    if (payload.method) {
      const handlers = this.listeners.get(payload.method);
      if (handlers) handlers.forEach((handler) => handler(payload.params));
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(handler);
  }

  close() {
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
  }
}

const stringifyRemote = (arg) => {
  if (arg === undefined || arg === null) return String(arg);
  if (arg.type === 'string') return arg.value;
  if ('value' in arg) {
    try {
      return JSON.stringify(arg.value);
    } catch {
      return String(arg.value);
    }
  }
  if (arg.description) return arg.description;
  if (arg.preview?.description) return arg.preview.description;
  return arg.type ?? 'unknown';
};

// ---------------------------------------------------------------------------
// Chrome lifecycle (one instance per viewport so --window-size applies).
// ---------------------------------------------------------------------------
const launchChrome = async (viewport, instancePort) => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-chrome-'));
  const args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-extensions',
    '--disable-background-networking',
    // CI(ubuntu 러너)의 /dev/shm은 기본 64MB로 작아 headless Chrome이 메모리 부족으로
    // 조용히 죽고 CDP 포트가 안 열린다 → 일반 디스크(/tmp)를 쓰게 해 flaky를 제거.
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${instancePort}`,
    `--window-size=${viewport.width},${viewport.height}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ];

  const child = spawn(chromeBin, args, { stdio: 'ignore' });
  child.on('error', (error) => {
    throw new Error(`Failed to launch Chrome at "${chromeBin}": ${error.message}`);
  });

  // Wait for the DevTools endpoint to answer before talking to it.
  // 30s: CI 러너 콜드 스타트(Chrome 첫 실행 + 디스크 프로필 생성)가 느릴 수 있다.
  const deadline = Date.now() + 30000;
  let version = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${instancePort}/json/version`);
      if (res.ok) {
        version = await res.json();
        break;
      }
    } catch {
      // not ready yet
    }
    await sleep(150);
  }
  if (!version) {
    child.kill('SIGKILL');
    throw new Error('Chrome DevTools endpoint did not become ready in time');
  }

  return { child, userDataDir, instancePort };
};

const getPageTarget = async (instancePort) => {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const res = await fetch(`http://127.0.0.1:${instancePort}/json`);
    const targets = await res.json();
    const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (page) return page;
    await sleep(150);
  }
  throw new Error('No CDP page target with a webSocketDebuggerUrl was found');
};

const killChrome = async ({ child, userDataDir }) => {
  try {
    child.kill('SIGKILL');
  } catch {
    // ignore
  }
  // Windows holds a lock on the profile dir briefly after the process exits;
  // retry the removal so we do not leak temp dirs (non-fatal either way).
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
      return;
    } catch {
      await sleep(200);
    }
  }
};

// ---------------------------------------------------------------------------
// Evaluation + polling helpers (all via Runtime.evaluate).
// ---------------------------------------------------------------------------
const evaluate = async (cdp, expression, { awaitPromise = false, returnByValue = true } = {}) => {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue,
    includeCommandLineAPI: false,
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails;
    const message = detail.exception?.description ?? detail.text ?? 'evaluation failed';
    throw new Error(`evaluate failed: ${message}`);
  }
  return result.result?.value;
};

const waitForCondition = async (cdp, expression, { timeout = 12000, interval = 120, label } = {}) => {
  const deadline = Date.now() + timeout;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const value = await evaluate(cdp, `Boolean(${expression})`);
      if (value === true) return;
    } catch (error) {
      lastError = error;
    }
    await sleep(interval);
  }
  const suffix = lastError ? ` (last error: ${lastError.message})` : '';
  throw new Error(`waitForCondition timed out: ${label ?? expression}${suffix}`);
};

const waitForSelector = (cdp, selector, options = {}) =>
  waitForCondition(
    cdp,
    `document.querySelector(${JSON.stringify(selector)})`,
    { ...options, label: options.label ?? `selector ${selector}` },
  );

const clickSelector = async (cdp, selector, { timeout = 8000 } = {}) => {
  await waitForSelector(cdp, selector, { timeout, label: `clickable ${selector}` });
  const clicked = await evaluate(cdp, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    el.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`clickSelector found no element for ${selector}`);
};

const navigate = async (cdp, url) => {
  await cdp.send('Page.navigate', { url });
  // Settle the SPA: root mounted + a known first-screen selector available.
  await waitForCondition(cdp, `document.querySelector('#root') && document.querySelector('#root').children.length > 0`, {
    timeout: 15000,
    label: 'react root mounted',
  });
};

const assertNoOverflow = async (cdp, errors, name, step) => {
  const overflow = await evaluate(cdp, `(() => ({
    width: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    inner: window.innerWidth,
    height: document.documentElement.scrollHeight,
  }))()`);

  if (overflow.width > overflow.inner + 2 || overflow.bodyWidth > overflow.inner + 2) {
    errors.push(`${name}/${step} horizontal overflow document=${overflow.width} body=${overflow.bodyWidth} inner=${overflow.inner}`);
  }
  return overflow;
};

const closeTutorial = async (cdp) => {
  await evaluate(cdp, `(() => {
    const nodes = document.querySelectorAll('.tutorial-coachmark-close');
    const el = nodes[nodes.length - 1];
    if (el) el.click();
    return Boolean(el);
  })()`);
};

const capture = async (cdp, name, step) => {
  const filename = `${name}-${step}.png`;
  const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  if (result?.data) {
    fs.writeFileSync(path.join(outputDir, filename), Buffer.from(result.data, 'base64'));
  }
  return filename;
};

// Reset to MENU via the store, then verify the menu screen rendered. Used
// between deep-screen toggles so each screen is reached from a clean run.
const resetToMenu = async (cdp) => {
  await evaluate(cdp, `window.__gameStore.getState().resetGame(true)`);
  await waitForSelector(cdp, '.menu-screen', { timeout: 8000 });
};

// Create a fresh WARRIOR run (player + stageNodes + resources) so the deep
// screens pass their `if (!player) return <fallback>` guards.
const seedRun = async (cdp) => {
  await evaluate(cdp, `window.__gameStore.getState().selectCharacter('WARRIOR')`);
  await waitForCondition(cdp, `window.__gameStore.getState().player !== null`, {
    timeout: 5000,
    label: 'run seeded (player present)',
  });
};

const setGameState = async (cdp, patchExpr) => {
  await evaluate(cdp, `window.__gameStore.setState(${patchExpr})`);
};

// ---------------------------------------------------------------------------
// Per-screen check: assert root selector + overflow + screenshot. Console / 4xx
// errors are captured continuously by the CDP listeners into `errors`.
// ---------------------------------------------------------------------------
const checkScreen = async (cdp, errors, name, step, selector, overflows, screenshots) => {
  await waitForSelector(cdp, selector, { timeout: 12000, label: `${step} root ${selector}` });
  await closeTutorial(cdp);
  overflows[step] = await assertNoOverflow(cdp, errors, name, step);
  screenshots.push(await capture(cdp, name, step));
};

const runFlow = async (baseUrl, name, viewport, instancePort, errors) => {
  const chrome = await launchChrome(viewport, instancePort);
  let cdp = null;
  const screenshots = [];
  const overflows = {};

  try {
    const target = await getPageTarget(instancePort);
    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    // Pin the exact CSS viewport. --window-size is unreliable for the inner
    // viewport (window chrome + min-width clamping push mobile to ~478px), which
    // would make the mobile overflow assertion meaningless. setDeviceMetricsOverride
    // gives us a precise 390/1280 CSS px viewport.
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width < 768,
    });

    // Console errors + uncaught exceptions + HTTP error responses.
    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        const text = (params.args ?? []).map(stringifyRemote).join(' ');
        errors.push(`${name} console: ${text}`);
      }
    });
    cdp.on('Runtime.exceptionThrown', (params) => {
      const detail = params.exceptionDetails;
      const message = detail?.exception?.description ?? detail?.text ?? 'unknown exception';
      errors.push(`${name} pageerror: ${message}`);
    });
    cdp.on('Network.responseReceived', (params) => {
      const { response } = params;
      if (response.status >= 400) errors.push(`${name} http ${response.status}: ${response.url}`);
      if (/fonts\.googleapis|fonts\.gstatic/.test(response.url)) {
        errors.push(`${name} external font request: ${response.url}`);
      }
    });
    cdp.on('Network.loadingFailed', (params) => {
      errors.push(`${name} requestfailed: ${params.errorText ?? 'unknown'}`);
    });

    // Start clean: clear any persisted save before the app hydrates by loading
    // once, wiping storage, then re-navigating.
    await navigate(cdp, baseUrl);
    await evaluate(cdp, `(() => { try { localStorage.clear(); } catch {} })()`);
    await navigate(cdp, baseUrl);

    // --- Natural entry: MENU -> CHARACTER_SELECT -> EXPLORATION -> COMBAT ---
    await checkScreen(cdp, errors, name, 'menu', '.menu-screen', overflows, screenshots);

    await clickSelector(cdp, '[data-testid="start-run-button"]');
    await checkScreen(cdp, errors, name, 'character', '[data-testid="character-card-warrior"]', overflows, screenshots);

    await clickSelector(cdp, '[data-testid="character-card-warrior"]');
    await clickSelector(cdp, '[data-testid="start-with-character"]:not([disabled])');
    await checkScreen(cdp, errors, name, 'exploration', '.exploration-screen', overflows, screenshots);

    // Turn-1 nodes are all guaranteed COMBAT, so route-node-1 enters combat.
    await clickSelector(cdp, '[data-testid="route-node-1"]');
    await checkScreen(cdp, errors, name, 'combat', '.combat-screen', overflows, screenshots);
    await waitForSelector(cdp, '[data-testid="combat-execute-button"]', { timeout: 10000 });

    // Seed a deterministic coin set so a pattern chip always exists. Combat coins
    // are RNG and an alternating sequence (e.g. H,T,H,T,H) yields zero patterns
    // (detectPatterns only matches adjacent streaks), which would flake the chip
    // wait. All-HEADS guarantees PENTA/QUAD/TRIPLE/PAIR chips, all enabled.
    await evaluate(cdp, `(() => {
      const store = window.__gameStore;
      const coins = store.getState().playerCoins.map((c) => ({ ...c, face: 'HEADS' }));
      store.setState({
        playerCoins: coins,
        detectedPatterns: window.__detectPatterns(coins),
        selectedPatterns: [],
        usedCoinIndices: [],
      });
    })()`);

    // On mobile the pattern rail lives in a collapsed drawer; open it so the
    // chips mount. Desktop renders the rail inline, so this is a no-op there.
    await evaluate(cdp, `(() => {
      const toggle = document.querySelector('.combat-mobile-pattern-inline');
      if (toggle && !document.querySelector('[data-testid^="combat-pattern-"]')) toggle.click();
      return true;
    })()`);

    try {
      await clickSelector(cdp, '[data-testid^="combat-pattern-"]:not([disabled])');
      await waitForSelector(cdp, '.combat-pattern-chip.is-selected', { timeout: 5000, label: 'pattern chip selected' });
    } catch (chipError) {
      // Dump combat state to make CI failures actionable instead of a bare timeout.
      const diag = await evaluate(cdp, `(() => {
        const s = window.__gameStore ? window.__gameStore.getState() : null;
        const chips = [...document.querySelectorAll('[data-testid^="combat-pattern-"]')];
        return {
          gameState: s ? s.gameState : 'no-store',
          detectedPatterns: s ? (s.detectedPatterns || []).map((p) => p.type + '/' + p.face) : null,
          playerCoins: s ? (s.playerCoins || []).map((c) => c.face) : null,
          selectedPatterns: s ? (s.selectedPatterns || []).length : null,
          chipCount: chips.length,
          chips: chips.map((c) => ({ testid: c.getAttribute('data-testid'), disabled: c.disabled })),
          emptyMarker: document.querySelector('.combat-pattern-empty')?.textContent ?? null,
        };
      })()`);
      const diagLine = `${name} combat-chip diagnostic: ${JSON.stringify(diag)}`;
      errors.push(diagLine);
      console.error(diagLine);
      throw chipError;
    }

    overflows.combatSelected = await assertNoOverflow(cdp, errors, name, 'combat-selected');
    screenshots.push(await capture(cdp, name, 'combat-selected'));

    // --- Deep screens via store toggle (each from a fresh run) ---
    const deepScreens = [
      { step: 'shop', state: 'SHOP', selector: '.archive-shop-screen' },
      { step: 'memory-altar', state: 'MEMORY_ALTAR', selector: '.memory-altar-screen' },
    ];

    for (const { step, state, selector } of deepScreens) {
      await resetToMenu(cdp);
      await seedRun(cdp);
      await setGameState(cdp, `{ gameState: '${state}' }`);
      await checkScreen(cdp, errors, name, step, selector, overflows, screenshots);
    }

    // REST: 부상 상태로 진입해야 "현상액 속 떠오르는 회복량"(readout) 연출이 보인다(만피면 disabled 경로 — 스펙 §3.3).
    await resetToMenu(cdp);
    await seedRun(cdp);
    await setGameState(cdp, `(s => ({ gameState: 'REST', player: { ...s.player, currentHp: Math.max(1, Math.floor(s.player.maxHp * 0.45)) } }))`);
    await checkScreen(cdp, errors, name, 'rest', '.archive-rest-screen', overflows, screenshots);

    // EVENT requires currentEvent + player; eventPhase 'choice' for the chooser.
    await resetToMenu(cdp);
    await seedRun(cdp);
    await setGameState(cdp, `{ gameState: 'EVENT', currentEvent: window.__eventData.event_supplies, eventPhase: 'choice' }`);
    await checkScreen(cdp, errors, name, 'event', '.archive-event-screen', overflows, screenshots);

    // EVENT result 페이즈 — choice 캡처가 안 건드리는 신규 CSS(결과 도장·변동 꼬리표·계속 버튼) 회귀 방지.
    await setGameState(cdp, `{ gameState: 'EVENT', currentEvent: window.__eventData.event_supplies, eventPhase: 'result', eventResultData: { type: 'result', payload: { baseMessage: '보급품을 확보했다. 경고등은 꺼졌다.' } }, eventDisplayItems: [{ label: '에코', value: 12 }, { label: '체력', value: -5 }] }`);
    await checkScreen(cdp, errors, name, 'event-result', '.archive-event-screen', overflows, screenshots);

    // REWARD requires pendingCombatReward (drives the choice grid).
    await resetToMenu(cdp);
    await seedRun(cdp);
    await setGameState(cdp, `{ gameState: 'REWARD', pendingCombatReward: {
      enemyName: 'E2E Reward Enemy',
      enemyTier: 'normal',
      nextState: 'EXPLORATION',
      choices: [
        { id: 'e2e_reward_echo', label: '메아리 회수', description: 'Echo recovery path.', rewards: { echoRemnants: 14 } },
        { id: 'e2e_reward_growth', label: '감각 채집', description: 'Growth resource path.', rewards: { senseFragments: 2, memoryPieces: 1 } },
        { id: 'e2e_reward_coin', label: '예비 동전 확보', description: 'Reserve coin path.', rewards: { reserveCoin: true } },
      ],
    } }`);
    await checkScreen(cdp, errors, name, 'reward', '.archive-reward-screen', overflows, screenshots);
  } finally {
    cdp?.close();
    await killChrome(chrome);
  }

  return { name, viewport, overflows, screenshots };
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
if (!externalBaseUrl && !skipBuild) {
  buildForE2e();
}

let server;
let baseUrl = externalBaseUrl;
if (!baseUrl) {
  server = createStaticServer();
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${port}${resolvedBasePath}`;
}

const errors = [];
const results = [];

try {
  // Distinct debug ports per viewport so the second launch never attaches to a
  // lingering first instance.
  results.push(await runFlow(baseUrl, 'desktop', { width: 1280, height: 720 }, debugPort, errors));
  results.push(await runFlow(baseUrl, 'mobile', { width: 390, height: 844 }, debugPort + 1, errors));
} finally {
  server?.close();
}

const report = { ok: errors.length === 0, errors, baseUrl, outputDir, results };
const reportPath = path.join(outputDir, 'e2e-smoke-results.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

if (errors.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
