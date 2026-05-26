# Asset Transparency Notes

## 2026-04-29 Combat Monster Sprites

Alpha inspection found these monster spritesheets had opaque dark mattes:

- `public/assets/monsters/sprites/006_shadow_wraith-spritesheet.png`
- `public/assets/monsters/sprites/007_doppelganger-spritesheet.png`
- `public/assets/monsters/sprites/010_chimera-spritesheet.png`

Current treatment: original files are kept, and transparent derivatives are referenced from `dataMonsters.ts`.

- `006_shadow_wraith-transparent.png`
- `006_shadow_wraith-spritesheet-transparent.png`
- `007_doppelganger-transparent.png`
- `007_doppelganger-spritesheet-transparent.png`
- `010_chimera-transparent.png`
- `010_chimera-spritesheet-transparent.png`

The transparent derivatives were produced by clearing edge-connected dark matte pixels from the existing generated assets. This avoids the previous CSS `mix-blend-mode` workaround and gives the combat renderer real alpha transparency.

Status: 추후 대체/변경 필요. These are still derived cleanup files, not final hand-authored or regenerated production spritesheets. Replace them with transparent-background spritesheets generated from the monster concept direction when the asset pass is redone.

Related UI note: the combat bottom HUD now keeps a compact two-column layout from 900px to 1279px so half-width PC windows do not stack action controls under the coin/pattern rail.
