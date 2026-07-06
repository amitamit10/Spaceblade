import type { PlayerSnapshot } from "./playerStateMachine";
import { playerConfig } from "./playerConfig";

const COLOR_PLAYER = "#57eaff";
const COLOR_EFFECT = "#39f6b0";
const COLOR_FEEDBACK = "#ffe45c";
const COLOR_ENEMY = "#ff3f62";

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Draws the player and its current action feedback using canvas primitives.
 * Polished enough for development verification; sprite assets are not required.
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  snapshot: PlayerSnapshot,
  now: number,
): void {
  const { x, y, state, facing } = snapshot;
  const dir = facing === "right" ? 1 : -1;
  const elapsed = now - snapshot.actionStartedAt;

  ctx.save();

  // Dodge trail: afterimages behind the dash direction.
  if (state === "dodging") {
    const t = clamp01(elapsed / playerConfig.dodgeDurationMs);
    for (let i = 1; i <= 3; i += 1) {
      ctx.globalAlpha = 0.18 * (1 - t) * (1 - i / 4);
      drawBody(ctx, x - dir * i * 18, y, COLOR_EFFECT);
    }
    ctx.globalAlpha = 1;
  }

  // Ground shadow.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#02040a";
  ctx.beginPath();
  ctx.ellipse(x, y + 30, 26, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const bodyColor = state === "hurt" ? COLOR_ENEMY : state === "dead" ? "#3a4a55" : COLOR_PLAYER;
  drawBody(ctx, x, y, bodyColor);

  switch (state) {
    case "slashing":
      drawSlashArc(ctx, x, y, dir, elapsed / playerConfig.quickSlashActiveMs, playerConfig.quickSlashRange, COLOR_PLAYER);
      break;
    case "heavySlashing":
      drawSlashArc(ctx, x, y, dir, elapsed / playerConfig.heavySlashActiveMs, playerConfig.heavySlashRange, COLOR_EFFECT);
      break;
    case "charging":
      drawChargeGlow(ctx, x, y, now);
      break;
    case "parrying":
      drawParryRing(ctx, x, y, elapsed);
      break;
    default:
      break;
  }

  ctx.restore();
}

function drawBody(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  // Torso.
  ctx.beginPath();
  ctx.moveTo(x, y - 42);
  ctx.lineTo(x - 10, y + 6);
  ctx.lineTo(x + 10, y + 6);
  ctx.closePath();
  ctx.fill();
  // Head.
  ctx.beginPath();
  ctx.arc(x, y - 50, 8, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 6);
  ctx.lineTo(x - 10, y + 28);
  ctx.moveTo(x + 6, y + 6);
  ctx.lineTo(x + 10, y + 28);
  ctx.stroke();
}

function drawSlashArc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  progress: number,
  range: number,
  color: string,
): void {
  const t = clamp01(progress);
  const start = -Math.PI / 2.4 + t * Math.PI * 1.1;
  ctx.save();
  ctx.translate(x, y - 20);
  ctx.scale(dir, 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.globalAlpha = 0.85 * (1 - t * 0.4);
  ctx.beginPath();
  ctx.arc(0, 0, range * 0.6, start, start + Math.PI / 2);
  ctx.stroke();
  ctx.restore();
}

function drawChargeGlow(ctx: CanvasRenderingContext2D, x: number, y: number, now: number): void {
  const pulse = 0.5 + 0.5 * Math.sin(now / 90);
  ctx.save();
  ctx.globalAlpha = 0.3 + 0.4 * pulse;
  ctx.fillStyle = COLOR_FEEDBACK;
  ctx.beginPath();
  ctx.arc(x, y - 20, 22 + pulse * 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParryRing(ctx: CanvasRenderingContext2D, x: number, y: number, elapsed: number): void {
  const t = clamp01(elapsed / 180);
  ctx.save();
  ctx.strokeStyle = COLOR_EFFECT;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 1 - t;
  ctx.beginPath();
  ctx.arc(x, y - 20, 20 + t * 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
