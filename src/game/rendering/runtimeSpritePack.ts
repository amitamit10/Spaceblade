import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";

export type PngMetadata = {
  width: number;
  height: number;
  hasAlpha: boolean;
  transparentCorners: boolean;
  hasOpaquePixels: boolean;
};

type RuntimeSpriteSheetLike = {
  src: string;
};

type AnimationWindow = {
  row: number;
  frames: number;
};

type DecodedPng = {
  width: number;
  height: number;
  colorType: number;
  bpp: number;
  pixels: Buffer;
};

function bytesPerPixel(colorType: number): number {
  switch (colorType) {
    case 0:
      return 1;
    case 2:
      return 3;
    case 4:
      return 2;
    case 6:
      return 4;
    default:
      throw new Error(`Unsupported PNG color type: ${colorType}`);
  }
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilterScanlines(data: Buffer, width: number, height: number, bpp: number): Buffer {
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let inOffset = 0;
  let outOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filter = data[inOffset];
    inOffset += 1;

    for (let i = 0; i < stride; i += 1) {
      const raw = data[inOffset + i];
      const left = i >= bpp ? out[outOffset + i - bpp] : 0;
      const up = row > 0 ? out[outOffset + i - stride] : 0;
      const upLeft = row > 0 && i >= bpp ? out[outOffset + i - stride - bpp] : 0;

      switch (filter) {
        case 0:
          out[outOffset + i] = raw;
          break;
        case 1:
          out[outOffset + i] = (raw + left) & 0xff;
          break;
        case 2:
          out[outOffset + i] = (raw + up) & 0xff;
          break;
        case 3:
          out[outOffset + i] = (raw + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          out[outOffset + i] = (raw + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG filter type: ${filter}`);
      }
    }

    inOffset += stride;
    outOffset += stride;
  }

  return out;
}

function alphaAt(pixels: Buffer, pixelIndex: number, colorType: number, bpp: number): number {
  const base = pixelIndex * bpp;
  switch (colorType) {
    case 0:
    case 2:
      return 255;
    case 4:
      return pixels[base + 1];
    case 6:
      return pixels[base + 3];
    default:
      throw new Error(`Unsupported PNG color type: ${colorType}`);
  }
}

export function readPngMetadata(absPath: string): PngMetadata {
  const { width, height, colorType, bpp, pixels } = decodePng(absPath);
  const hasAlpha = colorType === 4 || colorType === 6;

  const topLeft = alphaAt(pixels, 0, colorType, bpp);
  const topRight = alphaAt(pixels, width - 1, colorType, bpp);
  const bottomLeft = alphaAt(pixels, (height - 1) * width, colorType, bpp);
  const bottomRight = alphaAt(pixels, height * width - 1, colorType, bpp);
  const transparentCorners = topLeft === 0 && topRight === 0 && bottomLeft === 0 && bottomRight === 0;

  let hasOpaquePixels = false;
  for (let i = 0; i < width * height; i += 1) {
    if (alphaAt(pixels, i, colorType, bpp) === 255) {
      hasOpaquePixels = true;
      break;
    }
  }

  return { width, height, hasAlpha, transparentCorners, hasOpaquePixels };
}

function decodePng(absPath: string): DecodedPng {
  const png = readFileSync(absPath);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const bitDepth = png[24];
  const colorType = png[25];

  if (bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth: ${bitDepth}`);
  }

  const idat: Buffer[] = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (type === "IDAT") idat.push(png.subarray(dataStart, dataEnd));
    offset = dataEnd + 4;
    if (type === "IEND") break;
  }

  const inflated = inflateSync(Buffer.concat(idat));
  const bpp = bytesPerPixel(colorType);
  const pixels = unfilterScanlines(inflated, width, height, bpp);
  return { width, height, colorType, bpp, pixels };
}

export function findNonEmptyCells(
  absPath: string,
  frameWidth: number,
  frameHeight: number,
): Array<{ row: number; col: number }> {
  const { width, height, colorType, bpp, pixels } = decodePng(absPath);
  const cols = Math.floor(width / frameWidth);
  const rows = Math.floor(height / frameHeight);
  const nonEmptyCells: Array<{ row: number; col: number }> = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let occupied = false;
      const startY = row * frameHeight;
      const startX = col * frameWidth;

      for (let y = startY; y < startY + frameHeight && !occupied; y += 1) {
        for (let x = startX; x < startX + frameWidth; x += 1) {
          const pixelIndex = y * width + x;
          if (alphaAt(pixels, pixelIndex, colorType, bpp) > 0) {
            occupied = true;
            break;
          }
        }
      }

      if (occupied) nonEmptyCells.push({ row, col });
    }
  }

  return nonEmptyCells;
}

export function findEmptyUsedCells(
  absPath: string,
  frameWidth: number,
  frameHeight: number,
  animations: Record<string, AnimationWindow>,
): Array<{ row: number; col: number }> {
  const occupied = new Set(
    findNonEmptyCells(absPath, frameWidth, frameHeight).map(({ row, col }) => `${row}:${col}`),
  );
  const emptyUsedCells: Array<{ row: number; col: number }> = [];

  for (const anim of Object.values(animations)) {
    for (let col = 0; col < anim.frames; col += 1) {
      if (!occupied.has(`${anim.row}:${col}`)) {
        emptyUsedCells.push({ row: anim.row, col });
      }
    }
  }

  return emptyUsedCells;
}

export function findFrameOpaqueBounds(
  absPath: string,
  frameWidth: number,
  frameHeight: number,
  sheetRow: number,
  sheetCol: number,
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const { width, height, colorType, bpp, pixels } = decodePng(absPath);
  const startX = sheetCol * frameWidth;
  const startY = sheetRow * frameHeight;
  if (startX + frameWidth > width || startY + frameHeight > height) return null;

  let minX = frameWidth;
  let minY = frameHeight;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < frameHeight; y += 1) {
    for (let x = 0; x < frameWidth; x += 1) {
      const pixelIndex = (startY + y) * width + (startX + x);
      if (alphaAt(pixels, pixelIndex, colorType, bpp) > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  return { minX, maxX, minY, maxY };
}

/**
 * Bottom-most opaque pixel row (relative to the frame top) across every column
 * of a single sheet row. This is where the character's feet sit, which the
 * manifest `anchorY` must match so feet land on the ground line at render time.
 * Returns -1 if the row band is fully transparent.
 */
export function findFeetRow(
  absPath: string,
  frameWidth: number,
  frameHeight: number,
  sheetRow: number,
): number {
  const { width, height, colorType, bpp, pixels } = decodePng(absPath);
  const cols = Math.floor(width / frameWidth);
  const startY = sheetRow * frameHeight;
  if (startY + frameHeight > height) return -1;

  let feet = -1;
  for (let y = 0; y < frameHeight; y += 1) {
    for (let col = 0; col < cols; col += 1) {
      const startX = col * frameWidth;
      for (let x = startX; x < startX + frameWidth; x += 1) {
        const pixelIndex = (startY + y) * width + x;
        if (alphaAt(pixels, pixelIndex, colorType, bpp) > 16) {
          if (y > feet) feet = y;
          break;
        }
      }
    }
  }

  return feet;
}

export function getRuntimeSpritePackPaths(
  sheets: RuntimeSpriteSheetLike[],
): string[] {
  return sheets.map((sheet) => sheet.src);
}
