# Monochrome: The Eclipse Release Readiness Checklist

Last updated: 2026-05-01

## Current Focus
- Finish the main game experience before framework migration.
- Keep combat readable on desktop, mobile portrait, and mobile landscape.
- Apply character and monster sprites through stable asset keys and data fields.
- Keep save data serializable and recoverable from the lobby.

## Current Gate Status
- `npm run release:check` passed on 2026-05-01.
- Desktop browser smoke passed for menu, character select, exploration, combat, reward, event, event result, shop, and rest.
- Mobile portrait browser smoke passed for menu, character select, exploration, combat, reward, and post-reward exploration.
- Browser console capture reported 0 errors and 0 warnings.
- QA screenshots are stored in `output/release-qa-2026-05-01/`.
- Remaining release blockers are user-owned account/domain/rights decisions, tracked in `docs/user-required-release-actions.md`.
- Prototype/portfolio handoff gate is `npm run prototype:check` from ``.

## Implemented In Current Pass
- Persistent game options in Zustand:
  - reduced motion
  - high contrast
  - large text
  - sound on/off
  - combat assist on/off
  - tutorial on/off
- Lobby continue/new-run split.
- Persisted run recovery for player, route, combat, event, resources, coins, and selected combat state.
- Screen-level tutorial coachmarks for lobby, character select, exploration, combat, shop, and event.
- Lightweight synthesized UI sounds for select, confirm, deny, and execute.
- Combat assist strip: coin check -> pattern select -> execute.
- Korean text cleanup on lobby, combat, shop, and event screens.
- Combat battlefield pass:
  - enemy coin intent sits above the enemy HP bar
  - player pattern rail is grid-sized instead of horizontal-scroll dependent
  - execution area shows selected pattern, enemy intent, expected damage, and both attack/defense totals
  - foot status effects use larger icon badges instead of tiny labels under HP
- Event art pass:
  - random event scenes use case-specific background images
  - event result panel keeps scene context visible
- Shop/rest/reward readability pass:
  - decision panels use opaque surfaces
  - shop item tab shrinks to its short content while upgrade/skill tabs keep scroll behavior

## Deferred Infrastructure
- Custom domain, Cloudflare caching, canonical redirects, GA4, sitemap, and operator dashboard are intentionally deferred until the production domain and account IDs are available.
- Current local preparation lives in `docs/operations/traffic-cost-runbook.md`.
- The current release plan is `docs/release-readiness-plan-2026-05-01.md`.
- User-owned account/domain/legal tasks are tracked in `docs/user-required-release-actions.md`.
- Product/operations handoff docs live in `docs/design/prototype-product-brief.md` and `docs/operations/prototype-operations-playbook.md`.

## Asset Notes
- Player sprites are referenced from `public/assets/characters/sprites/`.
- Monster sprites and portraits are referenced from `public/assets/monsters/`.
- Data source fields:
  - `portraitSrc`
  - `spriteSheetSrc`
  - `spriteFrameSize`
  - `spriteAnimations`
- The current sprite sheets are usable in-game, but final production art should be normalized to consistent frame boxes before release.

## Balance Follow-Up
- Record win/loss and remaining HP by character for stage 1-3.
- Check if reserve coin cost scales too quickly for early runs.
- Check if warrior resonance damage is readable enough before execution.
- Verify event choices expose risk before irreversible random rolls.
- Tune shop prices only after 10+ short runs per character.

## Mobile QA Checklist
- No horizontal scroll at 390x844.
- Combat execute button reachable with one thumb.
- Player/enemy sprites remain visible behind HUD.
- Coin row and pattern rail remain tappable.
- Tutorial coachmark does not cover the primary CTA.
- Landscape combat fits in one screen without panel scrolling.

## Verification Commands
Run from ``:

```bash
npm run release:check
```

Prototype/portfolio handoff gate:

```bash
npm run prototype:check
```

Recommended visual captures:
- menu
- character select
- route select
- desktop combat
- mobile portrait combat
- combat reward
- shop
- rest
- event
- event result
- mobile landscape combat
