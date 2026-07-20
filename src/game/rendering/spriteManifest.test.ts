import { describe, expect, it } from "vitest";
import { validateSpriteSheetDef, validateSheetGeometry } from "./spriteManifest";
import type { SpriteSheetDef } from "./spriteManifest";

const good: SpriteSheetDef = {
  id: "player",
  src: "/sprites/player.png",
  frameWidth: 64,
  frameHeight: 64,
  scale: 3,
  anchorX: 32,
  anchorY: 60,
  defaultFacing: "right",
  animations: {
    idle: { row: 0, frames: 4, frameDurationMs: 120, loop: true },
    slash: { row: 1, frames: 5, frameDurationMs: 70, loop: false, holdLastFrame: true },
  },
};

describe("validateSpriteSheetDef", () => {
  it("accepts a well-formed manifest", () => {
    expect(validateSpriteSheetDef(good)).toEqual([]);
  });

  it("rejects zero-sized frames and scales", () => {
    expect(validateSpriteSheetDef({ ...good, frameWidth: 0, scale: 0 }).length).toBeGreaterThan(0);
  });

  it("rejects anchors outside the frame", () => {
    expect(validateSpriteSheetDef({ ...good, anchorX: 80, anchorY: 90 }).length).toBeGreaterThan(0);
  });

  it("rejects animations with invalid row, frames, or duration", () => {
    expect(
      validateSpriteSheetDef({
        ...good,
        animations: { bad: { row: -1, frames: 0, frameDurationMs: 0, loop: true } },
      }).length,
    ).toBeGreaterThan(0);
  });

  it("rejects standalone frame lists with the wrong length", () => {
    expect(
      validateSpriteSheetDef({
        ...good,
        animations: {
          idle: {
            row: 0,
            frames: 2,
            frameDurationMs: 120,
            loop: true,
            frameSources: ["/sprites/frames/player/walk-00.png"],
          },
        },
      }),
    ).toContain("idle: frameSources must match frames");
  });
});

describe("validateSheetGeometry", () => {
  it("accepts animations that fit inside the sheet image", () => {
    expect(validateSheetGeometry(good, 320, 128)).toEqual([]);
  });

  it("rejects animations that overflow the image bounds", () => {
    expect(validateSheetGeometry(good, 128, 64).length).toBeGreaterThan(0);
  });
});
