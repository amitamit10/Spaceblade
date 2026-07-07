import { describe, it, expect } from "vitest";
import { ENEMY_SPRITES } from "./enemySprites";
import { validateSprite } from "../rendering/pixelSprite";

describe("enemy sprites", () => {
  it("exports sprites", () => {
    expect(ENEMY_SPRITES.length).toBeGreaterThan(0);
  });

  it("every enemy sprite is structurally valid", () => {
    expect(ENEMY_SPRITES.flatMap(validateSprite)).toEqual([]);
  });

  it("covers all six enemy types", () => {
    for (const type of ["grunt", "runner", "shield", "tank", "glitch", "boss"]) {
      expect(ENEMY_SPRITES.some((s) => s.id.startsWith(`${type}-`))).toBe(true);
    }
  });
});
