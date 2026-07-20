import type { SpriteSheetDef } from "../../rendering/spriteManifest";
import { spriteFrameSources, versionSpriteAsset } from "./spriteAssetPath";

export const GRUNT_SHEET: SpriteSheetDef = {
  id: "grunt",
  src: versionSpriteAsset("/sprites/grunt.png"),
  frameWidth: 64,
  frameHeight: 64,
  scale: 3,
  anchorX: 32,
  anchorY: 63,
  defaultFacing: "right",
  animations: {
    walk: { row: 0, frames: 4, frameDurationMs: 110, loop: true, frameSources: spriteFrameSources("grunt", "walk", 4) },
    windup: { row: 1, frames: 3, frameDurationMs: 90, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("grunt", "windup", 3) },
    attack: { row: 2, frames: 3, frameDurationMs: 70, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("grunt", "attack", 3) },
    recover: { row: 3, frames: 2, frameDurationMs: 90, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("grunt", "recover", 2) },
    hurt: { row: 4, frames: 2, frameDurationMs: 120, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("grunt", "hurt", 2) },
    dead: { row: 5, frames: 3, frameDurationMs: 150, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("grunt", "dead", 3) },
  },
};
