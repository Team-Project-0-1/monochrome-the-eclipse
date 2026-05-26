import { audioManager } from './audioManager';
import { SfxKey, VoiceKey } from './audioManifest';

export type UiSoundKind = 'select' | 'confirm' | 'deny' | 'execute';

const uiSoundToSfx: Record<UiSoundKind, SfxKey> = {
  select: 'uiSelect',
  confirm: 'uiConfirm',
  deny: 'uiDeny',
  execute: 'uiExecute',
};

export const playUiSound = (enabled: boolean, kind: UiSoundKind = 'select') => {
  if (!enabled) return;

  try {
    audioManager.unlock();
    audioManager.playSfx(uiSoundToSfx[kind]);
  } catch {
    // Audio feedback must never block game input.
  }
};

export const playGameSfx = (enabled: boolean, key: SfxKey) => {
  if (!enabled) return;

  try {
    audioManager.unlock();
    audioManager.playSfx(key);
  } catch {
    // Gameplay input must continue even when the browser blocks audio.
  }
};

export const playVoiceBark = (enabled: boolean, key: VoiceKey) => {
  if (!enabled) return;

  try {
    audioManager.unlock();
    audioManager.playVoice(key);
  } catch {
    // Voice is an enhancement, not a gameplay dependency.
  }
};
