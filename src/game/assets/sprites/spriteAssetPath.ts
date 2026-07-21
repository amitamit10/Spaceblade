export const SPRITE_ASSET_VERSION = "2026-07-19a";
const PUBLIC_PLAYER_VERSION = "cc0-space-soldier-1";

const playerAnimationName: Record<string, string> = {
  idle: "idle",
  walk: "walk",
  slash: "attack",
  charge: "attack",
  heavy: "attack",
  dodge: "crouch",
  parry: "attack",
  hurt: "killed",
  dead: "killed",
};

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
  if (sheetId === "player") {
    const sourceAnimation = playerAnimationName[animation] ?? "idle";
    const availableFrames = sourceAnimation === "idle" ? 4 : sourceAnimation === "walk" ? 8 : sourceAnimation === "run" ? 12 : 8;
    return Array.from({ length: frames }, (_, index) =>
      `/assets/public/opengameart-space-soldier/${sourceAnimation}-${(index % availableFrames) + 1}.png?v=${PUBLIC_PLAYER_VERSION}`,
    );
  }

  return Array.from({ length: frames }, (_, index) =>
    versionSpriteAsset(
      `/sprites/frames/${sheetId}/${animation}-${String(index).padStart(2, "0")}.png`,
    ),
  );
}
