import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  LEFT_SPAWN_X,
  RIGHT_SPAWN_X,
} from "../constants";
import type { SectorTheme } from "./backgroundLayers";

type Palette = {
  skyTop: string;
  skyBottom: string;
  far: string;
  mid: string;
  near: string;
  window: string;
  accent: string;
  floor: string;
};

const THEMES: Record<SectorTheme, Palette> = {
  neonCity: {
    skyTop: "#0b1a30",
    skyBottom: "#050812",
    far: "#12213d",
    mid: "#1a2f52",
    near: "#0e1b33",
    window: "#57eaff",
    accent: "#57eaff",
    floor: "#0a1526",
  },
  industrialSector: {
    skyTop: "#1c1220",
    skyBottom: "#070409",
    far: "#2a1a2e",
    mid: "#3a2438",
    near: "#1c1018",
    window: "#ff8a3f",
    accent: "#ff8a3f",
    floor: "#170d14",
  },
  corruptedCore: {
    skyTop: "#1a0b2e",
    skyBottom: "#070310",
    far: "#2a1150",
    mid: "#3d1b6e",
    near: "#180a2e",
    window: "#c58bff",
    accent: "#9b5cff",
    floor: "#120826",
  },
};

const PX = 8; // background pixel size

export function pixelBackgroundThemes(): SectorTheme[] {
  return ["neonCity", "industrialSector", "corruptedCore"];
}

/** Draws the pixel-tiled arena for a sector theme (sky, parallax buildings, floor, gates). */
export function drawPixelBackground(
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

  drawStars(ctx, p.window, now);
  drawBuildings(ctx, p.far, p.window, 150, now * 0.004, 90, 0.3);
  drawBuildings(ctx, p.mid, p.window, 190, now * 0.008, 120, 0.55);
  drawBuildings(ctx, p.near, p.window, 240, now * 0.016, 150, 0.85);
  drawFloor(ctx, p);
  drawSpawnGate(ctx, LEFT_SPAWN_X, p.accent, now);
  drawSpawnGate(ctx, RIGHT_SPAWN_X, p.accent, now);
}

function drawStars(ctx: CanvasRenderingContext2D, color: string, now: number): void {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 40; i += 1) {
    const x = (i * 137) % GAME_WIDTH;
    const y = (i * 53) % (GROUND_Y - 200);
    ctx.globalAlpha = 0.2 + 0.2 * Math.abs(Math.sin(now / 700 + i));
    ctx.fillRect(x, y, PX / 2, PX / 2);
  }
  ctx.restore();
}

function drawBuildings(
  ctx: CanvasRenderingContext2D,
  color: string,
  windowColor: string,
  maxH: number,
  offset: number,
  spacing: number,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const baseY = GROUND_Y - 10;
  for (let i = -1; i * spacing < GAME_WIDTH + spacing; i += 1) {
    const seed = i * 41;
    const h = 60 + Math.abs(Math.sin(seed)) * maxH;
    const w = spacing * 0.7;
    const x = Math.round(((i * spacing - offset) % (GAME_WIDTH + spacing)) - spacing);
    ctx.fillStyle = color;
    ctx.fillRect(x, baseY - h, w, h);
    ctx.fillStyle = windowColor;
    for (let wy = baseY - h + PX * 2; wy < baseY - PX; wy += PX * 2) {
      for (let wx = x + PX; wx < x + w - PX; wx += PX * 2) {
        if ((Math.abs(wx + wy + seed) % 3) === 0) ctx.fillRect(wx, wy, PX, PX);
      }
    }
  }
  ctx.restore();
}

function drawFloor(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.floor;
  ctx.fillRect(0, GROUND_Y + 30, GAME_WIDTH, GAME_HEIGHT - GROUND_Y - 30);
  ctx.save();
  ctx.fillStyle = p.accent;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, GROUND_Y + 30, GAME_WIDTH, PX / 2);
  ctx.restore();
}

function drawSpawnGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  accent: string,
  now: number,
): void {
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.25 * Math.sin(now / 260);
  ctx.fillStyle = accent;
  ctx.fillRect(x - 26, GROUND_Y - 96, PX / 2, 128);
  ctx.fillRect(x + 26, GROUND_Y - 96, PX / 2, 128);
  ctx.restore();
}
