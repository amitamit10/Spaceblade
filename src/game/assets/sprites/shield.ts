import type { SpriteSheetDef } from "../../rendering/spriteManifest";
import { spriteFrameSources, versionSpriteAsset } from "./spriteAssetPath";

export const SHIELD_SHEET: SpriteSheetDef = {
  id: "shield",
  src: versionSpriteAsset("/sprites/shield.png"),
  frameWidth: 80,
  frameHeight: 80,
  scale: 3,
  anchorX: 40,
  anchorY: 79,
  defaultFacing: "right",
  animations: {
    walk: { row: 0, frames: 4, frameDurationMs: 110, loop: true, frameSources: spriteFrameSources("shield", "walk", 4) },
    windup: { row: 1, frames: 3, frameDurationMs: 90, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("shield", "windup", 3) },
    attack: { row: 2, frames: 3, frameDurationMs: 70, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("shield", "attack", 3) },
    recover: { row: 3, frames: 2, frameDurationMs: 110, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("shield", "recover", 2) },
    hurt: { row: 4, frames: 2, frameDurationMs: 120, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("shield", "hurt", 2) },
    dead: { row: 5, frames: 3, frameDurationMs: 160, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("shield", "dead", 3) },
  },
};
