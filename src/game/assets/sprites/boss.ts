import type { SpriteSheetDef } from "../../rendering/spriteManifest";

export const BOSS_SHEET: SpriteSheetDef = {
  id: "boss",
  src: "/sprites/boss.png",
  frameWidth: 160,
  frameHeight: 160,
  scale: 3,
  anchorX: 80,
  anchorY: 146,
  defaultFacing: "right",
  animations: {
    walk: { row: 0, frames: 4, frameDurationMs: 130, loop: true },
    windup: { row: 1, frames: 4, frameDurationMs: 100, loop: false, holdLastFrame: true },
    attack: { row: 2, frames: 4, frameDurationMs: 80, loop: false, holdLastFrame: true },
    recover: { row: 3, frames: 3, frameDurationMs: 120, loop: false, holdLastFrame: true },
    hurt: { row: 4, frames: 2, frameDurationMs: 140, loop: false, holdLastFrame: true },
    dead: { row: 5, frames: 4, frameDurationMs: 220, loop: false, holdLastFrame: true },
    specialAttack: { row: 6, frames: 5, frameDurationMs: 110, loop: false, holdLastFrame: true },
  },
};
