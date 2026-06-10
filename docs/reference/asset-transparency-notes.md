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

## 2026-06-10 Archive Art Direction Textures

아카이브 아트 디렉션(specs/2026-06-10-archive-art-direction-design.md)의 재질 텍스처 2종:

- `public/assets/archive/desk-surface.jpg` (242 KB, 1536×1024) — 책상 표면(청흑·한랭 사이안 광)
- `public/assets/archive/photo-paper.jpg` (131 KB, 1536×1024) — 은염 인화지(한랭 회색)

출처: Codex CLI 내장 이미지 생성 도구(gpt-image 계열)로 생성한 PNG(.tmp/archive-textures/, 비추적)를
ffmpeg `-q:v 4` JPEG로 변환. WebP가 아닌 JPEG인 이유: 로컬 ffmpeg 빌드에 libwebp 인코더가 없고,
dist 예산 가드는 PNG만 금지하므로 알파 불필요한 전면 텍스처는 JPEG로 충분.
적용 방식: CSS url() 대신 컴포넌트 인라인 CSS 변수(`assetCssUrl`) — public 에셋 절대경로는
Vite가 CSS에서 base path 리베이스를 안 해 GH Pages 배포에서 깨지기 때문.

Status: 프로덕션 후보. 팔레트 변경 시 `scripts/generate-archive-textures.mjs`(Gemini 경로) 또는
Codex 이미지 생성으로 재생성 후 동일 변환 절차 적용.
