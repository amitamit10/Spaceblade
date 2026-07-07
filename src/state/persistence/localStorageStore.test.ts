import { describe, it, expect, beforeEach } from "vitest";
import { createLocalStore, DEFAULT_SETTINGS, DEFAULT_PLAYER_NAME } from "./localStorageStore";

/** In-memory Storage stand-in so tests don't depend on jsdom globals. */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

describe("createLocalStore", () => {
  let store: ReturnType<typeof createLocalStore>;

  beforeEach(() => {
    store = createLocalStore(memoryStorage());
  });

  it("returns default settings when nothing is stored", () => {
    expect(store.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("persists and reloads settings", () => {
    store.setSettings({ volume: 0.3, screenShakeEnabled: false, reducedEffectsEnabled: true });
    expect(store.getSettings()).toEqual({
      volume: 0.3,
      screenShakeEnabled: false,
      reducedEffectsEnabled: true,
    });
  });

  it("updates best score only when the new score is higher", () => {
    expect(store.updateBestScore(100)).toBe(100);
    expect(store.updateBestScore(50)).toBe(100); // not lowered
    expect(store.updateBestScore(250)).toBe(250);
    expect(store.getBestScore()).toBe(250);
  });

  it("updates best wave only when higher", () => {
    store.updateBestWave(5);
    expect(store.updateBestWave(3)).toBe(5);
    expect(store.updateBestWave(9)).toBe(9);
  });

  it("defaults tutorialSeen to false and persists true", () => {
    expect(store.getTutorialSeen()).toBe(false);
    store.setTutorialSeen(true);
    expect(store.getTutorialSeen()).toBe(true);
  });

  it("defaults the player name to Pilot", () => {
    expect(store.getPlayerName()).toBe(DEFAULT_PLAYER_NAME);
    store.setPlayerName("Neo");
    expect(store.getPlayerName()).toBe("Neo");
  });
});
