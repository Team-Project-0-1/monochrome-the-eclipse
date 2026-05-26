# Release Readiness Plan - 2026-05-01

## Current Status

The project is ready for a local release-candidate handoff and can be published as a public web prototype after the user chooses the production URL and approves the `Prototype v0.1` label. It is not yet a hands-off commercial launch.

Ready locally:
- React/Vite production build succeeds.
- Passive combat validation is deterministic and part of the default check.
- Dist size budget exists and currently passes.
- PNG-to-WebP optimization exists and is wired through the asset manifest.
- Event, shop, rest, reward, exploration, menu, character select, desktop combat, and mobile combat screens have current browser smoke passes.
- GitHub Pages fallback deployment exists.
- Cloudflare Pages is documented as the preferred hosting path.
- The web manifest already targets standalone display, so PC PWA/app-window launch is feasible after the public URL is chosen and verified.

Still release-sensitive:
- Final production domain is not fixed.
- Cloudflare, canonical redirects, analytics, sitemap, and operator dashboard need external account/domain access.
- Generated art/audio provenance needs final owner approval before a broader public push.
- Stage 3 is playable in prototype scope, but generated Stage 3 assets still need owner provenance approval before a broader public push.
- There is no committed browser E2E regression suite yet; current verification is build checks plus targeted browser smoke inspection.
- PC install/PWA behavior has not been validated on a deployed public URL yet.
- Prototype/portfolio operations are now documented in `docs/design/prototype-product-brief.md` and `docs/operations/prototype-operations-playbook.md`.

## Verification Evidence - 2026-05-01

Run from ``:

```powershell
npm run release:check
```

Result:
- Asset optimization: 92 PNG assets checked, 0 reconverted, WebP transfer estimate 93% smaller than source PNG.
- Security audit: 0 vulnerabilities at `moderate` or higher.
- TypeScript: passed.
- Passive validation: 14 scenarios passed.
- Release metadata/assets: passed.
- Production build: passed.
- Dist budget: passed, total `9.97 MB`, PNG total `0.20 MB`.

Browser smoke results:
- Desktop `1440x1000`: menu -> character select -> exploration -> combat -> reward -> event -> event result -> shop -> rest passed.
- Mobile portrait `390x844`: menu -> character select -> exploration -> combat -> reward -> post-reward exploration passed.
- Prototype menu label check passed on desktop and mobile after adding `Prototype v0.1`.
- Browser console: 0 errors, 0 warnings observed by Playwright MCP console capture.
- QA screenshots: `output/release-qa-2026-05-01/`.
- Prototype menu screenshots: `output/prototype-release-qa-2026-05-01/`.

Known non-blocking notes:
- Vite reports Framer Motion `"use client"` module directive warnings during production build. These are third-party bundling warnings and do not fail the release gate.
- Mobile combat intel uses a horizontal scroll strip by design. The document itself does not create page-level horizontal scroll.
- Some decorative/background elements intentionally extend slightly outside the viewport; they are clipped by their screen containers and are not interaction blockers.

## Safe Work Completed In This Pass

- Ran the full local release gate and confirmed it passes.
- Ran targeted browser smoke coverage on desktop and mobile portrait.
- Confirmed release metadata, manifest, icons, headers, build output, and dist budget are covered by scripts.
- Confirmed external-account and user-owned decisions remain isolated in `docs/user-required-release-actions.md`.
- No code changes were required during this pass.

## Release Gate

Run from ``:

```powershell
npm run release:check
```

This must pass before publishing. It currently covers:
- WebP asset optimization refresh
- dependency vulnerability audit at moderate or higher severity
- TypeScript check
- passive combat validation
- release metadata and asset checks
- production build
- dist size budget

For a prototype/portfolio handoff, run:

```powershell
npm run prototype:check
```

This runs the release gate and verifies prototype-facing metadata, Stage 3 playable content status, and operations documentation.

## Plan To Reach Public Release

### Phase 1 - Local Release Candidate

Acceptance criteria:
- `npm run release:check` passes. Status: passed on 2026-05-01.
- Browser smoke test covers desktop combat, mobile combat, shop, event, reward, and rest. Status: passed on 2026-05-01.
- No console errors after fresh page load and one short run. Status: passed on 2026-05-01.
- `docs/content/content-source-ledger.md` has no unacknowledged blockers for the shipped scope.

Work:
- Keep using GitHub Pages as the fallback deploy target.
- Keep Stage 3 labeled as prototype content unless balance, generated assets, and owner approvals are ready, and label the first release as `Prototype v0.1`.
- Before calling the build complete, do one manual owner review of the content ledger and release label.

### Phase 2 - First Hosted Public Build

Acceptance criteria:
- Production URL is chosen.
- The chosen host serves correct base path.
- Static assets return long cache headers.
- `index.html` returns no-cache or must-revalidate.
- Open Graph image and manifest icons resolve at the public URL.
- PC app-window/PWA install behavior is verified in Chrome or Edge if the release wants a desktop-app-like entry point.

Work:
- If using GitHub Pages first: keep `VITE_BASE_PATH=/monochrome-the-eclipse/`.
- If using Cloudflare Pages first: set `VITE_BASE_PATH=/`.
- Publish only after the user confirms the canonical URL.
- After deploy, run the public URL smoke check for menu, manifest, Open Graph image, and one short run.
- If PC installability is part of the release, validate the deployed manifest, icons, `start_url`, base path, and standalone window launch from the canonical URL. Treat this as a browser-hosted PWA/app window, not a native desktop build.

### Phase 3 - Traffic Safety

Acceptance criteria:
- Custom domain is behind Cloudflare.
- Default hosting domain redirects to the canonical domain.
- Cache hit rate is visible.
- 4xx rate and top asset URLs are visible.
- Bot/human traffic can be inspected.

Work:
- Configure Cloudflare cache rules for static assets.
- Add canonical redirects.
- Add host-level 404 monitoring.

### Phase 4 - Product Telemetry

Acceptance criteria:
- Analytics is loaded only after a real measurement ID and privacy copy are approved.
- Core game events are tracked through a small adapter, not scattered direct calls.
- Operator dashboard can compare host traffic with in-game events.

Work:
- Add analytics adapter with no-op default.
- Track starts, route node choices, combat wins/losses, shop purchases, event choices, rewards, run endings, and fatal errors.
- Build a dashboard only after real traffic exists.

### Phase 5 - Broader Launch Quality

Acceptance criteria:
- Full browser regression suite exists for the critical path.
- Asset provenance is approved.
- Stage 3/content roadmap is clear to players.
- Save data migration rules are documented.

Work:
- Add Playwright smoke tests.
- Add a changelog and versioned release notes.
- Normalize final spritesheets and replace temporary generated derivatives where needed.

## Recommended Launch Scope

Ship as a web prototype or early access build after Phase 1 and Phase 2 pass.

Do not market it as a complete commercial release until Phase 3 through Phase 5 are complete or explicitly accepted as known risks.
