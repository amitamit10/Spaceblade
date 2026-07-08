import type { SpriteSheetDef } from "../../rendering/spriteManifest";

export const GLITCH_SHEET: SpriteSheetDef = {
  id: "glitch",
  src: "/sprites/glitch.png",
  frameWidth: 80,
  frameHeight: 80,
  scale: 3,
  anchorX: 40,
  anchorY: 79,
  defaultFacing: "right",
  animations: {
    walk: { row: 0, frames: 6, frameDurationMs: 75, loop: true },
    windup: { row: 1, frames: 3, frameDurationMs: 80, loop: false, holdLastFrame: true },
    attack: { row: 2, frames: 4, frameDurationMs: 75, loop: false, holdLastFrame: true },
    recover: { row: 3, frames: 2, frameDurationMs: 95, loop: false, holdLastFrame: true },
    hurt: { row: 4, frames: 2, frameDurationMs: 110, loop: false, holdLastFrame: true },
    dead: { row: 5, frames: 3, frameDurationMs: 180, loop: false, holdLastFrame: true },
  },
};
