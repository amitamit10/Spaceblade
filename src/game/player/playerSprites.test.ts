import { describe, it, expect } from "vitest";
import { PLAYER_SPRITES } from "./playerSprites";
import { validateSprite } from "../rendering/pixelSprite";

describe("player sprites", () => {
  it("exports at least one sprite", () => {
    expect(PLAYER_SPRITES.length).toBeGreaterThan(0);
  });

  it("every player sprite is structurally valid", () => {
    const problems = PLAYER_SPRITES.flatMap(validateSprite);
    expect(problems).toEqual([]);
  });

  it("gives every sprite a unique id", () => {
    const ids = PLAYER_SPRITES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
