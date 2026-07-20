export type SoundCue = "slash" | "energyShot" | "parry" | "hit" | "enemyHit" | "enemyAlert" | "glitchTeleport" | "boss" | "parkourJump" | "wallClimb" | "landing" | "ambient";

export type SoundBus = {
  play(cue: SoundCue): void;
  stopAmbient(): void;
};

/** Clamps a raw volume into the valid [0, 1] gain range. */
export function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) return 0;
  return Math.max(0, Math.min(1, volume));
}

export const SOUND_ASSETS: Readonly<Record<SoundCue, string | null>> = {
  slash: "/audio/kenney/slash.ogg",
  energyShot: "/audio/kenney/energy-shot.ogg",
  parry: "/audio/kenney/parry.ogg",
  hit: "/audio/kenney/hit.ogg",
  enemyHit: "/audio/kenney/enemy-hit.ogg",
  enemyAlert: "/audio/kenney/enemy-alert.ogg",
  glitchTeleport: "/audio/kenney/glitch-teleport.ogg",
  boss: "/audio/kenney/boss.ogg",
  parkourJump: "/audio/kenney/parkour-jump.ogg",
  wallClimb: "/audio/kenney/wall-climb.ogg",
  landing: "/audio/kenney/landing.ogg",
  ambient: null,
};

type AudioCtor = new (src?: string) => HTMLAudioElement;

function resolveAudio(): AudioCtor | null {
  const g = globalThis as unknown as {
    Audio?: AudioCtor;
  };
  return g.Audio ?? null;
}

/**
 * Plays short local CC0 assets. Master volume is read live and clamped before
 * each playback. Degrades to a no-op where HTML audio is unavailable or
 * autoplay is blocked, so gameplay never depends on audio.
 */
export function createSoundBus(getVolume: () => number): SoundBus {
  const Ctor = resolveAudio();
  let ambient: HTMLAudioElement | null = null;

  const play = (cue: SoundCue): void => {
    const source = SOUND_ASSETS[cue];
    if (!Ctor || !source) return;
    const master = clampVolume(getVolume());
    if (master <= 0) return;

    const audio = new Ctor(source);
    audio.preload = "auto";
    audio.volume = master;
    try {
      // Browsers may block playback until the first user gesture. Some test
      // environments also throw synchronously instead of returning a promise.
      void Promise.resolve(audio.play()).catch(() => undefined);
    } catch {
      // Audio is optional and must never interrupt gameplay.
    }
  };

  const stopAmbient = (): void => {
    if (!ambient) return;
    ambient.pause();
    ambient.currentTime = 0;
    ambient = null;
  };

  return { play, stopAmbient };
}
