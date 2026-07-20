import { describe, expect, it } from "vitest";
import {
  SPRITE_ASSET_VERSION,
  spriteAssetFilename,
  spriteAssetPublicPath,
  spriteFrameSources,
  versionSpriteAsset,
} from "./spriteAssetPath";

describe("spriteAssetPath", () => {
  it("adds a stable version query to sprite URLs so browser caches refresh after art fixes", () => {
    expect(versionSpriteAsset("/sprites/player.png")).toBe(
      `/sprites/player.png?v=${SPRITE_ASSET_VERSION}`,
    );
  });

  it("maps cache-busted sprite URLs back to the public file path and filename", () => {
    const src = `/sprites/player.png?v=${SPRITE_ASSET_VERSION}`;

    expect(spriteAssetPublicPath(src)).toBe("sprites/player.png");
    expect(spriteAssetFilename(src)).toBe("player.png");
  });

  it("creates deterministic standalone frame paths", () => {
    expect(spriteFrameSources("player", "charge", 3)).toEqual([
      "/sprites/frames/player/charge-00.png?v=2026-07-19a",
      "/sprites/frames/player/charge-01.png?v=2026-07-19a",
      "/sprites/frames/player/charge-02.png?v=2026-07-19a",
    ]);
  });
});
