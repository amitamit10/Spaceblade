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

  const clipTopPx = Math.max(0, Math.min(animation.clipTopPx ?? 0, def.frameHeight - 1));
  const frameSource = animation.frameSources?.[frameIndex];
  const standaloneFrame = frameSource ? sheet.frameImages?.get(frameSource) : undefined;
  const sx = frameIndex * def.frameWidth;
  const sy = animation.row * def.frameHeight + clipTopPx;
  const sourceHeight = def.frameHeight - clipTopPx;
  const dw = def.frameWidth * def.scale;
  const dh = sourceHeight * def.scale;
  const offset = def.hitboxVisualOffset ?? { x: 0, y: 0 };
  const dx = Math.round(cx - def.anchorX * def.scale + offset.x);
  const dy = Math.round(yBase - def.anchorY * def.scale + offset.y + clipTopPx * def.scale);
  const shouldFlip = facing !== def.defaultFacing;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (standaloneFrame) {
    const frameHeight = standaloneFrame.naturalHeight || standaloneFrame.height || sourceHeight;
    const frameWidth = standaloneFrame.naturalWidth || standaloneFrame.width || def.frameWidth;
    const standaloneDw = def.frameWidth * def.scale;
    const standaloneDh = frameHeight * def.scale;
    const standaloneDy = Math.round(yBase - def.anchorY * def.scale + offset.y + clipTopPx * def.scale);

    if (shouldFlip) {
      ctx.translate(dx + standaloneDw, standaloneDy);
      ctx.scale(-1, 1);
      ctx.drawImage(standaloneFrame, 0, 0, frameWidth, frameHeight, 0, 0, standaloneDw, standaloneDh);
    } else {
      ctx.drawImage(
        standaloneFrame,
        0,
        0,
        frameWidth,
        frameHeight,
        dx,
        standaloneDy,
        standaloneDw,
        standaloneDh,
      );
    }
    ctx.restore();
    return;
  }

  if (shouldFlip) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet.image, sx, sy, def.frameWidth, sourceHeight, 0, 0, dw, dh);
  } else {
    ctx.drawImage(sheet.image, sx, sy, def.frameWidth, sourceHeight, dx, dy, dw, dh);
  }

  ctx.restore();
}
