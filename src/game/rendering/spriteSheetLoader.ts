import type { SpriteSheetDef, SpriteSheetLoadStatus } from "./spriteManifest";

export type LoadedSpriteSheet = {
  image: HTMLImageElement;
  width: number;
  height: number;
  frameImages?: ReadonlyMap<string, HTMLImageElement>;
};

type CacheEntry = {
  status: SpriteSheetLoadStatus;
  sheet: LoadedSpriteSheet | null;
};

const cache = new Map<string, CacheEntry>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load sprite frame: ${src}`));
    image.src = src;
  });
}

export function primeSpriteSheet(def: SpriteSheetDef): void {
  if (cache.has(def.id)) return;

  if (typeof Image === "undefined") {
    cache.set(def.id, { status: "unavailable", sheet: null });
    return;
  }

  cache.set(def.id, { status: "loading", sheet: null });

  const frameSources = Array.from(
    new Set(
      Object.values(def.animations).flatMap((animation) => animation.frameSources ?? []),
    ),
  );

  if (frameSources.length > 0) {
    void Promise.all(frameSources.map((src) => loadImage(src)))
      .then((images) => {
        const frameImages = new Map(frameSources.map((src, index) => [src, images[index]]));
        const first = images[0];
        cache.set(def.id, {
          status: "ready",
          sheet: {
            image: first,
            width: first.naturalWidth || first.width,
            height: first.naturalHeight || first.height,
            frameImages,
          },
        });
      })
      .catch(() => {
        cache.set(def.id, { status: "error", sheet: null });
      });
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
