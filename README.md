# Monochrome: The Eclipse

Turn-based roguelike RPG prototype built with React, TypeScript, Vite, Zustand, and Framer Motion.

Current public label: **Prototype v0.1**.

This build is suitable for a prototype/portfolio release, not a paid 1.0 commercial launch. Stage 1 through Stage 3 are the playable public scope, ending in a Stage 3 boss and `비기` reward draft.

## Commands

```powershell
npm install
npm run dev
npm run check
npm run release:check
npm run prototype:check
npm run build
```

`npm run check` is the preferred handoff command. It runs:

- `npm run typecheck`
- `npm run validate:passives`
- `npm run check:release-assets`
- `npm run build`
- `npm run check:dist`

Use `npm run release:check` before publishing. It also runs asset optimization and `npm audit --audit-level=moderate`.

Use `npm run prototype:check` before a portfolio/prototype deployment. It runs the release gate and then verifies prototype-facing metadata, scope labeling, Stage 3 playable content, and operations documentation.

## Product and Operations Docs

- `docs/design/prototype-product-brief.md` - portfolio positioning, scope, demo script, and product gates.
- `docs/operations/prototype-operations-playbook.md` - deployment, smoke testing, monitoring, incident triage, rollback, and patch cadence.
- `docs/design/stage-3-prd.md` - implemented Stage 3 gate, boss, and reward scope.
- `docs/content/stage-3-content-brief.md` - Stage 3 content contract and source trace.
- `docs/release-direction-criteria.md` - criteria separating prototype, paid Early Access, and paid 1.0.
- `docs/user-required-release-actions.md` - owner decisions that Codex should not make alone.

## Local Development

The Vite app uses `VITE_BASE_PATH` to choose the deployment base path. Local and Cloudflare Pages builds default to `/`.

Use this local URL when testing:

```text
http://127.0.0.1:5173/
```

## Environment

The client build does not inject `GEMINI_API_KEY` or other service secrets.

Use `VITE_BASE_PATH` only for deploy base-path selection:

```powershell
$env:VITE_BASE_PATH="/"
npm run build
```

GitHub Pages fallback builds should use:

```powershell
$env:VITE_BASE_PATH="/monocrome-eclips/"
npm run build
```

Do not commit `.env.local`, local dev-server logs, browser screenshots, or Playwright MCP artifacts.

If a future feature needs Gemini or another paid API, route requests through a server/API endpoint. Do not expose the key in frontend code.

## Cloudflare Pages

Recommended settings:

```text
Framework preset: Vite
Root directory: .
Install command: npm ci
Build command: npm run prototype:check
Build output directory: dist
Environment variable: VITE_BASE_PATH=/
```

The repository can then be changed back to private while the built site remains public.

GitHub Pages is still supported as a temporary fallback via the workflow in `.github/workflows/deploy.yml`, which builds with `VITE_BASE_PATH=/monocrome-eclips/`.

## Browser Automation

Browser Use through Codex requires Node `>= 22.22.0`. The previous failing setup was:

```text
C:\Program Files\nodejs\node.exe -> v22.14.0
```

Update Node LTS, restart Codex, then verify:

```powershell
node -v
where.exe node
```
