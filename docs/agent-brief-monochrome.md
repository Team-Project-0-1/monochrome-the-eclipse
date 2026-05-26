# Monochrome: The Eclipse Agent Brief

이 문서는 이후 에이전트가 Google Drive를 매번 다시 뒤지지 않고도 현재 기획 의도와 구현 방향을 빠르게 이해하도록 만든 로컬 브리프입니다.

## Canonical Sources

- Drive root: `Project 0.1%`
- Primary folder: `03. 동전 전투 (포폴)`
- Key docs checked:
  - `동전 GDD`
  - `PRD와 기획서`
  - `UI 플로우`
  - `코인 전투 시스템`
  - `몬스터 컨셉`
  - `플레이어블 캐릭터` sheet
- The newer character planning sheet returned `403`, so local implementation and user corrections take priority when Drive content conflicts.

## Product Intent

- Dark monochrome pixel-fantasy roguelite.
- Core loop: character select -> 15-stage route -> combat/event/shop/rest/miniboss/boss -> reward -> next route.
- Combat should feel like visible character confrontation, close to a Limbus Company style duel, while keeping coin and pattern readability.
- PC combat should compare player and enemy left/right.
- Mobile combat should compare player and enemy vertically, with core state visible in one screen as much as possible.
- UI should not feel like stacked cards covering the game. Battlefield/background characters should dominate, with HUD overlays placed lightly on top.

## Combat Rules To Preserve

- Do not change balance/rules unless explicitly requested.
- Five coins drive combat.
- Coin faces form patterns such as Pair, Triple, Quad, Penta, Unique, and Awakening.
- Planning/intervention/execution phases matter.
- Readability priority:
  1. Turn/combat state
  2. Coin result
  3. Pattern/skill result
  4. Status effects
  5. Combat log

## Character Direction

Playable characters should be pixel-style dark fantasy silhouettes, not generic Lucide icon classes.

- Warrior: `김훈희`
  - Weapon: `소리 굽쇠`
  - Do not draw as sword/axe warrior.
  - Theme: hearing/resonance/amplify.
- Rogue:
  - Theme: pursuit/mark.
- Mage:
  - Theme: curse/seal.
- Tank:
  - Theme: counter/shatter.

If Drive lore and the current app conflict, prefer current app data plus explicit user corrections.

## Monster Direction

Monster concepts confirmed from Drive and current assets:

- `marauder1` / 약탈자1: nimble survivor, worn longsword, pursuit.
- `marauder2` / 약탈자2: strong survivor, worn sledgehammer, amplify.
- `infectedDog` / 감염된 들개: infected teeth/claws, curse.
- `marauderLeader` / 약탈자 리더: mutated/spiked skin, fists/body weapon, counter/shatter.
- `lumenReaper` / 루멘 리퍼: shadow scythe, senses light, curse/seal/bleed.

## Current Local Reference Art

- Character and monster assets live under:
  - `public/assets/characters/`
  - `public/assets/monsters/`
- Visual audit screenshots live under:
  - `.omx/context/visual-audit-20260427/`
  - `.omx/context/visual-audit-20260427-after/`
- Subagent-generated UI concepts were summarized in:
  - `.omx/context/visual-concepts-20260427.md`

## Implementation Notes

- Main app path: repo root (no subfolder; the app was flattened in `chore(structure): flatten` series).
- Framework: Vite + React + TypeScript + Zustand.
- Deployment base path: `/monochrome-the-eclipse/`
- Keep the project on Vite unless a migration is explicitly approved. For release scope, improve the current structure first.
- Do not add dependencies without explicit user approval.
- Use common UI primitives and tokens where possible.
- Keep character/monster sprite config in data files so Character Select, Character Status, and Combat reuse the same assets.
- For visual changes, generate or compare image concepts first when the user asks for visual direction. The user requires image generation through subagents, max 4 images per subagent.

## Verification Baseline

Run from ``:

```bash
npx tsc --noEmit
npm run build
```

Browser screenshots should cover:

- Desktop: `1440x900`
- Mobile portrait: `390x844`
- Mobile landscape: `844x390`
- Screens: Menu, Character Select, Exploration, Combat

Known acceptable warning:

- Vite may print Framer Motion `use client` directive warnings. This is from the dependency bundle and is not currently a runtime blocker.
