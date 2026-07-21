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
    expect(versionSpriteAsset("/assets/public/opengameart-space-soldier/idle-1.png")).toBe(
      `/assets/public/opengameart-space-soldier/idle-1.png?v=${SPRITE_ASSET_VERSION}`,
    );
  });

  it("maps cache-busted sprite URLs back to the public file path and filename", () => {
    const src = `/assets/public/opengameart-space-soldier/idle-1.png?v=${SPRITE_ASSET_VERSION}`;

    expect(spriteAssetPublicPath(src)).toBe("assets/public/opengameart-space-soldier/idle-1.png");
    expect(spriteAssetFilename(src)).toBe("idle-1.png");
  });

  it("creates deterministic standalone frame paths", () => {
    expect(spriteFrameSources("player", "charge", 3)).toEqual([
      "/assets/public/opengameart-space-soldier/attack-1.png?v=cc0-space-soldier-1",
      "/assets/public/opengameart-space-soldier/attack-2.png?v=cc0-space-soldier-1",
      "/assets/public/opengameart-space-soldier/attack-3.png?v=cc0-space-soldier-1",
    ]);
  });
});
