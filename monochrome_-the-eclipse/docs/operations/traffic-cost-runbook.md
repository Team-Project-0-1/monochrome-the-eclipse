# Traffic and Cost Runbook

This project can run as a mostly static game, so the first cost lever is to keep repeated downloads away from the origin.

## Applied locally

- PNG assets are converted to WebP with `npm run optimize:assets`.
- Event, item, status, pattern, skill, reward, and stage assets now resolve through generated asset manifests where available.
- Runtime asset URLs go through `utils/assetPath.ts`, which prefers generated WebP files when available.
- Production build prunes optimized PNG files from `dist` when a matching WebP exists.
- `npm run check:dist` enforces a small production bundle budget so asset bloat is caught early.
- `npm run release:check` refreshes optimized assets, runs dependency audit, validates release metadata, builds, and checks the dist budget.
- Browser metadata now includes description, Open Graph image, favicon, app manifest, and theme color.
- `public/_headers` contains security headers and long-lived cache hints for static assets for platforms that support it. GitHub Pages does not apply this file; Cloudflare Pages/Netlify/CDN header injection is required for those controls to be active.
- UI image usage is biased toward static file URLs so CDN/browser cache can reuse art across combat, shop, event, rest, and reward screens.

## Connect later

These need external account or domain access, so they are intentionally deferred:

- Put the production custom domain behind Cloudflare.
- If the first public build stays on GitHub Pages, add a CDN/proxy header rule set that mirrors `public/_headers`; otherwise treat GitHub Pages as a fallback without active CSP/cache header enforcement.
- Add Cloudflare cache rules for `/assets/*`, `*.webp`, `*.js`, and `*.css`.
- Redirect any default hosting domain to the canonical custom domain.
- Add GA4 only after the real measurement ID is available.
- Wire game events to the analytics adapter only after the privacy copy and event naming are fixed.
- Add a final `sitemap.xml` after the canonical production URL is fixed.
- Build an operator dashboard after Cloudflare and GA4 have real traffic data. Track human/bot ratio, cache hit rate, 4xx rate, top asset URLs, starts, combat wins/losses, shop purchases, event choices, and run endings.

## Next improvements to consider

- Lazy-load game screens from `App.tsx` so the first JavaScript download is smaller.
- Remove unused source PNG variants from `public/assets` after confirming every referenced image has a WebP equivalent.
- Split monster and stage assets by route so late-stage art is not reachable from early game screens unless needed.
- Add a simple analytics adapter with a no-op default, then wire GA4 later without touching game logic.
- Add a size budget check that fails CI when `dist` grows unexpectedly.
- Add Cloudflare or hosting-level 404 monitoring once deployed.
- Review whether combat sprites and late-stage monsters should be route-lazy-loaded after the first public traffic sample.
