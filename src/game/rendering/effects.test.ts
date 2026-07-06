import { describe, it, expect } from "vitest";
import { shouldRenderEffect, createEffectSystem } from "./effects";
import type { EffectKind } from "./effects";

describe("shouldRenderEffect", () => {
  it("renders every effect when reduced effects is off", () => {
    const all: EffectKind[] = [
      "slashArc",
      "shockwave",
      "parryFlash",
      "dashTrail",
      "hitSpark",
      "enemyTelegraph",
      "ambientParticle",
      "screenFlash",
    ];
    for (const kind of all) {
      expect(shouldRenderEffect(kind, false)).toBe(true);
    }
  });

  it("keeps combat-critical effects in reduced mode", () => {
    const kept: EffectKind[] = [
      "slashArc",
      "shockwave",
      "parryFlash",
      "hitSpark",
      "enemyTelegraph",
    ];
    for (const kind of kept) {
      expect(shouldRenderEffect(kind, true)).toBe(true);
    }
  });

  it("removes ambient particles and screen flash in reduced mode", () => {
    expect(shouldRenderEffect("ambientParticle", true)).toBe(false);
    expect(shouldRenderEffect("screenFlash", true)).toBe(false);
  });
});

describe("createEffectSystem", () => {
  it("expires effects after their lifetime", () => {
    const fx = createEffectSystem();
    fx.spawn("hitSpark", 100, 100, 0);
    expect(fx.count()).toBe(1);
    fx.update(1000); // well past ttl
    expect(fx.count()).toBe(0);
  });

  it("clears all effects", () => {
    const fx = createEffectSystem();
    fx.spawn("slashArc", 0, 0, 0);
    fx.spawn("shockwave", 0, 0, 0);
    fx.clear();
    expect(fx.count()).toBe(0);
  });
});
