import type { LoadedSpriteSheet } from "./spriteSheetLoader";
import type { SpriteAnimationDef, SpriteSheetDef } from "./spriteManifest";

export function drawSheetFrame(
  ctx: CanvasRenderingContext2D | null,
  sheet: LoadedSpriteSheet,
  def: SpriteSheetDef,
  animation: SpriteAnimationDef,
  frameIndex: number,
  cx: number,
  yBase: number,
  facing: "left" | "right",
): void {
  if (!ctx) return;

  const sx = frameIndex * def.frameWidth;
  const sy = animation.row * def.frameHeight;
  const dw = def.frameWidth * def.scale;
  const dh = def.frameHeight * def.scale;
  const offset = def.hitboxVisualOffset ?? { x: 0, y: 0 };
  const dx = Math.round(cx - def.anchorX * def.scale + offset.x);
  const dy = Math.round(yBase - def.anchorY * def.scale + offset.y);
  const shouldFlip = facing !== def.defaultFacing;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (shouldFlip) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet.image, sx, sy, def.frameWidth, def.frameHeight, 0, 0, dw, dh);
  } else {
    ctx.drawImage(sheet.image, sx, sy, def.frameWidth, def.frameHeight, dx, dy, dw, dh);
  }

  ctx.restore();
}
