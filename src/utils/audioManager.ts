import {
  AudioRuntimeOptions,
  BgmKey,
  defaultAudioOptions,
  ProceduralBgmPreset,
  sfxPresets,
  SfxKey,
  VoiceKey,
  bgmPresets,
} from './audioManifest';

type WindowWithAudio = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

const clamp01 = (value: number | undefined, fallback: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(1, Math.max(0, value));
};

const toAudioGain = (value: number) => Math.pow(clamp01(value, 0), 1.6);

class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private currentBgm: BgmKey | null = null;
  private musicNodes: AudioScheduledSourceNode[] = [];
  private musicTimer: number | null = null;
  private options: AudioRuntimeOptions = defaultAudioOptions;
  private unlocked = false;

  setOptions(options: Partial<AudioRuntimeOptions>) {
    this.options = {
      ...this.options,
      ...options,
      masterVolume: clamp01(options.masterVolume, this.options.masterVolume),
      musicVolume: clamp01(options.musicVolume, this.options.musicVolume),
      sfxVolume: clamp01(options.sfxVolume, this.options.sfxVolume),
      voiceVolume: clamp01(options.voiceVolume, this.options.voiceVolume),
    };

    this.applyVolumes();

    if (!this.options.enabled) {
      this.stopMusic();
    } else if (this.unlocked && this.currentBgm && this.musicNodes.length === 0) {
      this.playBgm(this.currentBgm);
    }
  }

  unlock() {
    const context = this.ensureContext();
    if (!context) return;

    this.unlocked = true;

    const startPendingBgm = () => {
      if (this.options.enabled && this.currentBgm && this.musicNodes.length === 0) {
        this.playBgm(this.currentBgm);
      }
    };

    if (context.state === 'suspended') {
      void context.resume().then(startPendingBgm).catch(() => {
        // Browsers can still reject audio resume; the next gesture will retry.
      });
    } else {
      startPendingBgm();
    }
  }

  playBgm(key: BgmKey) {
    this.currentBgm = key;
    if (!this.options.enabled) return;
    if (!this.unlocked) return;

    const context = this.ensureContext();
    if (!context || !this.musicGain) return;

    this.stopMusic(false);
    this.currentBgm = key;

    const preset = bgmPresets[key];
    const trackGain = context.createGain();
    const filter = context.createBiquadFilter();
    const now = context.currentTime;

    trackGain.gain.setValueAtTime(0.0001, now);
    trackGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, preset.gain), now + 1.15);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(preset.filterHz, now);
    filter.Q.setValueAtTime(0.7, now);

    trackGain.connect(filter);
    filter.connect(this.musicGain);

    this.startDrone(context, preset, trackGain);
    this.startPulse(context, preset, trackGain);
    this.startSequence(context, preset, trackGain);
  }

  playSfx(key: SfxKey) {
    if (!this.options.enabled) return;
    if (!this.unlocked) return;
    const context = this.ensureContext();
    if (!context || !this.sfxGain) return;
    if (context.state === 'suspended') void context.resume();

    this.playSteps(key, this.sfxGain, this.options.sfxVolume);
  }

  playVoice(key: VoiceKey) {
    if (!this.options.enabled) return;
    if (!this.unlocked) return;
    const context = this.ensureContext();
    if (!context || !this.voiceGain) return;
    if (context.state === 'suspended') void context.resume();

    this.playSteps(key, this.voiceGain, this.options.voiceVolume);
  }

  stopAll() {
    this.currentBgm = null;
    this.stopMusic();
  }

  private ensureContext() {
    if (typeof window === 'undefined') return null;

    if (!this.context) {
      const browserWindow = window as WindowWithAudio;
      const AudioContextClass = browserWindow.AudioContext ?? browserWindow.webkitAudioContext;
      if (!AudioContextClass) return null;

      this.context = new AudioContextClass();
      this.masterGain = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.voiceGain = this.context.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.voiceGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);
      this.applyVolumes();
    }

    return this.context;
  }

  private applyVolumes() {
    if (!this.masterGain || !this.musicGain || !this.sfxGain || !this.voiceGain || !this.context) return;

    const now = this.context.currentTime;
    const master = this.options.enabled ? toAudioGain(this.options.masterVolume) : 0;
    this.masterGain.gain.setTargetAtTime(master, now, 0.08);
    this.musicGain.gain.setTargetAtTime(toAudioGain(this.options.musicVolume), now, 0.08);
    this.sfxGain.gain.setTargetAtTime(toAudioGain(this.options.sfxVolume), now, 0.04);
    this.voiceGain.gain.setTargetAtTime(toAudioGain(this.options.voiceVolume), now, 0.04);
  }

  private stopMusic(clearCurrent = true) {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    this.musicNodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        // Already stopped.
      }
    });
    this.musicNodes = [];

    if (clearCurrent) {
      this.currentBgm = null;
    }
  }

  private startDrone(context: AudioContext, preset: ProceduralBgmPreset, destination: AudioNode) {
    const drone = context.createOscillator();
    const droneGain = context.createGain();
    const now = context.currentTime;

    drone.type = preset.waveform === 'square' ? 'triangle' : preset.waveform;
    drone.frequency.setValueAtTime(preset.padHz, now);
    drone.detune.setValueAtTime(-5, now);
    droneGain.gain.setValueAtTime(0.035, now);

    drone.connect(droneGain);
    droneGain.connect(destination);
    drone.start();
    this.musicNodes.push(drone);
  }

  private startPulse(context: AudioContext, preset: ProceduralBgmPreset, destination: AudioNode) {
    const pulse = context.createOscillator();
    const pulseGain = context.createGain();
    const now = context.currentTime;

    pulse.type = 'square';
    pulse.frequency.setValueAtTime(preset.pulseHz, now);
    pulseGain.gain.setValueAtTime(0.01, now);

    pulse.connect(pulseGain);
    pulseGain.connect(destination);
    pulse.start();
    this.musicNodes.push(pulse);
  }

  private startSequence(context: AudioContext, preset: ProceduralBgmPreset, destination: AudioNode) {
    let step = 0;

    const playNote = () => {
      const note = context.createOscillator();
      const noteGain = context.createGain();
      const now = context.currentTime;
      const multiplier = preset.sequence[step % preset.sequence.length];

      note.type = preset.waveform;
      note.frequency.setValueAtTime(preset.rootHz * multiplier, now);
      note.detune.setValueAtTime((step % 3) * 3, now);
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.exponentialRampToValueAtTime(0.045, now + 0.035);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.38, preset.tempoMs / 1200));

      note.connect(noteGain);
      noteGain.connect(destination);
      note.start(now);
      note.stop(now + Math.min(0.45, preset.tempoMs / 1000));

      step += 1;
    };

    playNote();
    this.musicTimer = window.setInterval(playNote, preset.tempoMs);
  }

  private playSteps(key: SfxKey | VoiceKey, destination: GainNode, volume: number) {
    const context = this.ensureContext();
    if (!context) return;

    const steps = sfxPresets[key];
    const now = context.currentTime;
    const volumeGain = toAudioGain(volume);

    steps.forEach((step) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const startTime = now + (step.delay ?? 0);
      const endTime = startTime + step.duration;

      oscillator.type = step.type;
      oscillator.frequency.setValueAtTime(step.frequency, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(30, step.endFrequency ?? step.frequency * 0.58),
        endTime,
      );

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, step.gain * volumeGain), startTime + 0.012);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

      oscillator.connect(gainNode);
      gainNode.connect(destination);
      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  }
}

export const audioManager = new AudioManager();
