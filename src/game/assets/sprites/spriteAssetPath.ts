export const SPRITE_ASSET_VERSION = "2026-07-19a";

function stripQueryAndHash(src: string): string {
  return src.replace(/[?#].*$/, "");
}

export function versionSpriteAsset(src: string): string {
  return `${stripQueryAndHash(src)}?v=${SPRITE_ASSET_VERSION}`;
}

export function spriteAssetPublicPath(src: string): string {
  return stripQueryAndHash(src).replace(/^\/+/, "");
}

export function spriteAssetFilename(src: string): string {
  return spriteAssetPublicPath(src).split("/").at(-1) ?? "";
}

export function spriteFrameSources(
  sheetId: string,
  animation: string,
  frames: number,
): string[] {
  return Array.from({ length: frames }, (_, index) =>
    versionSpriteAsset(
      `/sprites/frames/${sheetId}/${animation}-${String(index).padStart(2, "0")}.png`,
    ),
  );
}
