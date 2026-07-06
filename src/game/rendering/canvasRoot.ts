import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

/**
 * Centralized canvas creation. Every canvas in the app must come from here so
 * that its internal resolution is guaranteed to be the fixed game resolution.
 */
export function createCanvasRoot(parent: HTMLElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.className = "game-canvas";
  canvas.setAttribute("data-game-canvas", "");
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  parent.appendChild(canvas);
  return canvas;
}

export type CanvasCssSize = { width: number; height: number };

/**
 * Computes the largest 16:9 CSS size that fits inside the given viewport,
 * preserving the fixed game aspect ratio while scaling responsively.
 */
export function computeCanvasCssSize(viewportWidth: number, viewportHeight: number): CanvasCssSize {
  const width = Math.min(viewportWidth, (viewportHeight * GAME_WIDTH) / GAME_HEIGHT);
  const height = (width * GAME_HEIGHT) / GAME_WIDTH;
  return { width, height };
}
