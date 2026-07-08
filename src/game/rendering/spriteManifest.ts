export type SpriteAnimationDef = {
  row: number;
  frames: number;
  frameDurationMs: number;
  loop: boolean;
  holdLastFrame?: boolean;
};

export type SpriteSheetDef = {
  id: string;
  src: string;
  frameWidth: number;
  frameHeight: number;
  scale: number;
  anchorX: number;
  anchorY: number;
  defaultFacing: "left" | "right";
  hitboxVisualOffset?: { x: number; y: number };
  animations: Record<string, SpriteAnimationDef>;
};

export type SpriteSheetLoadStatus = "ready" | "loading" | "error" | "unavailable";

export function validateSpriteSheetDef(def: SpriteSheetDef): string[] {
  const problems: string[] = [];
  if (!def.id) problems.push("id is required");
  if (!def.src) problems.push("src is required");
  if (def.frameWidth <= 0) problems.push("frameWidth must be > 0");
  if (def.frameHeight <= 0) problems.push("frameHeight must be > 0");
  if (def.scale <= 0 || !Number.isInteger(def.scale)) {
    problems.push("scale must be a positive integer");
  }
  if (def.anchorX < 0 || def.anchorX >= def.frameWidth) {
    problems.push("anchorX must be within the frame");
  }
  if (def.anchorY < 0 || def.anchorY >= def.frameHeight) {
    problems.push("anchorY must be within the frame");
  }
  if (Object.keys(def.animations).length === 0) {
    problems.push("at least one animation is required");
  }

  for (const [name, anim] of Object.entries(def.animations)) {
    if (anim.row < 0 || !Number.isInteger(anim.row)) {
      problems.push(`${name}: row must be a non-negative integer`);
    }
    if (anim.frames <= 0 || !Number.isInteger(anim.frames)) {
      problems.push(`${name}: frames must be a positive integer`);
    }
    if (anim.frameDurationMs <= 0) {
      problems.push(`${name}: frameDurationMs must be > 0`);
    }
  }

  return problems;
}

export function validateSheetGeometry(
  def: SpriteSheetDef,
  imageWidth: number,
  imageHeight: number,
): string[] {
  const problems = validateSpriteSheetDef(def);
  const cols = Math.floor(imageWidth / def.frameWidth);
  const rows = Math.floor(imageHeight / def.frameHeight);

  for (const [name, anim] of Object.entries(def.animations)) {
    if (anim.row >= rows) {
      problems.push(`${name}: row ${anim.row} exceeds image row count ${rows}`);
    }
    if (anim.frames > cols) {
      problems.push(`${name}: frames ${anim.frames} exceed image col count ${cols}`);
    }
  }

  return problems;
}
