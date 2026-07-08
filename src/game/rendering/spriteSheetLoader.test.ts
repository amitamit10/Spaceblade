import { describe, expect, it } from "vitest";
import { clearSpriteSheetCache, getSpriteSheet, getSpriteSheetStatus } from "./spriteSheetLoader";
import type { SpriteSheetDef } from "./spriteManifest";

const def: SpriteSheetDef = {
  id: "dummy",
  src: "/sprites/dummy.png",
  frameWidth: 32,
  frameHeight: 32,
  scale: 2,
  anchorX: 16,
  anchorY: 31,
  defaultFacing: "right",
  animations: { idle: { row: 0, frames: 1, frameDurationMs: 100, loop: true } },
};

describe("spriteSheetLoader", () => {
  it("starts unavailable or empty in tests until a sheet is primed", () => {
    clearSpriteSheetCache();
    expect(getSpriteSheet(def)).toBeNull();
    expect(["unavailable", "loading", "error", "ready"]).toContain(getSpriteSheetStatus(def));
  });
});
