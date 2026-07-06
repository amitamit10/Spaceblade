import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  LEFT_SPAWN_X,
  RIGHT_SPAWN_X,
} from "../constants";

export type SectorTheme = "neonCity" | "industrialSector" | "corruptedCore";

type ThemePalette = {
  skyTop: string;
  skyBottom: string;
  far: string;
  mid: string;
  near: string;
  accent: string;
  floor: string;
};

const THEMES: Record<SectorTheme, ThemePalette> = {
  neonCity: {
    skyTop: "#0b1a30",
    skyBottom: "#050812",
    far: "#12213d",
    mid: "#1a2f52",
    near: "#0e1b33",
    accent: "#57eaff",
    floor: "#0a1526",
  },
  industrialSector: {
    skyTop: "#1c1220",
    skyBottom: "#070409",
    far: "#2a1a2e",
    mid: "#3a2438",
    near: "#1c1018",
    accent: "#ff8a3f",
    floor: "#170d14",
  },
  corruptedCore: {
    skyTop: "#1a0b2e",
    skyBottom: "#070310",
    far: "#2a1150",
    mid: "#3d1b6e",
    near: "#180a2e",
    accent: "#9b5cff",
    floor: "#120826",
  },
};

/**
 * Draws the layered arena for a sector theme: sky gradient, three parallax
 * building silhouettes (far/mid/near), the floor platform, and the two spawn
 * gate glows. Parallax offset is derived from time only (no world scroll,
 * since the player is locked to center).
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  theme: SectorTheme,
  now: number,
): void {
  const p = THEMES[theme];

  const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, p.skyTop);
  sky.addColorStop(1, p.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawSkyline(ctx, p.far, 120, 190, 3, now * 0.004, 7);
  drawSkyline(ctx, p.mid, 70, 150, 2, now * 0.008, 11);
  drawSkyline(ctx, p.near, 40, 120, 1, now * 0.016, 13);

  drawFloor(ctx, p);
  drawSpawnGate(ctx, LEFT_SPAWN_X, p.accent, now);
  drawSpawnGate(ctx, RIGHT_SPAWN_X, p.accent, now);
}

function drawSkyline(
  ctx: CanvasRenderingContext2D,
  color: string,
  minH: number,
  maxH: number,
  parallax: number,
  offset: number,
  seedStep: number,
): void {
  ctx.fillStyle = color;
  const baseY = GROUND_Y - 20;
  const spacing = 70 + parallax * 14;
  for (let i = -1; i * spacing < GAME_WIDTH + spacing; i += 1) {
    const seed = i * seedStep;
    const h = minH + (Math.abs(Math.sin(seed)) * (maxH - minH));
    const w = spacing * 0.7;
    const x = ((i * spacing - offset) % (GAME_WIDTH + spacing)) - spacing;
    ctx.fillRect(x, baseY - h, w, h);
  }
}

function drawFloor(ctx: CanvasRenderingContext2D, p: ThemePalette): void {
  ctx.fillStyle = p.floor;
  ctx.fillRect(0, GROUND_Y + 30, GAME_WIDTH, GAME_HEIGHT - GROUND_Y - 30);
  ctx.strokeStyle = p.accent;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 30);
  ctx.lineTo(GAME_WIDTH, GROUND_Y + 30);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawSpawnGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  accent: string,
  now: number,
): void {
  const pulse = 0.4 + 0.3 * Math.sin(now / 260);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 26, GROUND_Y - 96, 52, 128);
  ctx.restore();
}
