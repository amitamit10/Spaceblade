import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { ENEMY_SPRITES, getEnemySheetPose } from "./enemySprites";
import { validateSprite } from "../rendering/pixelSprite";
import { validateSheetGeometry, validateSpriteSheetDef } from "../rendering/spriteManifest";
import { GRUNT_SHEET } from "../assets/sprites/grunt";
import { RUNNER_SHEET } from "../assets/sprites/runner";
import { SHIELD_SHEET } from "../assets/sprites/shield";
import { TANK_SHEET } from "../assets/sprites/tank";
import { GLITCH_SHEET } from "../assets/sprites/glitch";
import { BOSS_SHEET } from "../assets/sprites/boss";
import { createEnemy } from "./enemyFactory";
import { enemyStats } from "./enemyStats";

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

  it("exports valid enemy manifests with required animation keys", () => {
    for (const def of [GRUNT_SHEET, RUNNER_SHEET, SHIELD_SHEET, TANK_SHEET, GLITCH_SHEET, BOSS_SHEET]) {
      expect(validateSpriteSheetDef(def)).toEqual([]);
    }
    for (const key of ["walk", "windup", "attack", "recover", "hurt", "dead"]) {
      expect(BOSS_SHEET.animations[key]).toBeDefined();
    }
    expect(BOSS_SHEET.animations.specialAttack).toBeDefined();
  });

  it("matches every shipped enemy PNG to its manifest geometry with alpha support", () => {
    for (const def of [GRUNT_SHEET, RUNNER_SHEET, SHIELD_SHEET, TANK_SHEET, GLITCH_SHEET, BOSS_SHEET]) {
      const png = readPngHeader(def.src);
      expect(validateSheetGeometry(def, png.width, png.height)).toEqual([]);
      expect(png.colorType).toBe(6);
    }
  });

  it("advances sheet-backed enemy one-shot poses based on their live state timing", () => {
    const grunt = createEnemy("g1", "grunt", "left");
    grunt.state = "windup";
    grunt.stateChangedAt = 1000;
    grunt.nextImpactAt = 1000 + enemyStats.grunt.windupMs;

    expect(getEnemySheetPose(grunt, 1000).key).toBe("windup");
    expect(getEnemySheetPose(grunt, 1000).frameIndex).toBe(0);
    expect(getEnemySheetPose(grunt, 1000 + enemyStats.grunt.windupMs - 1).frameIndex).toBeGreaterThan(0);

    grunt.state = "recovering";
    grunt.stateChangedAt = 2000;
    grunt.stunnedUntil = 2000 + enemyStats.grunt.recoveryMs;
    grunt.nextImpactAt = null;

    const recovering = getEnemySheetPose(grunt, 2000 + Math.floor(enemyStats.grunt.recoveryMs * 0.95));
    expect(["attack", "recover"]).toContain(recovering.key);
    expect(recovering.frameIndex).toBeGreaterThan(0);
  });

  it("keeps boss and glitch finishing motions readable instead of twitchy", () => {
    expect(GLITCH_SHEET.animations.attack.frameDurationMs).toBeGreaterThanOrEqual(75);
    expect(GLITCH_SHEET.animations.dead.frameDurationMs).toBeGreaterThanOrEqual(180);
    expect(BOSS_SHEET.animations.dead.frameDurationMs).toBeGreaterThanOrEqual(220);
    expect(BOSS_SHEET.animations.specialAttack.frameDurationMs).toBeGreaterThanOrEqual(110);
    expect(BOSS_SHEET.animations.dead.frameDurationMs).toBeGreaterThan(BOSS_SHEET.animations.attack.frameDurationMs);
    expect(GLITCH_SHEET.animations.dead.frameDurationMs).toBeGreaterThan(GLITCH_SHEET.animations.attack.frameDurationMs);
  });
});
