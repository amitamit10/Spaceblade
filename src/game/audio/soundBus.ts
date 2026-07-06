export type SoundCue = "slash" | "parry" | "hit" | "enemyAlert" | "boss" | "ambient";

export type SoundBus = {
  play(cue: SoundCue): void;
  stopAmbient(): void;
};

/** Clamps a raw volume into the valid [0, 1] gain range. */
export function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) return 0;
  return Math.max(0, Math.min(1, volume));
}

type CueSpec = { type: OscillatorType; freq: number; durationMs: number; gain: number };

const CUES: Record<SoundCue, CueSpec> = {
  slash: { type: "triangle", freq: 620, durationMs: 90, gain: 0.25 },
  parry: { type: "square", freq: 880, durationMs: 140, gain: 0.3 },
  hit: { type: "sawtooth", freq: 220, durationMs: 80, gain: 0.28 },
  enemyAlert: { type: "square", freq: 320, durationMs: 120, gain: 0.2 },
  boss: { type: "sawtooth", freq: 110, durationMs: 320, gain: 0.32 },
  ambient: { type: "sine", freq: 70, durationMs: 0, gain: 0.12 },
};

type AudioCtor = new () => AudioContext;

function resolveAudioContext(): AudioCtor | null {
  const g = globalThis as unknown as {
    AudioContext?: AudioCtor;
    webkitAudioContext?: AudioCtor;
  };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

/**
 * Generates all sound cues in code via the Web Audio API — no asset files.
 * Master volume is read live through `getVolume` and clamped to [0, 1] before
 * any node is scheduled. Degrades to a no-op where Web Audio is unavailable
 * (e.g. jsdom), so gameplay never depends on audio.
 */
export function createSoundBus(getVolume: () => number): SoundBus {
  const Ctor = resolveAudioContext();
  let ctx: AudioContext | null = null;
  let ambient: { osc: OscillatorNode; gain: GainNode } | null = null;

  const ensureContext = (): AudioContext | null => {
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    return ctx;
  };

  const play = (cue: SoundCue): void => {
    const ac = ensureContext();
    if (!ac) return;
    const master = clampVolume(getVolume());
    if (master <= 0) return;

    const spec = CUES[cue];

    if (cue === "ambient") {
      if (ambient) return;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = spec.type;
      osc.frequency.value = spec.freq;
      gain.gain.value = spec.gain * master;
      osc.connect(gain).connect(ac.destination);
      osc.start();
      ambient = { osc, gain };
      return;
    }

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = spec.type;
    osc.frequency.value = spec.freq;
    const peak = spec.gain * master;
    const now = ac.currentTime;
    const dur = spec.durationMs / 1000;
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur);
  };

  const stopAmbient = (): void => {
    if (!ambient) return;
    try {
      ambient.osc.stop();
    } catch {
      // Already stopped; ignore.
    }
    ambient = null;
  };

  return { play, stopAmbient };
}
