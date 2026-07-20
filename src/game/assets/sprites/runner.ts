import type { SpriteSheetDef } from "../../rendering/spriteManifest";
import { spriteFrameSources, versionSpriteAsset } from "./spriteAssetPath";

export const RUNNER_SHEET: SpriteSheetDef = {
  id: "runner",
  src: versionSpriteAsset("/sprites/runner.png"),
  frameWidth: 64,
  frameHeight: 64,
  scale: 3,
  anchorX: 32,
  anchorY: 63,
  defaultFacing: "right",
  animations: {
    walk: { row: 0, frames: 6, frameDurationMs: 80, loop: true, frameSources: spriteFrameSources("runner", "walk", 6) },
    windup: { row: 1, frames: 3, frameDurationMs: 70, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("runner", "windup", 3) },
    attack: { row: 2, frames: 4, frameDurationMs: 60, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("runner", "attack", 4) },
    recover: { row: 3, frames: 2, frameDurationMs: 90, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("runner", "recover", 2) },
    hurt: { row: 4, frames: 2, frameDurationMs: 120, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("runner", "hurt", 2) },
    dead: { row: 5, frames: 3, frameDurationMs: 150, loop: false, holdLastFrame: true, frameSources: spriteFrameSources("runner", "dead", 3) },
  },
};
