import type { SpriteSheetDef } from "../../rendering/spriteManifest";

export const RUNNER_SHEET: SpriteSheetDef = {
  id: "runner",
  src: "/sprites/runner.png",
  frameWidth: 64,
  frameHeight: 64,
  scale: 3,
  anchorX: 32,
  anchorY: 58,
  defaultFacing: "right",
  animations: {
    walk: { row: 0, frames: 6, frameDurationMs: 80, loop: true },
    windup: { row: 1, frames: 3, frameDurationMs: 70, loop: false, holdLastFrame: true },
    attack: { row: 2, frames: 4, frameDurationMs: 60, loop: false, holdLastFrame: true },
    recover: { row: 3, frames: 2, frameDurationMs: 90, loop: false, holdLastFrame: true },
    hurt: { row: 4, frames: 2, frameDurationMs: 120, loop: false, holdLastFrame: true },
    dead: { row: 5, frames: 3, frameDurationMs: 150, loop: false, holdLastFrame: true },
  },
};
