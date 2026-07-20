import { describe, expect, it } from "vitest";
import { loadSpacebladeBest, loadSpacebladeSettings, saveSpacebladeBest, saveSpacebladeSettings, spacebladeMotionDefaults } from "./spacebladePersistence";

function storage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() { return values.size; },
  };
}

describe("Spaceblade best-run persistence", () => {
  it("loads safe defaults and keeps the strongest run", () => {
    const store = storage();

    expect(loadSpacebladeBest(store)).toEqual({ score: 0, wave: 1 });
    expect(saveSpacebladeBest(store, { score: 900, wave: 4 })).toEqual({ score: 900, wave: 4 });
    expect(saveSpacebladeBest(store, { score: 100, wave: 2 })).toEqual({ score: 900, wave: 4 });
  });

  it("normalizes invalid stored values", () => {
    const store = storage();
    store.setItem("spaceblade.bestScore", "not-a-score");
    store.setItem("spaceblade.bestWave", "-4");

    expect(loadSpacebladeBest(store)).toEqual({ score: 0, wave: 1 });
  });

  it("persists the two visual accessibility settings", () => {
    const store = storage();

    expect(loadSpacebladeSettings(store)).toEqual({ volume: 0.7, screenShakeEnabled: true, reducedEffectsEnabled: false });
    saveSpacebladeSettings(store, { volume: 0.35, screenShakeEnabled: false, reducedEffectsEnabled: true });
    expect(loadSpacebladeSettings(store)).toEqual({ volume: 0.35, screenShakeEnabled: false, reducedEffectsEnabled: true });
  });

  it("uses motion-preference defaults only when no explicit setting is saved", () => {
    const store = storage();
    const motionDefaults = { screenShakeEnabled: false, reducedEffectsEnabled: true };

    expect(loadSpacebladeSettings(store, motionDefaults)).toMatchObject(motionDefaults);
    saveSpacebladeSettings(store, { volume: 0.7, screenShakeEnabled: true, reducedEffectsEnabled: false });
    expect(loadSpacebladeSettings(store, motionDefaults)).toMatchObject({ screenShakeEnabled: true, reducedEffectsEnabled: false });
  });

  it("maps the reduced-motion preference to safe visual defaults", () => {
    expect(spacebladeMotionDefaults(true)).toEqual({ screenShakeEnabled: false, reducedEffectsEnabled: true });
    expect(spacebladeMotionDefaults(false)).toEqual({ screenShakeEnabled: true, reducedEffectsEnabled: false });
  });
});
