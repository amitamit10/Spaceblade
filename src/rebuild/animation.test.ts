import { describe, expect, it } from "vitest";
import { frameIndexAt } from "./animation";

describe("rebuild animation", () => {
  const animation = { frames: ["a", "b", "c"], frameDurationMs: 100, loop: true };

  it("loops only at frame boundaries", () => {
    expect(frameIndexAt(animation, 0)).toBe(0);
    expect(frameIndexAt(animation, 99)).toBe(0);
    expect(frameIndexAt(animation, 100)).toBe(1);
    expect(frameIndexAt(animation, 300)).toBe(0);
  });

  it("holds the last frame for non-looping animations", () => {
    expect(frameIndexAt({ ...animation, loop: false }, 999)).toBe(2);
  });
});
