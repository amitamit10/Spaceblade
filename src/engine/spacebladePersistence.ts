const BEST_SCORE_KEY = "spaceblade.bestScore";
const BEST_WAVE_KEY = "spaceblade.bestWave";
const SCREEN_SHAKE_KEY = "spaceblade.screenShake";
const REDUCED_EFFECTS_KEY = "spaceblade.reducedEffects";
const VOLUME_KEY = "spaceblade.volume";

export type SpacebladeSettings = {
  readonly volume: number;
  readonly screenShakeEnabled: boolean;
  readonly reducedEffectsEnabled: boolean;
};

type SpacebladeMotionDefaults = Pick<SpacebladeSettings, "screenShakeEnabled" | "reducedEffectsEnabled">;

export function spacebladeMotionDefaults(prefersReducedMotion: boolean): SpacebladeMotionDefaults {
  return {
    screenShakeEnabled: !prefersReducedMotion,
    reducedEffectsEnabled: prefersReducedMotion,
  };
}

function readNumber(storage: Storage, key: string, fallback: number): number {
  const value = Number(storage.getItem(key));
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function readDecimal(storage: Storage, key: string, fallback: number): number {
  const raw = storage.getItem(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function readBoolean(storage: Storage, key: string, fallback: boolean): boolean {
  const value = storage.getItem(key);
  return value === null ? fallback : value === "true";
}

export function loadSpacebladeBest(storage: Storage): { readonly score: number; readonly wave: number } {
  return {
    score: readNumber(storage, BEST_SCORE_KEY, 0),
    wave: Math.max(1, readNumber(storage, BEST_WAVE_KEY, 1)),
  };
}

export function saveSpacebladeBest(
  storage: Storage,
  current: { readonly score: number; readonly wave: number },
): { readonly score: number; readonly wave: number } {
  const best = loadSpacebladeBest(storage);
  const next = {
    score: Math.max(best.score, Math.floor(current.score)),
    wave: Math.max(best.wave, Math.floor(current.wave)),
  };
  storage.setItem(BEST_SCORE_KEY, String(next.score));
  storage.setItem(BEST_WAVE_KEY, String(next.wave));
  return next;
}

export function loadSpacebladeSettings(
  storage: Storage,
  motionDefaults: SpacebladeMotionDefaults = { screenShakeEnabled: true, reducedEffectsEnabled: false },
): SpacebladeSettings {
  const volume = readDecimal(storage, VOLUME_KEY, 0.7);
  return {
    volume: Math.max(0, Math.min(1, volume)),
    screenShakeEnabled: readBoolean(storage, SCREEN_SHAKE_KEY, motionDefaults.screenShakeEnabled),
    reducedEffectsEnabled: readBoolean(storage, REDUCED_EFFECTS_KEY, motionDefaults.reducedEffectsEnabled),
  };
}

export function saveSpacebladeSettings(storage: Storage, settings: SpacebladeSettings): void {
  storage.setItem(VOLUME_KEY, String(Math.max(0, Math.min(1, settings.volume))));
  storage.setItem(SCREEN_SHAKE_KEY, String(settings.screenShakeEnabled));
  storage.setItem(REDUCED_EFFECTS_KEY, String(settings.reducedEffectsEnabled));
}
