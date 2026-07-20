import { describe, expect, it } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_SPRITE_SHEETS } from "../assets/sprites";
import { PLAYER_SHEET } from "../assets/sprites/player";
import { spriteAssetFilename, spriteAssetPublicPath } from "../assets/sprites/spriteAssetPath";
import { validateSheetGeometry, validateSpriteSheetDef } from "./spriteManifest";
import {
  findEmptyUsedCells,
  findFrameOpaqueBounds,
  findFeetRow,
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
      .map((src) => spriteAssetFilename(src))
      .sort();

    expect(actual).toEqual(expected);
  });

  it("ships every manifest-backed sprite sheet at the expected path and geometry", () => {
    for (const sheet of ALL_SPRITE_SHEETS) {
      const errors = validateSpriteSheetDef(sheet);
      expect(errors, `${sheet.id} manifest should be valid`).toEqual([]);

      const absPath = resolve(process.cwd(), "public", spriteAssetPublicPath(sheet.src));
      expect(existsSync(absPath), `${sheet.id} sheet should exist at ${absPath}`).toBe(true);

      const { width, height } = readPngMetadata(absPath);
      expect(
        validateSheetGeometry(sheet, width, height),
        `${sheet.id} PNG should match manifest geometry`,
      ).toEqual([]);
    }
  });

  it("ships every standalone frame declared by every animation", () => {
    for (const sheet of ALL_SPRITE_SHEETS) {
      for (const animation of Object.values(sheet.animations)) {
        expect(animation.frameSources, `${sheet.id} animation should have standalone frames`).toBeDefined();
        for (const source of animation.frameSources ?? []) {
          const absPath = resolve(process.cwd(), "public", spriteAssetPublicPath(source));
          expect(existsSync(absPath), `${sheet.id} frame should exist at ${absPath}`).toBe(true);
        }
      }
    }
  });

  it("ships alpha-backed sprite sheets with transparent borders and visible content", () => {
    for (const sheet of ALL_SPRITE_SHEETS) {
      const absPath = resolve(process.cwd(), "public", spriteAssetPublicPath(sheet.src));
      const meta = readPngMetadata(absPath);

      expect(meta.hasAlpha, `${sheet.id} PNG should keep alpha support`).toBe(true);
      expect(meta.transparentCorners, `${sheet.id} PNG corners should stay transparent`).toBe(true);
      expect(meta.hasOpaquePixels, `${sheet.id} PNG should contain visible sprite pixels`).toBe(true);
    }
  });

  it("keeps unused grid cells empty so sheet layout matches the manifest contract", () => {
    for (const sheet of ALL_SPRITE_SHEETS) {
      // Player action art is intentionally consumed from standalone frames:
      // the supplied sheet has effects spilling into neighboring legacy cells.
      if (sheet.id === "player") continue;
      const absPath = resolve(process.cwd(), "public", spriteAssetPublicPath(sheet.src));
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

  it("aligns each manifest anchorY with the sprite's actual feet row so actors stand on the ground", () => {
    for (const sheet of ALL_SPRITE_SHEETS) {
      const absPath = resolve(process.cwd(), "public", spriteAssetPublicPath(sheet.src));
      // Row 0 is the grounded neutral pose (idle/walk) for every actor sheet.
      const feetRow = findFeetRow(absPath, sheet.frameWidth, sheet.frameHeight, 0);
      expect(feetRow, `${sheet.id} row 0 should contain sprite pixels`).toBeGreaterThan(0);
      expect(
        Math.abs(sheet.anchorY - feetRow),
        `${sheet.id} anchorY (${sheet.anchorY}) should match its feet row (${feetRow}) so feet land on the ground line`,
      ).toBeLessThanOrEqual(2);
    }
  });

  it("keeps every manifest-declared frame cell populated with visible sprite pixels", () => {
    for (const sheet of ALL_SPRITE_SHEETS) {
      const absPath = resolve(process.cwd(), "public", spriteAssetPublicPath(sheet.src));
      expect(
        findEmptyUsedCells(absPath, sheet.frameWidth, sheet.frameHeight, sheet.animations),
        `${sheet.id} should not ship blank used cells`,
      ).toEqual([]);
    }
  });

  it("keeps the player idle row visually stable across all declared idle frames", () => {
    const absPath = resolve(process.cwd(), "public", spriteAssetPublicPath(PLAYER_SHEET.src));
    const bounds = Array.from({ length: PLAYER_SHEET.animations.idle.frames }, (_, col) =>
      findFrameOpaqueBounds(absPath, PLAYER_SHEET.frameWidth, PLAYER_SHEET.frameHeight, 0, col),
    );

    const widths = bounds.map((bound) => bound ? bound.maxX - bound.minX + 1 : 0);
    expect(Math.min(...widths), "every idle frame should contain a full visible body").toBeGreaterThanOrEqual(40);

    const centers = bounds
      .filter((bound): bound is NonNullable<typeof bound> => bound !== null)
      .map((bound) => (bound.minX + bound.maxX) / 2);
    expect(
      Math.max(...centers) - Math.min(...centers),
      "idle frames should not jump wildly across the frame",
    ).toBeLessThanOrEqual(18);
  });
});
