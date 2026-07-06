import { describe, it, expect } from "vitest";
import { clampVolume, createSoundBus } from "./soundBus";

describe("clampVolume", () => {
  it("clamps values below 0 up to 0", () => {
    expect(clampVolume(-1)).toBe(0);
  });

  it("clamps values above 1 down to 1", () => {
    expect(clampVolume(2)).toBe(1);
  });

  it("passes through in-range values", () => {
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(0.5)).toBe(0.5);
    expect(clampVolume(1)).toBe(1);
  });

  it("treats NaN as silence", () => {
    expect(clampVolume(Number.NaN)).toBe(0);
  });
});

describe("createSoundBus", () => {
  it("does not throw when Web Audio is unavailable", () => {
    // jsdom has no AudioContext; the bus must degrade to a safe no-op.
    const bus = createSoundBus(() => 0.8);
    expect(() => bus.play("slash")).not.toThrow();
    expect(() => bus.play("ambient")).not.toThrow();
    expect(() => bus.stopAmbient()).not.toThrow();
  });
});
