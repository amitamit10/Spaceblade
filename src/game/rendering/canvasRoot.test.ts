import { describe, it, expect } from "vitest";
import { createCanvasRoot, computeCanvasCssSize } from "./canvasRoot";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

describe("createCanvasRoot", () => {
  it("creates a canvas with the fixed internal game resolution", () => {
    const parent = document.createElement("div");
    const canvas = createCanvasRoot(parent);

    expect(canvas.tagName).toBe("CANVAS");
    expect(canvas.width).toBe(GAME_WIDTH);
    expect(canvas.height).toBe(GAME_HEIGHT);
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(720);
  });

  it("appends the canvas to the given parent", () => {
    const parent = document.createElement("div");
    const canvas = createCanvasRoot(parent);
    expect(canvas.parentElement).toBe(parent);
    expect(parent.querySelector("canvas[data-game-canvas]")).toBe(canvas);
  });
});

describe("computeCanvasCssSize", () => {
  const ratio = GAME_WIDTH / GAME_HEIGHT;

  it("returns 16:9 dimensions for common viewport sizes", () => {
    for (const [vw, vh] of [
      [1920, 1080],
      [1366, 768],
      [1000, 1000],
      [800, 1200],
    ] as const) {
      const { width, height } = computeCanvasCssSize(vw, vh);
      expect(width / height).toBeCloseTo(ratio, 5);
      expect(width).toBeLessThanOrEqual(vw + 0.001);
      expect(height).toBeLessThanOrEqual(vh + 0.001);
    }
  });

  it("fits width for wide viewports and height for tall viewports", () => {
    expect(computeCanvasCssSize(1920, 1080).width).toBeCloseTo(1920, 5);
    expect(computeCanvasCssSize(1000, 1000).width).toBeCloseTo(1000, 5);
  });
});
