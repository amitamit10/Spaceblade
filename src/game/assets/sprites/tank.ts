import type { SpriteSheetDef } from "../../rendering/spriteManifest";
import { spriteFrameSources, versionSpriteAsset } from "./spriteAssetPath";

export const TANK_SHEET: SpriteSheetDef = {
  id: "tank",
  src: versionSpriteAsset("/sprites/tank.png"),
  frameWidth: 96,
  frameHeight: 96,
  scale: 3,
  anchorX: 48,
  anchorY: 95,
  defaultFacing: "right",
  animations: {
    walk: { row: 0, frames: 4, frameDurationMs: 120, loop: true, frameSources: spriteFrameSources("tank", "walk", 4) },
    windup: { row: 1, frames: 4, frameDurationMs: 100, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("tank", "windup", 4) },
    attack: { row: 2, frames: 4, frameDurationMs: 80, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("tank", "attack", 4) },
    recover: { row: 3, frames: 2, frameDurationMs: 120, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("tank", "recover", 2) },
    hurt: { row: 4, frames: 2, frameDurationMs: 130, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("tank", "hurt", 2) },
    dead: { row: 5, frames: 3, frameDurationMs: 170, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("tank", "dead", 3) },
  },
};
