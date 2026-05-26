# Audio Asset Slots

Runtime audio currently uses procedural Web Audio placeholders, so the game can be tested before final files exist.

Replace or add production files here later without changing gameplay code:

- `bgm/` - menu, exploration, combat, event, rest, shop, victory, defeat loops
- `sfx/` - UI, coin, combat, reward, event, rest, shop one-shots
- `voice/` - short character attack, hit, death barks
- `ambience/` - city ruin, eclipse wind, campfire, shop room beds

Keep public code references stable through `utils/audioManifest.ts` keys instead of coupling screens to filenames.
