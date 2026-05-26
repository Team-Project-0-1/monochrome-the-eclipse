# Monochrome: The Eclipse Audio System Notes

## Current Decision

The app now has a runtime audio layer before final audio production.

- Final release audio should be produced separately or sourced through licensed packs.
- The current implementation uses procedural Web Audio placeholders for BGM, SFX, and voice barks.
- Gameplay code calls stable audio keys, not filenames, so placeholder sound can be replaced later.

## Runtime Files

- `utils/audioManifest.ts`
  - Audio keys, procedural presets, screen-to-BGM mapping.
- `utils/audioManager.ts`
  - Web Audio context, gain groups, placeholder music loops, SFX playback.
- `utils/sound.ts`
  - Small gameplay-facing helpers: `playUiSound`, `playGameSfx`, `playVoiceBark`.
- `components/AudioController.tsx`
  - React bridge that follows game state, combat hits, event phases, and options.
- `public/assets/audio/README.md`
  - Future production asset slots.

## Production Audio Needed Later

### BGM

- `menu`: low piano/drone, ruined city eclipse motif.
- `exploration`: restrained pulse, same motif with movement energy.
- `combat`: metallic rhythm and coin-like percussion.
- `combatElite`: faster and more unstable combat layer.
- `combatBoss`: heavier low-end eclipse theme.
- `event`: sparse tension, room for dialogue.
- `rest`: campfire, soft resonance, low fatigue.
- `shop`: enclosed room tone, coin and metal detail.
- `victory`: brief resolved version of the main motif.
- `defeat`: degraded motif, low descending texture.

### SFX

- UI select/confirm/deny/execute
- coin flip/clash/pattern lock
- combat start/attack/skill/hit/death
- item, coin, skill reward
- event choice/result
- rest heal
- shop enter/buy

### Voice Barks

Start with short non-dialogue barks:

- Warrior: attack, hit, death
- Rogue: attack, hit, death
- Tank: attack, hit, death
- Mage: attack, hit, death

Full spoken dialogue can wait until story text is locked.
