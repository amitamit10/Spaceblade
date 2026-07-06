import { describe, it, expect } from "vitest";
import { createCanvasRoot } from "./canvasRoot";
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
