import { describe, expect, it, vi } from "vitest";
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

  it("clips a declared top artifact while keeping the sprite grounded", () => {
    const drawImage = vi.fn();
    const ctx = {
      imageSmoothingEnabled: true,
      save: vi.fn(),
      restore: vi.fn(),
      drawImage,
    } as unknown as CanvasRenderingContext2D;
    const sheet = { image: {} as HTMLImageElement, width: 32, height: 32 };
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
    const anim: SpriteAnimationDef = {
      row: 1,
      frames: 1,
      frameDurationMs: 100,
      loop: false,
      clipTopPx: 8,
    };

    drawSheetFrame(ctx, sheet, def, anim, 0, 100, 200, "right");

    expect(drawImage).toHaveBeenCalledWith(sheet.image, 0, 40, 32, 24, 68, 154, 64, 48);
  });

  it("draws the requested standalone frame instead of sampling the sheet", () => {
    const drawImage = vi.fn();
    const ctx = {
      imageSmoothingEnabled: true,
      save: vi.fn(),
      restore: vi.fn(),
      drawImage,
    } as unknown as CanvasRenderingContext2D;
    const standaloneFrame = { naturalWidth: 32, naturalHeight: 24 } as HTMLImageElement;
    const source = "/sprites/frames/player/charge-00.png?v=test";
    const sheet = {
      image: { id: "sheet" } as unknown as HTMLImageElement,
      width: 32,
      height: 32,
      frameImages: new Map([[source, standaloneFrame]]),
    };
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
    const anim: SpriteAnimationDef = {
      row: 0,
      frames: 1,
      frameDurationMs: 100,
      loop: false,
      clipTopPx: 8,
      frameSources: [source],
    };

    drawSheetFrame(ctx, sheet, def, anim, 0, 100, 200, "right");

    expect(drawImage).toHaveBeenCalledWith(standaloneFrame, 0, 0, 32, 24, 68, 154, 64, 48);
    expect(drawImage).not.toHaveBeenCalledWith(
      sheet.image,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
