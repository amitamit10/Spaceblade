import type { SettingsState } from "../../app/types";

const KEYS = {
  bestScore: "spaceblade.bestScore",
  bestWave: "spaceblade.bestWave",
  settings: "spaceblade.settings",
  tutorialSeen: "spaceblade.tutorialSeen",
  playerName: "spaceblade.playerName",
} as const;

export const DEFAULT_SETTINGS: SettingsState = {
  volume: 0.8,
  screenShakeEnabled: true,
  reducedEffectsEnabled: false,
};

export const DEFAULT_PLAYER_NAME = "Pilot";

export type LocalStore = {
  getBestScore(): number;
  updateBestScore(score: number): number;
  getBestWave(): number;
  updateBestWave(wave: number): number;
  getSettings(): SettingsState;
  setSettings(settings: SettingsState): void;
  getTutorialSeen(): boolean;
  setTutorialSeen(seen: boolean): void;
  getPlayerName(): string;
  setPlayerName(name: string): void;
};

/**
 * Typed wrapper over a Storage backend (localStorage by default) for all
 * persisted app state. Every read tolerates missing/corrupt values by
 * returning a sane default, and every write is guarded against storage errors.
 */
export function createLocalStore(storage: Storage = window.localStorage): LocalStore {
  const readNumber = (key: string): number => {
    const raw = safeGet(storage, key);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    getBestScore: () => readNumber(KEYS.bestScore),
    updateBestScore: (score) => {
      const best = Math.max(readNumber(KEYS.bestScore), Math.floor(score));
      safeSet(storage, KEYS.bestScore, String(best));
      return best;
    },
    getBestWave: () => readNumber(KEYS.bestWave),
    updateBestWave: (wave) => {
      const best = Math.max(readNumber(KEYS.bestWave), Math.floor(wave));
      safeSet(storage, KEYS.bestWave, String(best));
      return best;
    },
    getSettings: () => {
      const raw = safeGet(storage, KEYS.settings);
      if (raw === null) return { ...DEFAULT_SETTINGS };
      try {
        const parsed = JSON.parse(raw) as Partial<SettingsState>;
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    },
    setSettings: (settings) => {
      safeSet(storage, KEYS.settings, JSON.stringify(settings));
    },
    getTutorialSeen: () => safeGet(storage, KEYS.tutorialSeen) === "true",
    setTutorialSeen: (seen) => {
      safeSet(storage, KEYS.tutorialSeen, seen ? "true" : "false");
    },
    getPlayerName: () => safeGet(storage, KEYS.playerName) ?? DEFAULT_PLAYER_NAME,
    setPlayerName: (name) => {
      safeSet(storage, KEYS.playerName, name);
    },
  };
}

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode / quota); persistence is best-effort.
  }
}
