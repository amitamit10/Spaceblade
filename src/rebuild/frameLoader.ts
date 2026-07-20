import type { RebuildSprite } from "./assets/frameManifest";

export type LoadedFrames = ReadonlyMap<string, HTMLImageElement>;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load rebuild frame: ${src}`));
    image.src = src;
  });
}

export async function loadRebuildFrames(sprites: readonly RebuildSprite[]): Promise<LoadedFrames> {
  const sources = Array.from(
    new Set(
      sprites.flatMap((sprite) =>
        Object.values(sprite.animations).flatMap((animation) => animation.frames),
      ),
    ),
  );
  const images = await Promise.all(sources.map((source) => loadImage(source)));
  return new Map(sources.map((source, index) => [source, images[index]]));
}
