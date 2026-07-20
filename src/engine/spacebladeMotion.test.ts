import { describe, expect, it } from "vitest";
import { enemyVisualMotion } from "./spacebladeMotion";

describe("Phaser combat motion", () => {
  it("gives approaching enemies a small readable walk bob", () => {
    const first = enemyVisualMotion("approaching", 0, 900, 640, 100);
    const second = enemyVisualMotion("approaching", 65, 900, 640, 100);

    expect(first.x).toBe(0);
    expect(first.y).not.toBe(second.y);
    expect(Math.abs(first.y)).toBeLessThanOrEqual(4);
  });

  it("lunges and tilts an enemy toward the player during the impact window", () => {
    const beforeImpact = enemyVisualMotion("attacking", 0, 720, 640, 180);
    const nearImpact = enemyVisualMotion("attacking", 160, 720, 640, 180);

    expect(beforeImpact.x).toBe(0);
    expect(nearImpact.x).toBeLessThan(0);
    expect(Math.abs(nearImpact.angle)).toBeGreaterThan(0);
  });

  it("pushes stunned enemies upward with a short recoil", () => {
    const motion = enemyVisualMotion("stunned", 120, 720, 640, 100);

    expect(motion.y).toBeLessThan(0);
    expect(motion.angle).not.toBe(0);
  });
});
