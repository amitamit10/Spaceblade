import { describe, expect, it } from "vitest";
import { drawSheetFrame } from "./spriteSheetRenderer";
import type { SpriteAnimationDef, SpriteSheetDef } from "./spriteManifest";

describe("drawSheetFrame", () => {
  it("returns safely when the canvas context is unavailable", () => {
    const ctx = null as unknown as CanvasRenderingContext2D;
    const sheet = { image: {} as HTMLImageElement, width: 64, height: 64 };
    const def: SpriteSheetDef = {
      id: "dummy",
      src: "/sprites/dummy.png",
      frameWidth: 32,
      frameHeight: 32,
      scale: 2,
      anchorX: 16,
      anchorY: 31,
      defaultFacing: "right",
      animations: {},
    };
    const anim: SpriteAnimationDef = { row: 0, frames: 1, frameDurationMs: 100, loop: true };
    expect(() => drawSheetFrame(ctx, sheet, def, anim, 0, 100, 200, "right")).not.toThrow();
  });
});
