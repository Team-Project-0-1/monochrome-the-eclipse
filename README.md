# Monochrome: The Eclipse

Turn-based roguelike RPG prototype built with React, TypeScript, Vite, Zustand, and Framer Motion.

Current public label: **Prototype v0.1**. The project is prepared for a free prototype/portfolio release, not a paid 1.0 commercial launch. Stage 1 and Stage 2 are the playable public scope; Stage 3 remains planned/locked until its design is finalized.

The app source lives in `monochrome_-the-eclipse/`.

## Quick Start

```powershell
cd monochrome_-the-eclipse
npm install
npm run dev
```

Local URL:

```text
http://127.0.0.1:5173/
```

## Verification

Run the full local check before handing off changes:

```powershell
cd monochrome_-the-eclipse
npm run check
```

This runs TypeScript, passive validation scenarios, release asset metadata checks, the production build, and the dist size budget.

Before publishing, run the stricter release gate:

```powershell
cd monochrome_-the-eclipse
npm run release:check
```

This also refreshes optimized WebP assets and runs `npm audit --audit-level=moderate`.

For a prototype/portfolio handoff, run:

```powershell
cd monochrome_-the-eclipse
npm run prototype:check
```

This runs the release gate and verifies prototype-facing metadata, scope labeling, Stage 3 lock status, and operations documentation.

## Product and Operations Docs

- `monochrome_-the-eclipse/docs/design/prototype-product-brief.md` - product positioning, release scope, demo script, and next gates.
- `monochrome_-the-eclipse/docs/operations/prototype-operations-playbook.md` - deployment, smoke testing, monitoring, incident triage, rollback, and patch cadence.
- `monochrome_-the-eclipse/docs/design/stage-3-prd.md` - locked Stage 3 gate, boss, and reward planning scope.
- `monochrome_-the-eclipse/docs/content/stage-3-content-brief.md` - Stage 3 content contract and public-copy guardrails.
- `docs/release-direction-criteria.md` - criteria for prototype, paid Early Access, and paid 1.0.
- `docs/user-required-release-actions.md` - owner decisions for hosting, labels, Stage 3 scope, analytics, and asset rights.

## Browser Use Requirement

Codex Browser Use requires the Node runtime used by `node_repl` to be `>= 22.22.0`.

If Browser Use reports that Node is too old, update Node.js LTS and restart Codex:

```powershell
winget upgrade --id OpenJS.NodeJS.22 --accept-source-agreements --accept-package-agreements
node -v
```

If Codex still resolves an older runtime, set `NODE_REPL_NODE_PATH` to the updated `node.exe` and restart Codex.

## Deployment Options

Recommended hosting path:

```text
Cloudflare Pages
Framework preset: Vite
Root directory: monochrome_-the-eclipse
Install command: npm ci
Build command: npm run build
Build output directory: dist
Environment variable: VITE_BASE_PATH=/
```

For the portfolio/prototype release path, use `npm run prototype:check` as the build command when the host can run a full verification gate before publishing.

The repository can then be changed back to private while the built site remains public.

GitHub Pages is still supported as a temporary fallback. The GitHub Actions workflow builds with:

```text
VITE_BASE_PATH=/monocrome-eclips/
```

Do not expose service API keys through Vite client config. If Gemini or another paid API is needed later, call it through a server/API route instead of injecting the key into the browser bundle.
