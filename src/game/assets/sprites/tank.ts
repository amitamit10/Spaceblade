import type { SpriteSheetDef } from "../../rendering/spriteManifest";

export const TANK_SHEET: SpriteSheetDef = {
  id: "tank",
  src: "/sprites/tank.png",
  frameWidth: 96,
  frameHeight: 96,
  scale: 3,
  anchorX: 48,
  anchorY: 95,
  defaultFacing: "right",
  animations: {
    walk: { row: 0, frames: 4, frameDurationMs: 120, loop: true },
    windup: { row: 1, frames: 4, frameDurationMs: 100, loop: false, holdLastFrame: true },
    attack: { row: 2, frames: 4, frameDurationMs: 80, loop: false, holdLastFrame: true },
    recover: { row: 3, frames: 2, frameDurationMs: 120, loop: false, holdLastFrame: true },
    hurt: { row: 4, frames: 2, frameDurationMs: 130, loop: false, holdLastFrame: true },
    dead: { row: 5, frames: 3, frameDurationMs: 170, loop: false, holdLastFrame: true },
  },
};
