import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { PLAYER_SPRITES } from "./playerSprites";
import { validateSprite } from "../rendering/pixelSprite";
import { PLAYER_SHEET } from "../assets/sprites/player";
import { validateSheetGeometry, validateSpriteSheetDef } from "../rendering/spriteManifest";

type PngHeader = {
  width: number;
  height: number;
  colorType: number;
};

function readPngHeader(relativePath: string): PngHeader {
  const file = readFileSync(resolve(process.cwd(), "public", relativePath.replace(/^\/+/, "")));
  const signature = "89504e470d0a1a0a";
  expect(file.subarray(0, 8).toString("hex")).toBe(signature);
  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
    colorType: file.readUInt8(25),
  };
}

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

  it("exports a valid player sprite-sheet manifest with full animation coverage", () => {
    expect(validateSpriteSheetDef(PLAYER_SHEET)).toEqual([]);
    for (const key of ["idle", "walk", "slash", "charge", "heavy", "dodge", "parry", "hurt", "dead"]) {
      expect(PLAYER_SHEET.animations[key]).toBeDefined();
    }
  });

  it("matches the shipped player PNG geometry and keeps alpha support", () => {
    const png = readPngHeader(PLAYER_SHEET.src);
    expect(validateSheetGeometry(PLAYER_SHEET, png.width, png.height)).toEqual([]);
    expect(png.colorType).toBe(6);
  });
});
