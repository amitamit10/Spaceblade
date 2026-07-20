import { describe, expect, it } from "vitest";
import {
  PUBLIC_EXPLOSION_SOURCES,
  PUBLIC_SHOT_SOURCES,
  publicExplosionSourceAt,
  publicShotSourceAt,
} from "./publicEffectAnimation";

describe("public effect animation", () => {
  it("cycles the licensed shot frames in order without changing projectile timing", () => {
    expect(publicShotSourceAt(0)).toBe(PUBLIC_SHOT_SOURCES[0]);
    expect(publicShotSourceAt(69)).toBe(PUBLIC_SHOT_SOURCES[0]);
    expect(publicShotSourceAt(70)).toBe(PUBLIC_SHOT_SOURCES[1]);
    expect(publicShotSourceAt(140)).toBe(PUBLIC_SHOT_SOURCES[2]);
    expect(publicShotSourceAt(210)).toBe(PUBLIC_SHOT_SOURCES[0]);
  });

  it("clamps negative elapsed time to the first frame", () => {
    expect(publicShotSourceAt(-100)).toBe(PUBLIC_SHOT_SOURCES[0]);
  });

  it("plays the enemy explosion once and holds the final frame", () => {
    expect(publicExplosionSourceAt(0)).toBe(PUBLIC_EXPLOSION_SOURCES[0]);
    expect(publicExplosionSourceAt(300)).toBe(PUBLIC_EXPLOSION_SOURCES[5]);
    expect(publicExplosionSourceAt(900)).toBe(PUBLIC_EXPLOSION_SOURCES[5]);
  });
});
