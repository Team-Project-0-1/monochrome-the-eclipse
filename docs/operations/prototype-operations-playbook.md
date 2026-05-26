# Prototype Operations Playbook

Last updated: 2026-05-18

This playbook defines how to publish and operate `Monochrome: The Eclipse` as a prototype/portfolio release.

## Operating Goal

Keep the public build stable, honest, and easy to review. The release should show that the project can be built, shipped, monitored, and maintained even though the content scope is still prototype-level.

## Release Labels

Use:
- `Prototype v0.1`
- `무료 공개 프로토타입`
- `1-3층 공개 프로토타입`

Avoid:
- `full release`
- `complete game`
- paid-store language that implies final balance, final art, commercial rights, or 1.0 completion

## Pre-Release Checklist

Run from this directory:

```powershell
npm run prototype:check
```

Before publishing, confirm:
- The build label is visible on the menu.
- The metadata and manifest describe the project as a prototype.
- Stage 3 playable content and strict content checks are current.
- `docs/design/prototype-product-brief.md` is current.
- `docs/operations/prototype-operations-playbook.md` is current.
- `../docs/release-direction-criteria.md` is current.
- `../docs/user-required-release-actions.md` has no unhandled owner decision for the chosen release scope.

## Deployment Paths

### GitHub Pages fallback

Use this when speed matters more than production traffic control.

Important limitation: GitHub Pages does not apply `public/_headers`. The file is still kept for platforms that support it and for release checks, but GitHub Pages alone will not enforce the CSP, frame, referrer, permissions, or cache headers in that file. For a broader public URL, put the site behind Cloudflare/another CDN that injects equivalent headers, or deploy through Cloudflare Pages/Netlify.

Expected build environment:

```text
Root directory: .
Build command: npm run prototype:check
Build output: dist
VITE_BASE_PATH=/monocrome-eclips/
```

### Cloudflare Pages preferred

Use this for the public portfolio URL or broader public testing.

This path is preferred for public traffic because it can apply the checked `_headers` policy, custom domain redirects, and cache controls.

Expected build environment:

```text
Framework preset: Vite
Root directory: .
Install command: npm ci
Build command: npm run prototype:check
Build output directory: dist
VITE_BASE_PATH=/
```

## Smoke Test After Deploy

Use desktop and mobile portrait.

Minimum flow:
- Load URL and confirm no console errors.
- Menu shows `Prototype v0.1`.
- Start new run.
- Select a character.
- Enter exploration.
- Start combat.
- Select a pattern and execute a turn.
- Claim a reward after combat.
- Visit at least one event, shop, or rest state.
- Reach or shortcut-test Stage 3 and confirm the boss reward/victory path works.

Record:
- URL tested.
- Date and browser.
- Viewport size.
- Any console errors.
- Screenshot of menu, combat, reward, Stage 3 boss reward, and victory state if reached.

## Monitoring

Until analytics is approved, monitor through hosting and manual feedback:
- successful page loads
- 404s
- top asset URLs
- bandwidth and cache hit rate
- user feedback about first-run confusion
- reported combat readability issues

After analytics approval, track only anonymous product events:
- run start/end
- character selected
- stage reached
- combat win/loss
- reward choice
- shop purchase
- event choice
- fatal error

## Incident Triage

Severity 0:
- Public build does not load.
- Main menu crashes.
- New run cannot start.
- Deployed assets 404 broadly.

Action: rollback or disable the public link immediately.

Severity 1:
- Combat blocks progression.
- Save recovery breaks normal play.
- Mobile viewport hides the primary action.

Action: hotfix before promoting the URL further.

Severity 2:
- Balance issue.
- Copy issue.
- Minor visual overlap.
- Non-blocking audio or animation issue.

Action: batch into the next prototype patch.

## Rollback

GitHub Pages:
- Re-run the last known good workflow commit.
- If needed, temporarily disable the public link in the portfolio page.

Cloudflare Pages:
- Use Pages deployment history to promote the last known good deployment.
- Keep the canonical URL unchanged.
- Add a short known-issue note if users may have seen the broken build.

## Patch Cadence

Recommended while public:
- Same-day fix for Severity 0.
- 24-48 hour fix for Severity 1.
- Weekly batch for Severity 2.
- Update release notes after every public patch.

## Owner Decisions

Codex should not decide these alone:
- custom domain
- analytics provider and privacy copy
- commercial asset approval
- whether to charge money
- whether Stage 3 prototype scope is sufficient for the public build
