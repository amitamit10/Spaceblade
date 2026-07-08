import { describe, expect, it } from "vitest";
import { frameIndexForLoop, frameIndexForOneShot, progressFromTimes } from "./spriteAnimator";

const looping = { row: 0, frames: 4, frameDurationMs: 100, loop: true };
const oneShot = { row: 1, frames: 5, frameDurationMs: 80, loop: false, holdLastFrame: true };

describe("spriteAnimator", () => {
  it("wraps looping animations", () => {
    expect(frameIndexForLoop(0, looping)).toBe(0);
    expect(frameIndexForLoop(199, looping)).toBe(1);
    expect(frameIndexForLoop(450, looping)).toBe(0);
  });

  it("clamps one-shot animations", () => {
    expect(frameIndexForOneShot(0, oneShot)).toBe(0);
    expect(frameIndexForOneShot(0.5, oneShot)).toBe(2);
    expect(frameIndexForOneShot(1, oneShot)).toBe(4);
  });

  it("converts time to bounded progress", () => {
    expect(progressFromTimes(100, 0, 400)).toBe(0.25);
    expect(progressFromTimes(999, 0, 400)).toBe(1);
    expect(progressFromTimes(0, 100, 400)).toBe(0);
  });
});
