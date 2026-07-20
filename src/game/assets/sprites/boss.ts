import type { SpriteSheetDef } from "../../rendering/spriteManifest";
import { spriteFrameSources, versionSpriteAsset } from "./spriteAssetPath";

export const BOSS_SHEET: SpriteSheetDef = {
  id: "boss",
  src: versionSpriteAsset("/sprites/boss.png"),
  frameWidth: 160,
  frameHeight: 160,
  scale: 3,
  anchorX: 80,
  anchorY: 159,
  defaultFacing: "right",
  animations: {
    walk: { row: 0, frames: 4, frameDurationMs: 130, loop: true, frameSources: spriteFrameSources("boss", "walk", 4) },
    windup: { row: 1, frames: 4, frameDurationMs: 100, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("boss", "windup", 4) },
    attack: { row: 2, frames: 4, frameDurationMs: 80, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("boss", "attack", 4) },
    recover: { row: 3, frames: 3, frameDurationMs: 120, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("boss", "recover", 3) },
    hurt: { row: 4, frames: 2, frameDurationMs: 140, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("boss", "hurt", 2) },
    dead: { row: 5, frames: 4, frameDurationMs: 220, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("boss", "dead", 4) },
    specialAttack: { row: 6, frames: 5, frameDurationMs: 110, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("boss", "specialAttack", 5) },
  },
};
