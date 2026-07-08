import { describe, expect, it } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_SPRITE_SHEETS } from "../assets/sprites";
import { validateSheetGeometry, validateSpriteSheetDef } from "./spriteManifest";
import {
  findEmptyUsedCells,
  findNonEmptyCells,
  getRuntimeSpritePackPaths,
  readPngMetadata,
} from "./runtimeSpritePack";

describe("runtime sprite pack", () => {
  it("keeps runtime sprite manifests unique by id and src path", () => {
    const ids = ALL_SPRITE_SHEETS.map((sheet) => sheet.id);
    const srcs = getRuntimeSpritePackPaths(ALL_SPRITE_SHEETS);

    expect(new Set(ids).size, "sprite manifest ids should be unique").toBe(ids.length);
    expect(new Set(srcs).size, "sprite manifest src paths should be unique").toBe(srcs.length);
  });

  it("keeps public sprite files and runtime manifests in exact sync", () => {
    const spriteDir = resolve(process.cwd(), "public", "sprites");
    const actual = readdirSync(spriteDir)
      .filter((name) => name.endsWith(".png"))
      .sort();
    const expected = getRuntimeSpritePackPaths(ALL_SPRITE_SHEETS)
      .map((src) => src.split("/").at(-1) as string)
      .sort();

    expect(actual).toEqual(expected);
  });

  it("ships every manifest-backed sprite sheet at the expected path and geometry", () => {
    for (const sheet of ALL_SPRITE_SHEETS) {
      const errors = validateSpriteSheetDef(sheet);
      expect(errors, `${sheet.id} manifest should be valid`).toEqual([]);

      const absPath = resolve(process.cwd(), "public", sheet.src.replace(/^\//, ""));
      expect(existsSync(absPath), `${sheet.id} sheet should exist at ${absPath}`).toBe(true);

      const { width, height } = readPngMetadata(absPath);
      expect(
        validateSheetGeometry(sheet, width, height),
        `${sheet.id} PNG should match manifest geometry`,
      ).toEqual([]);
    }
  });

  it("ships alpha-backed sprite sheets with transparent borders and visible content", () => {
    for (const sheet of ALL_SPRITE_SHEETS) {
      const absPath = resolve(process.cwd(), "public", sheet.src.replace(/^\//, ""));
      const meta = readPngMetadata(absPath);

      expect(meta.hasAlpha, `${sheet.id} PNG should keep alpha support`).toBe(true);
      expect(meta.transparentCorners, `${sheet.id} PNG corners should stay transparent`).toBe(true);
      expect(meta.hasOpaquePixels, `${sheet.id} PNG should contain visible sprite pixels`).toBe(true);
    }
  });

  it("keeps unused grid cells empty so sheet layout matches the manifest contract", () => {
    for (const sheet of ALL_SPRITE_SHEETS) {
      const absPath = resolve(process.cwd(), "public", sheet.src.replace(/^\//, ""));
      const usedCells = new Set(
        Object.values(sheet.animations).flatMap((anim) =>
          Array.from({ length: anim.frames }, (_, col) => `${anim.row}:${col}`),
        ),
      );

      const nonEmptyCells = findNonEmptyCells(absPath, sheet.frameWidth, sheet.frameHeight);
      const strayCells = nonEmptyCells.filter(({ row, col }) => !usedCells.has(`${row}:${col}`));

      expect(strayCells, `${sheet.id} should not draw into unused cells`).toEqual([]);
    }
  });

  it("keeps every manifest-declared frame cell populated with visible sprite pixels", () => {
    for (const sheet of ALL_SPRITE_SHEETS) {
      const absPath = resolve(process.cwd(), "public", sheet.src.replace(/^\//, ""));
      expect(
        findEmptyUsedCells(absPath, sheet.frameWidth, sheet.frameHeight, sheet.animations),
        `${sheet.id} should not ship blank used cells`,
      ).toEqual([]);
    }
  });
});
