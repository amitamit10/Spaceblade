import type { SpriteSheetDef, SpriteSheetLoadStatus } from "./spriteManifest";

export type LoadedSpriteSheet = {
  image: HTMLImageElement;
  width: number;
  height: number;
};

type CacheEntry = {
  status: SpriteSheetLoadStatus;
  sheet: LoadedSpriteSheet | null;
};

const cache = new Map<string, CacheEntry>();

export function primeSpriteSheet(def: SpriteSheetDef): void {
  if (cache.has(def.id)) return;

  if (typeof Image === "undefined") {
    cache.set(def.id, { status: "unavailable", sheet: null });
    return;
  }

  const image = new Image();
  cache.set(def.id, { status: "loading", sheet: null });

  image.onload = () => {
    cache.set(def.id, {
      status: "ready",
      sheet: {
        image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      },
    });
  };

  image.onerror = () => {
    cache.set(def.id, { status: "error", sheet: null });
  };

  image.src = def.src;
}

export function getSpriteSheet(def: SpriteSheetDef): LoadedSpriteSheet | null {
  return cache.get(def.id)?.sheet ?? null;
}

export function getSpriteSheetStatus(def: SpriteSheetDef): SpriteSheetLoadStatus {
  return cache.get(def.id)?.status ?? "unavailable";
}

export function clearSpriteSheetCache(): void {
  cache.clear();
}
