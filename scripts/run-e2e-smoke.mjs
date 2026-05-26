import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  console.error('Playwright is required for E2E smoke tests.');
  console.error('Install it as a dev dependency, or run with NODE_PATH pointing to an existing Playwright install.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const root = process.cwd();
const basePath = process.env.E2E_BASE_PATH ?? '/monocrome-eclips/';
const port = Number(process.env.E2E_PORT ?? 4185);
const distDir = path.resolve(root, process.env.E2E_DIST_DIR ?? 'dist');
const outputDir = path.resolve(root, process.env.E2E_OUTPUT_DIR ?? 'output/e2e');
const externalBaseUrl = process.env.E2E_BASE_URL;
const storeKey = 'monochrome-eclipse-save';

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
]);

const normalizeBasePath = (value) => {
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
};

const resolvedBasePath = normalizeBasePath(basePath);

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

const assertNoOverflow = async (page, errors, name, step) => {
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    inner: window.innerWidth,
    height: document.documentElement.scrollHeight,
  }));

  if (overflow.width > overflow.inner + 2 || overflow.bodyWidth > overflow.inner + 2) {
    errors.push(`${name}/${step} horizontal overflow document=${overflow.width} body=${overflow.bodyWidth} inner=${overflow.inner}`);
  }

  return overflow;
};

const closeTutorial = async (page) => {
  const close = page.locator('.tutorial-coachmark-close').last();
  if (await close.count()) {
    try {
      await close.click({ timeout: 1200 });
    } catch {
      // A hidden or already removed tutorial should not fail the flow.
    }
  }
};

const capture = async (page, name, step) => {
  const filename = `${name}-${step}.png`;
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: true });
  return filename;
};

const seedShopState = () => {
  const store = JSON.parse(localStorage.getItem('monochrome-eclipse-save') || '{}');
  const state = store.state || {};
  state.gameState = 'SHOP';
  state.isInventoryOpen = false;
  state.resources = { echoRemnants: 120, senseFragments: 6, memoryPieces: 6 };
  localStorage.setItem('monochrome-eclipse-save', JSON.stringify({ state, version: store.version || 3 }));
};

const seedRewardRecoveryState = () => {
  const store = JSON.parse(localStorage.getItem('monochrome-eclipse-save') || '{}');
  const state = store.state || {};
  state.gameState = 'COMBAT';
  state.pendingCombatReward = {
    enemyName: 'E2E Reward Enemy',
    enemyTier: 'normal',
    nextState: 'EXPLORATION',
    choices: [
      {
        id: 'e2e_reward',
        label: 'E2E reward',
        description: 'Reward recovery path.',
        rewards: { echoRemnants: 1 },
      },
    ],
  };
  state.enemy = null;
  state.selectedPatterns = [];
  state.detectedPatterns = [];
  state.usedCoinIndices = [];
  state.combatPrediction = null;
  state.enemyIntent = null;
  state.combatLog = [{ message: 'E2E reward recovery', type: 'system' }];
  state.combatEffects = [];
  state.playerHit = 0;
  state.enemyHit = 0;
  state.activeSkillState = { phase: 'idle', selection: [] };
  state.swapState = { phase: 'idle', reserveCoinIndex: null, revealedFace: null };
  state.testMode = false;
  localStorage.setItem('monochrome-eclipse-save', JSON.stringify({ state, version: store.version || 3 }));
};

const runFlow = async (browser, baseUrl, name, viewport, errors) => {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const screenshots = [];
  const overflows = {};

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`${name} console: ${msg.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`${name} pageerror: ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`${name} requestfailed: ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${name} http ${response.status()}: ${response.url()}`);
    if (/fonts\.googleapis|fonts\.gstatic/.test(response.url())) errors.push(`${name} external font request: ${response.url()}`);
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate((key) => localStorage.removeItem(key), storeKey);
  await page.reload({ waitUntil: 'networkidle' });

  await page.locator('.menu-screen').waitFor({ timeout: 10000 });
  overflows.menu = await assertNoOverflow(page, errors, name, 'menu');
  screenshots.push(await capture(page, name, '01-menu'));

  await page.getByTestId('start-run-button').click({ timeout: 5000 });
  await page.getByTestId('character-card-warrior').waitFor({ timeout: 10000 });
  await closeTutorial(page);
  overflows.character = await assertNoOverflow(page, errors, name, 'character');
  screenshots.push(await capture(page, name, '02-character'));

  await page.getByTestId('character-card-warrior').click({ timeout: 5000 });
  await page.locator('.exploration-screen').waitFor({ timeout: 10000 });
  await closeTutorial(page);
  overflows.exploration = await assertNoOverflow(page, errors, name, 'exploration');
  screenshots.push(await capture(page, name, '03-exploration'));

  await page.getByTestId('open-inventory-button').click({ timeout: 5000 });
  await page.getByTestId('inventory-modal').waitFor({ timeout: 10000 });
  const inventoryText = await page.getByTestId('inventory-modal').innerText();
  if ((inventoryText.match(/\uC6D0\uBB38/g) ?? []).length > 0) {
    errors.push(`${name} inventory shows original-detail label`);
  }
  overflows.inventory = await assertNoOverflow(page, errors, name, 'inventory');
  screenshots.push(await capture(page, name, '04-inventory'));
  await page.getByTestId('close-inventory-button').click({ timeout: 5000 });

  await page.getByTestId('route-node-1').click({ timeout: 5000 });
  await page.locator('.combat-screen').waitFor({ timeout: 12000 });
  await closeTutorial(page);
  await page.getByTestId('combat-execute-button').waitFor({ timeout: 10000 });
  const chip = page.locator('[data-testid^="combat-pattern-"]:not([disabled])').first();
  await chip.waitFor({ timeout: 10000 });
  await chip.click({ timeout: 5000 });
  await page.locator('.combat-pattern-chip.is-selected').first().waitFor({ timeout: 5000 });
  await page.locator('[data-testid="combat-execute-button"]:not([disabled])').waitFor({ timeout: 5000 });
  overflows.combat = await assertNoOverflow(page, errors, name, 'combat');
  screenshots.push(await capture(page, name, '05-combat-selected'));

  await page.evaluate(seedShopState);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.shop-screen').waitFor({ timeout: 10000 });
  overflows.shop = await assertNoOverflow(page, errors, name, 'shop');
  screenshots.push(await capture(page, name, '06-shop'));

  await page.getByTestId('shop-status-button').click({ timeout: 5000 });
  await page.getByTestId('run-status-modal').waitFor({ timeout: 10000 });
  overflows.status = await assertNoOverflow(page, errors, name, 'status');
  screenshots.push(await capture(page, name, '07-status'));

  await page.evaluate(seedRewardRecoveryState);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.combat-reward-screen').waitFor({ timeout: 10000 });
  overflows.rewardRecovery = await assertNoOverflow(page, errors, name, 'reward-recovery');
  screenshots.push(await capture(page, name, '08-reward-recovery'));

  await context.close();
  return { name, viewport, overflows, screenshots };
};

let server;
let baseUrl = externalBaseUrl;
if (!baseUrl) {
  server = createStaticServer();
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${port}${resolvedBasePath}`;
}

const browser = await chromium.launch({ headless: true });
const errors = [];
const results = [];

try {
  results.push(await runFlow(browser, baseUrl, 'desktop', { width: 1280, height: 720 }, errors));
  results.push(await runFlow(browser, baseUrl, 'mobile', { width: 390, height: 844 }, errors));
} finally {
  await browser.close();
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
