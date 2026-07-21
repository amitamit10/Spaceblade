import { frameIndexAt } from "./animation";
import type { RebuildSprite } from "./assets/frameManifest";
import type { LoadedFrames } from "./frameLoader";
import type { RebuildEnemyType, RebuildPlayerAnimation } from "./rebuildGame";

export const REBUILD_WIDTH = 1280;
export const REBUILD_HEIGHT = 720;
export const REBUILD_GROUND_Y = 552;

const AUTO_PARKOUR_CYCLE_MS = 3200;
const AUTO_PARKOUR_JUMP_MS = 760;
const FLOOR_CLIMB_DURATION_MS = 1500;
export const REBUILD_OBSTACLE_SCROLL_SPEED = 0.22;
export const REBUILD_OBSTACLE_SLOT_WIDTH = 500;

export type RebuildFloorTraversalPhase = "vault" | "pause" | "wall-climb" | "landing" | "complete";
export type RebuildObstacleKind = "barrier" | "wall" | "platform";

export function rebuildObstacleScrollSpeed(floor: number): number {
  return REBUILD_OBSTACLE_SCROLL_SPEED + Math.min(0.10, Math.max(0, floor - 1) * 0.008);
}

export function rebuildObstacleKind(floor: number, slot: number): RebuildObstacleKind {
  const value = Math.abs((floor * 17 + slot * 31 + floor * slot * 7) % 9);
  if (value <= 3) return "barrier";
  if (value <= 6) return "platform";
  return "wall";
}

export function rebuildObstacleCourse(now: number, floor: number): readonly { readonly x: number; readonly kind: RebuildObstacleKind }[] {
  const distance = Math.max(0, now) * rebuildObstacleScrollSpeed(floor) + floor * 240;
  const firstSlot = Math.floor(distance / REBUILD_OBSTACLE_SLOT_WIDTH) - 1;
  return Array.from({ length: 6 }, (_, index) => {
    const slot = firstSlot + index;
    return {
      x: 1100 + slot * REBUILD_OBSTACLE_SLOT_WIDTH - distance,
      kind: rebuildObstacleKind(floor, slot),
    };
  });
}

type Actor = {
  readonly sprite: RebuildSprite;
  animation: string;
  readonly x: number;
  readonly facing: "left" | "right";
  startedAt: number;
  readonly kind?: "player" | "enemy";
  readonly enemyType?: RebuildEnemyType;
  readonly enemyState?: "approaching" | "attacking" | "stunned" | "dead";
  readonly hp?: number;
  readonly maxHp?: number;
  readonly shielded?: boolean;
  readonly nextAttackAt?: number;
  readonly playerAction?: RebuildPlayerAnimation;
};

export function rebuildShakeOffset(action: RebuildPlayerAnimation | undefined, elapsed: number): { readonly x: number; readonly y: number } {
  if (!action || action === "idle") return { x: 0, y: 0 };
  const intensity = action === "heavy" ? 6 : action === "parry" ? 4 : 2;
  return {
    x: Math.sin(elapsed / 24) * intensity,
    y: Math.cos(elapsed / 31) * intensity * 0.55,
  };
}

export function rebuildPlayerVisualOffset(
  action: RebuildPlayerAnimation | undefined,
  elapsed: number,
  facing: "left" | "right",
): { readonly x: number; readonly y: number } {
  const direction = facing === "left" ? -1 : 1;
  const progress = Math.max(0, Math.min(1, elapsed / 460));
  if (!action || action === "idle") return { x: 0, y: Math.round(Math.sin(elapsed / 130) * 2) };
  if (action === "dodge") return { x: -direction * Math.round(Math.sin(progress * Math.PI) * 72), y: -8 };
  if (action === "heavy") return { x: direction * Math.round(Math.sin(progress * Math.PI) * 16), y: -2 };
  if (action === "slash") return { x: direction * Math.round(Math.sin(progress * Math.PI) * 9), y: -1 };
  if (action === "charging") return { x: 0, y: Math.round(Math.sin(elapsed / 70) * 4) };
  return { x: Math.round(Math.sin(elapsed / 38) * 3), y: -2 };
}

/** Presentation-only auto-vaulting keeps movement automatic while Space stays combat-only. */
export function rebuildAutoParkourOffset(
  now: number,
  facing: "left" | "right",
): { readonly x: number; readonly y: number; readonly angle: number } {
  const phase = ((now % AUTO_PARKOUR_CYCLE_MS) + AUTO_PARKOUR_CYCLE_MS) % AUTO_PARKOUR_CYCLE_MS;
  if (phase >= AUTO_PARKOUR_JUMP_MS) return { x: 0, y: 0, angle: 0 };

  const progress = phase / AUTO_PARKOUR_JUMP_MS;
  const arc = Math.sin(progress * Math.PI);
  const direction = facing === "left" ? -1 : 1;
  const angle = progress < 0.5 ? -7 : 5;
  return {
    x: Math.round(direction * arc * 26),
    y: -Math.round(arc * 82),
    angle,
  };
}

/**
 * Runs the automatic obstacle route: vault the low barrier, climb the wall,
 * then land on the raised floor. Space remains reserved for combat.
 */
export function rebuildObstacleParkourOffset(
  now: number,
  facing: "left" | "right",
  floor = 1,
): { readonly offset: { readonly x: number; readonly y: number; readonly angle: number }; readonly phase: RebuildFloorTraversalPhase } {
  const obstacle = rebuildObstacleCourse(now, floor).find(({ x }) => x >= 540 && x <= 720);
  if (!obstacle) return { offset: { x: 0, y: 0, angle: 0 }, phase: "complete" };
  const obstacleX = obstacle.x;
  const kind = obstacle.kind;
  const direction = facing === "left" ? -1 : 1;
  const triggerStart = 560;
  const triggerEnd = 720;
  if (obstacleX < triggerStart || obstacleX > triggerEnd) {
    return { offset: { x: 0, y: 0, angle: 0 }, phase: "complete" };
  }

  const progress = (triggerEnd - obstacleX) / (triggerEnd - triggerStart);
  if (kind === "wall") {
    // Let the runner visibly brake at the wall, hold at the top, then drop
    // back to the floor instead of sliding through one continuous arc.
    if (progress < 0.16) {
      return {
        offset: { x: direction * Math.round(progress * 16 / 0.16), y: 0, angle: direction * -2 },
        phase: "pause",
      };
    }
    if (progress >= 0.68 && progress < 0.8) {
      return {
        offset: { x: direction * 16, y: -112, angle: direction * -5 },
        phase: "pause",
      };
    }
    const climbProgress = Math.min(1, (progress - 0.16) / 0.52);
    const eased = climbProgress * climbProgress * (3 - 2 * climbProgress);
    if (progress < 0.68) {
      return {
        offset: { x: direction * 16, y: -Math.round(eased * 112), angle: direction * -5 },
        phase: "wall-climb",
      };
    }
    const landing = Math.min(1, (progress - 0.8) / 0.2);
    const landingEased = 1 - landing * landing * (3 - 2 * landing);
    return {
      offset: { x: Math.round(direction * (16 - landing * 16)), y: -Math.round(landingEased * 112), angle: direction * Math.round(5 - landing * 5) },
      phase: "landing",
    };
  }

  if (kind === "platform") {
    const arc = Math.sin(progress * Math.PI);
    return {
      offset: { x: Math.round(direction * arc * 48), y: -Math.round(arc * 88), angle: progress < 0.5 ? -5 : 4 },
      phase: "vault",
    };
  }
  const arc = Math.sin(progress * Math.PI);
  return {
    offset: { x: Math.round(direction * arc * 42), y: -Math.round(arc * 72), angle: progress < 0.5 ? -5 : 4 },
    phase: "vault",
  };
}

/** Automatic vertical traversal between building floors after a wave clears. */
export function rebuildFloorTransitionOffset(
  elapsed: number,
  facing: "left" | "right",
): { readonly x: number; readonly y: number; readonly angle: number } | null {
  if (elapsed < 0 || elapsed >= FLOOR_CLIMB_DURATION_MS) return null;
  const direction = facing === "left" ? -1 : 1;
  if (elapsed < 380) {
    const progress = elapsed / 380;
    const arc = Math.sin(progress * Math.PI / 2);
    return { x: Math.round(direction * arc * 30), y: -Math.round(arc * 44), angle: direction * -12 };
  }
  if (elapsed < 1080) {
    const progress = (elapsed - 380) / 700;
    return { x: direction * 18, y: -44 - Math.round(progress * 142), angle: direction * -8 };
  }
  const progress = (elapsed - 1080) / 420;
  const arc = Math.sin((1 - progress) * Math.PI / 2);
  return { x: Math.round(direction * (18 - progress * 18)), y: -Math.round(arc * 142), angle: direction * Math.round(8 - progress * 8) };
}

export function rebuildFloorTraversalPhase(elapsed: number): RebuildFloorTraversalPhase {
  if (elapsed < 0 || elapsed >= FLOOR_CLIMB_DURATION_MS) return "complete";
  if (elapsed < 380) return "vault";
  if (elapsed < 1080) return "wall-climb";
  return "landing";
}

function drawSkyline(ctx: CanvasRenderingContext2D, now: number): void {
  ctx.fillStyle = "#071322";
  ctx.fillRect(0, 0, REBUILD_WIDTH, REBUILD_HEIGHT);

  ctx.fillStyle = "#0a1a30";
  const buildings = [
    [0, 328, 72, 224], [80, 282, 92, 270], [180, 244, 120, 308],
    [310, 294, 92, 258], [420, 212, 140, 340], [570, 276, 96, 276],
    [690, 184, 128, 368], [830, 232, 118, 320], [960, 166, 144, 386],
    [1115, 220, 122, 332], [1245, 270, 60, 282],
  ] as const;
  for (const [x, y, width, height] of buildings) ctx.fillRect(x, y, width, height);

  ctx.fillStyle = "#10223d";
  for (let index = 0; index < 36; index += 1) {
    const x = (index * 149 + 37) % REBUILD_WIDTH;
    const y = 24 + ((index * 83) % 270);
    ctx.fillRect(x, y, 4, 4);
  }

  ctx.fillStyle = "#06101e";
  ctx.fillRect(0, REBUILD_GROUND_Y, REBUILD_WIDTH, REBUILD_HEIGHT - REBUILD_GROUND_Y);
  ctx.fillStyle = "#2cb7d3";
  ctx.fillRect(0, REBUILD_GROUND_Y, REBUILD_WIDTH, 4);
  void now;
}

function drawActor(ctx: CanvasRenderingContext2D, frames: LoadedFrames, actor: Actor, now: number, reducedEffectsEnabled: boolean): void {
  const animation = actor.sprite.animations[actor.animation];
  if (!animation) return;
  const source = animation.frames[frameIndexAt(animation, now - actor.startedAt)];
  const image = frames.get(source);
  if (!image || actor.enemyState === "dead") return;

  const scale = actor.sprite.scale;
  const width = actor.sprite.width * scale;
  const height = actor.sprite.height * scale;
  const actionElapsed = now - actor.startedAt;
  const visualOffset = actor.kind === "player"
    ? rebuildPlayerVisualOffset(actor.playerAction, actionElapsed, actor.facing)
    : { x: 0, y: 0 };
  const visualX = actor.x + visualOffset.x;
  const dx = Math.round(visualX - actor.sprite.anchorX * scale);
  const dy = Math.round(REBUILD_GROUND_Y - actor.sprite.anchorY * scale + visualOffset.y);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (actor.facing === "left") {
    ctx.translate(dx + width, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, width, height);
  } else {
    ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, dx, dy, width, height);
  }
  ctx.restore();

  if (!reducedEffectsEnabled && actor.kind === "player" && actor.playerAction && actor.playerAction !== "idle") {
    drawPlayerAction(ctx, actor.playerAction, visualX, REBUILD_GROUND_Y + visualOffset.y, actor.facing, actionElapsed);
  }

  if (actor.kind !== "enemy") return;
  if (actor.maxHp && actor.maxHp > 1) {
    const barWidth = Math.max(48, width * 0.7);
    const barX = actor.x - barWidth / 2;
    const barY = dy - 14;
    ctx.fillStyle = "#1a263a";
    ctx.fillRect(barX, barY, barWidth, 6);
    ctx.fillStyle = "#ff3f62";
    ctx.fillRect(barX, barY, barWidth * Math.max(0, (actor.hp ?? 0) / actor.maxHp), 6);
  }
  if (actor.shielded) {
    ctx.strokeStyle = "rgba(87, 234, 255, 0.9)";
    ctx.lineWidth = 4;
    const shieldX = actor.x + (actor.facing === "left" ? -18 : 18);
    const shieldTop = dy + height * 0.2;
    const shieldBottom = dy + height * 0.78;
    ctx.beginPath();
    ctx.moveTo(shieldX, shieldTop);
    ctx.lineTo(shieldX + (actor.facing === "left" ? -12 : 12), shieldTop + 10);
    ctx.lineTo(shieldX + (actor.facing === "left" ? -12 : 12), shieldBottom - 10);
    ctx.lineTo(shieldX, shieldBottom);
    ctx.stroke();
  }
  if (actor.enemyState === "attacking") {
    ctx.fillStyle = "#ff3f62";
    ctx.font = "bold 26px monospace";
    ctx.textAlign = "center";
    ctx.fillText("!", actor.x, dy - 22);
    if (actor.nextAttackAt !== undefined && actor.nextAttackAt - now <= 180) {
      ctx.strokeStyle = "rgba(255, 63, 98, 0.9)";
      ctx.lineWidth = 4;
      const pulse = 0.65 + Math.sin(now / 55) * 0.35;
      const direction = actor.facing === "left" ? -1 : 1;
      const startX = Math.max(12, Math.min(REBUILD_WIDTH - 12, actor.x + direction * 14));
      const endX = Math.max(12, Math.min(REBUILD_WIDTH - 12, actor.x + direction * Math.max(48, width * 0.8)));
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.moveTo(startX, REBUILD_GROUND_Y - 7);
      ctx.lineTo(endX, REBUILD_GROUND_Y - 7);
      ctx.stroke();
      for (let index = 0; index < 3; index += 1) {
        const x = startX + (endX - startX) * ((index + 1) / 4);
        ctx.beginPath();
        ctx.moveTo(x, REBUILD_GROUND_Y - 14);
        ctx.lineTo(x + direction * 8, REBUILD_GROUND_Y - 7);
        ctx.lineTo(x, REBUILD_GROUND_Y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  if (actor.enemyState === "stunned") {
    ctx.strokeStyle = "#39f6b0";
    ctx.lineWidth = 3;
    const sparkY = dy + height * 0.28;
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI / 2 + now / 420;
      const inner = 22;
      const outer = 34 + Math.sin(now / 90 + index) * 4;
      ctx.beginPath();
      ctx.moveTo(actor.x + Math.cos(angle) * inner, sparkY + Math.sin(angle) * inner);
      ctx.lineTo(actor.x + Math.cos(angle) * outer, sparkY + Math.sin(angle) * outer);
      ctx.stroke();
    }
  }
}

function drawPlayerAction(
  ctx: CanvasRenderingContext2D,
  action: RebuildPlayerAnimation,
  x: number,
  groundY: number,
  facing: "left" | "right",
  elapsed: number,
): void {
  const direction = facing === "left" ? -1 : 1;
  const progress = Math.min(1, elapsed / 260);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, groundY - 155);
  ctx.scale(direction, 1);
  if (action === "slash") {
    const reach = 38 + progress * 112;
    for (let index = 0; index < 4; index += 1) {
      const y = 34 + index * 13;
      ctx.strokeStyle = index === 1 ? "#d6fbff" : "#57eaff";
      ctx.globalAlpha = 0.95 - index * 0.14;
      ctx.lineWidth = index === 1 ? 7 : 3;
      ctx.beginPath();
      ctx.moveTo(10 + index * 5, y + 22 - index * 3);
      ctx.lineTo(10 + reach - index * 18, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (action === "charging") {
    const pulse = 0.55 + Math.sin(elapsed / 65) * 0.3;
    ctx.globalAlpha = pulse;
    for (let index = 0; index < 4; index += 1) {
      const y = 18 + index * 16;
      const length = 36 + index * 12 + Math.sin(elapsed / 80 + index) * 10;
      ctx.strokeStyle = index % 2 === 0 ? "#57eaff" : "#d6fbff";
      ctx.lineWidth = index === 1 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(-length, y);
      ctx.lineTo(-12, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (action === "heavy") {
    const sweep = 48 + progress * 92;
    for (let index = 0; index < 5; index += 1) {
      const y = 16 + index * 14;
      const start = 18 + index * 7;
      ctx.strokeStyle = index < 2 ? "#d6fbff" : "#57eaff";
      ctx.globalAlpha = 0.9 - index * 0.1;
      ctx.lineWidth = index === 1 ? 8 : 3;
      ctx.beginPath();
      ctx.moveTo(start, y + 28 - index * 3);
      ctx.lineTo(start + sweep - index * 14, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (action === "dodge") {
    ctx.strokeStyle = "rgba(87, 234, 255, 0.75)";
    for (const offset of [-52, -32, -12]) {
      ctx.globalAlpha = 0.35 + (offset + 52) / 120;
      ctx.lineWidth = offset === -32 ? 7 : 3;
      ctx.beginPath();
      ctx.moveTo(offset, 52 + (offset + 52) / 4);
      ctx.lineTo(offset - 62, 58 + (offset + 52) / 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (action === "parry") {
    ctx.strokeStyle = "#39f6b0";
    ctx.lineWidth = 5;
    for (let index = 0; index < 5; index += 1) {
      const y = -4 + index * 18;
      const length = 26 + Math.sin(elapsed / 60 + index) * 8;
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(8 + length, y - 12 + index * 3);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    for (let index = 0; index < 4; index += 1) {
      const y = 12 + index * 15;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(48 + Math.sin(elapsed / 50 + index) * 8, y - 8);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function renderRebuildScene(
  ctx: CanvasRenderingContext2D,
  frames: LoadedFrames,
  player: Actor,
  enemies: readonly Actor[],
  now: number,
  options: { reducedEffectsEnabled?: boolean; screenShakeEnabled?: boolean } = {},
): void {
  const reducedEffectsEnabled = options.reducedEffectsEnabled ?? false;
  const screenShakeEnabled = options.screenShakeEnabled ?? false;
  drawSkyline(ctx, now);
  ctx.save();
  if (screenShakeEnabled && player.playerAction && player.playerAction !== "idle") {
    const offset = rebuildShakeOffset(player.playerAction, now - player.startedAt);
    ctx.translate(offset.x, offset.y);
  }
  for (const enemy of enemies) drawActor(ctx, frames, enemy, now, reducedEffectsEnabled);
  drawActor(ctx, frames, player, now, reducedEffectsEnabled);
  ctx.restore();
}

export type { Actor };
