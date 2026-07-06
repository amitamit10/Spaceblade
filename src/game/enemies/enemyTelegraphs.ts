import type { EnemyActor } from "./enemyFactory";

const COLOR_ENEMY = "#ff3f62";
const DANGER_RING_MS = 180;

/**
 * Draws the red attack telegraphs for an enemy in windup:
 * - a red "!" marker above it for the whole windup,
 * - a floor danger ring in the final 180ms before impact,
 * - a runner dash line, and a wide area zone for tank/boss swings.
 */
export function drawEnemyTelegraph(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyActor,
  now: number,
): void {
  if (enemy.state !== "windup" || enemy.nextImpactAt === null) return;
  const untilImpact = enemy.nextImpactAt - now;

  ctx.save();
  ctx.fillStyle = COLOR_ENEMY;
  ctx.strokeStyle = COLOR_ENEMY;

  // "!" marker above the enemy.
  ctx.globalAlpha = 0.9;
  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("!", enemy.x, enemy.y - 74);

  if (untilImpact <= DANGER_RING_MS) {
    const dir = enemy.facing === "right" ? 1 : -1;

    if (enemy.type === "runner") {
      // Horizontal dash line through the player position.
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y + 20);
      ctx.lineTo(enemy.x + dir * 260, enemy.y + 20);
      ctx.stroke();
    } else if (enemy.type === "tank" || enemy.type === "boss") {
      // Wide area swing zone.
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.ellipse(enemy.x + dir * 40, enemy.y + 22, 120, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Focused floor danger ring.
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(enemy.x + dir * 20, enemy.y + 22, 46, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}
