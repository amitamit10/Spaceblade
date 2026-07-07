import { describe, it, expect } from "vitest";
import { frameForTime, frameForProgress } from "./animation";

describe("frameForTime", () => {
  it("advances one frame per frameMs and wraps", () => {
    expect(frameForTime(0, 100, 3)).toBe(0);
    expect(frameForTime(150, 100, 3)).toBe(1);
    expect(frameForTime(250, 100, 3)).toBe(2);
    expect(frameForTime(300, 100, 3)).toBe(0); // wraps
  });

  it("returns 0 for a single-frame animation", () => {
    expect(frameForTime(9999, 100, 1)).toBe(0);
  });

  it("returns 0 when frameCount is 0", () => {
    expect(frameForTime(500, 100, 0)).toBe(0);
  });
});

describe("frameForProgress", () => {
  it("maps progress across frames and clamps the ends", () => {
    expect(frameForProgress(0, 4)).toBe(0);
    expect(frameForProgress(0.5, 4)).toBe(2);
    expect(frameForProgress(1, 4)).toBe(3); // clamped to last
    expect(frameForProgress(1.5, 4)).toBe(3);
    expect(frameForProgress(-0.5, 4)).toBe(0);
  });

  it("returns 0 for a single-frame animation", () => {
    expect(frameForProgress(0.8, 1)).toBe(0);
  });
});
