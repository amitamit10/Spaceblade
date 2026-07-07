export type PixelSprite = {
  id: string;
  w: number;
  h: number;
  palette: Record<string, string>;
  rows: string[];
};

const TRANSPARENT = ".";

/** Returns a list of structural problems with a sprite; empty means valid. */
export function validateSprite(sprite: PixelSprite): string[] {
  const problems: string[] = [];
  if (sprite.rows.length !== sprite.h) {
    problems.push(`${sprite.id}: expected ${sprite.h} rows, got ${sprite.rows.length}`);
  }
  sprite.rows.forEach((row, y) => {
    if (row.length !== sprite.w) {
      problems.push(`${sprite.id}: row ${y} width ${row.length} != ${sprite.w}`);
    }
    for (const ch of row) {
      if (ch !== TRANSPARENT && !(ch in sprite.palette)) {
        problems.push(`${sprite.id}: row ${y} uses unknown char '${ch}'`);
      }
    }
  });
  return problems;
}

const cache = new Map<string, HTMLCanvasElement>();

/** Bakes a sprite to an offscreen canvas at the given integer scale (cached). */
export function bakeSprite(sprite: PixelSprite, scale: number): HTMLCanvasElement | null {
  const key = `${sprite.id}@${scale}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  try {
    canvas = document.createElement("canvas");
    canvas.width = sprite.w * scale;
    canvas.height = sprite.h * scale;
    ctx = canvas.getContext("2d");
  } catch {
    return null;
  }
  if (!ctx) return null;

  for (let y = 0; y < sprite.rows.length; y += 1) {
    const row = sprite.rows[y];
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      if (ch === TRANSPARENT) continue;
      const color = sprite.palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  cache.set(key, canvas);
  return canvas;
}

/**
 * Blits a sprite centered horizontally at `cx` with its bottom edge at `yBase`.
 * `flipX` mirrors horizontally (still nearest-neighbor). No-op when headless.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: PixelSprite,
  scale: number,
  cx: number,
  yBase: number,
  flipX: boolean,
): void {
  const baked = bakeSprite(sprite, scale);
  if (!baked) return;
  const w = sprite.w * scale;
  const h = sprite.h * scale;
  const x = Math.round(cx - w / 2);
  const y = Math.round(yBase - h);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flipX) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(baked, 0, 0);
  } else {
    ctx.drawImage(baked, x, y);
  }
  ctx.restore();
}

/** Clears the bake cache (tests / theme swaps). */
export function clearSpriteCache(): void {
  cache.clear();
}
