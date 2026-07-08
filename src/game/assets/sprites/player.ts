import type { SpriteSheetDef } from "../../rendering/spriteManifest";

export const PLAYER_SHEET: SpriteSheetDef = {
  id: "player",
  src: "/sprites/player.png",
  frameWidth: 96,
  frameHeight: 96,
  scale: 3,
  anchorX: 48,
  anchorY: 86,
  defaultFacing: "right",
  animations: {
    idle: { row: 0, frames: 4, frameDurationMs: 130, loop: true },
    walk: { row: 1, frames: 6, frameDurationMs: 90, loop: true },
    slash: { row: 2, frames: 5, frameDurationMs: 70, loop: false, holdLastFrame: true },
    charge: { row: 3, frames: 4, frameDurationMs: 100, loop: true },
    heavy: { row: 4, frames: 6, frameDurationMs: 75, loop: false, holdLastFrame: true },
    dodge: { row: 5, frames: 4, frameDurationMs: 65, loop: false, holdLastFrame: true },
    parry: { row: 6, frames: 4, frameDurationMs: 70, loop: false, holdLastFrame: true },
    hurt: { row: 7, frames: 2, frameDurationMs: 120, loop: false, holdLastFrame: true },
    dead: { row: 8, frames: 3, frameDurationMs: 180, loop: false, holdLastFrame: true },
  },
};
