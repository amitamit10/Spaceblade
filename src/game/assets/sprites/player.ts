import type { SpriteSheetDef } from "../../rendering/spriteManifest";
import { spriteFrameSources, versionSpriteAsset } from "./spriteAssetPath";

export const PLAYER_SHEET: SpriteSheetDef = {
  id: "player",
  src: versionSpriteAsset("/sprites/player.png"),
  frameWidth: 96,
  frameHeight: 96,
  scale: 3,
  anchorX: 48,
  anchorY: 95,
  defaultFacing: "right",
  animations: {
    idle: { row: 0, frames: 4, frameDurationMs: 130, loop: true, frameSources: spriteFrameSources("player", "walk", 4) },
    walk: { row: 1, frames: 6, frameDurationMs: 90, loop: true, frameSources: spriteFrameSources("player", "walk", 6) },
    slash: {
      row: 2,
      frames: 4,
      frameDurationMs: 70,
      loop: false,
      holdLastFrame: true,
      clipTopPx: 24,
      frameSources: spriteFrameSources("player", "slash", 4),
    },
    charge: { row: 3, frames: 3, frameDurationMs: 100, loop: true, clipTopPx: 24, frameSources: spriteFrameSources("player", "charge", 3) },
    heavy: {
      row: 4,
      frames: 6,
      frameDurationMs: 75,
      loop: false,
      holdLastFrame: true,
      clipTopPx: 24,
      frameSources: spriteFrameSources("player", "heavy", 6),
    },
    dodge: { row: 5, frames: 3, frameDurationMs: 65, loop: false, holdLastFrame: true, clipTopPx: 24, frameSources: spriteFrameSources("player", "dodge", 3) },
    parry: { row: 6, frames: 2, frameDurationMs: 70, loop: false, holdLastFrame: true, clipTopPx: 24, frameSources: spriteFrameSources("player", "parry", 2) },
    hurt: { row: 7, frames: 2, frameDurationMs: 120, loop: false, holdLastFrame: true, clipTopPx: 24, frameSources: spriteFrameSources("player", "hurt", 2) },
    dead: { row: 8, frames: 2, frameDurationMs: 180, loop: false, holdLastFrame: true, clipTopPx: 24, frameSources: spriteFrameSources("player", "dead", 2) },
  },
};
