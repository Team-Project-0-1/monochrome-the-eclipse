# Prototype Product Brief

Version: Prototype v0.1
Last updated: 2026-05-19

## Positioning

`Monochrome: The Eclipse` is a portfolio-ready browser prototype for a turn-based roguelite RPG where coin faces become combat patterns. The release is meant to prove the core combat loop, visual direction, and production discipline, not to claim a finished commercial campaign.

## Player Promise

The player should understand this within the first few minutes:
- Flip and read five coins.
- Select matching patterns.
- Compare expected damage, defense, and enemy intent.
- Choose route nodes and rewards that change the next fight.
- Finish the available 1-3 stage prototype scope and see a complete run conclusion.

## Release Scope

Included:
- Playable lobby, character select, exploration, combat, reward, event, shop, rest, game over, and stage clear flows.
- Stage 1, Stage 2, and Stage 3 combat content connected through the current route system.
- Stage 3 boss reward flow with 3 `비기` choices before victory.
- Public-safe Stage 3 presentation mode for broader prototype builds while generated Stage 3 art is pending approval.
- Character-specific combat tools and passive validation coverage.
- Responsive desktop and mobile portrait smoke-tested layout.
- Release metadata, web app manifest, icons, cache/security headers, and dist budget checks.

Explicitly not included:
- Final Stage 3 balance certification.
- Final Stage 3 event/balance certification from external playtests.
- Final paid-release provenance approval for generated monster/background assets. Public-safe builds do not ship the approval-sensitive Stage 3 generated monster/background files.
- Production analytics dashboard.
- Full automated browser E2E suite.

## Portfolio Narrative

Use this when presenting the project:

> I built a React/Vite browser game prototype with a custom coin-pattern combat system, Zustand state slices, data-driven monsters/events, a playable 1-3 stage run, Stage 3 boss reward choices, persistent run recovery, asset optimization, release checks, and a documented operations path.

## Quality Bar

The prototype is shippable when:
- `npm run prototype:check` passes. For a public URL build, set `VITE_STAGE3_PUBLIC_SAFE_MODE=1` before running the same script (PowerShell: `$env:VITE_STAGE3_PUBLIC_SAFE_MODE='1'; npm run prototype:check`) — runtime uses neutral fallbacks and the build prunes approval-sensitive Stage 3 generated assets from `dist/`. For an owner/internal art-review build, run the script without that env var.
- The first screen clearly labels the build as `Prototype v0.1`.
- The public copy does not imply a finished paid game.
- The public-safe build is used unless the generated Stage 3 monster/background assets have owner provenance approval.
- Stage 3 playable content, strict content checks, and source-trace docs are current.
- A reviewer can find the product brief, release criteria, user-required actions, and operations playbook without asking the developer.

## Demo Script

Recommended 3-5 minute portfolio walkthrough:
1. Show the menu label and accessibility/audio options.
2. Start a new run and pick a character.
3. Choose a route node and enter combat.
4. Explain coin faces, pattern selection, enemy intent, and combat prediction.
5. Claim a reward and show how the run branches through event/shop/rest states.
6. End by showing the release/operations docs and verification command.

## Next Product Gates

Before calling it Early Access:
- Stage 3 balance, event text, and generated monster/background assets are validated by external playtests and owner approval.
- At least 10 external playtest notes exist.
- Two or more characters have clear replay appeal.
- Asset/audio commercial rights are approved.
- A committed browser smoke suite replaces ad hoc manual smoke checks.

## Stage 3 Planning Docs

- [stage-3-prd.md](./stage-3-prd.md) records the source-derived implemented gate, boss, and reward requirements.
- [stage-3-content-brief.md](./stage-3-content-brief.md) tracks runtime keys, monster patterns, and remaining prototype caveats.
