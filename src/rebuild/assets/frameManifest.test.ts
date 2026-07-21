import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { REBUILD_ENEMIES, REBUILD_PLAYER, REBUILD_SPRITES } from "./frameManifest";
import { readPngMetadata } from "../../game/rendering/runtimeSpritePack";

describe("rebuild frame manifest", () => {
  it("contains only standalone frame URLs", () => {
    for (const sprite of REBUILD_SPRITES) {
      for (const animation of Object.values(sprite.animations)) {
        expect(animation.frames.length).toBeGreaterThan(0);
        for (const frame of animation.frames) {
          if (sprite === REBUILD_PLAYER) {
            expect(frame).toMatch(/^\/assets\/public\/opengameart-space-soldier\/[a-z0-9-]+\.png\?v=cc0-space-soldier-1$/);
          } else {
            expect(frame).toMatch(/^\/sprites\/frames\/[^?]+\/(?:run|walk|windup|attack|hurt|recover|dead|specialAttack|charge|heavy|dodge|parry|idle|slash)-\d+\.png\?v=public-robot-pack-1$/);
          }
          expect(frame).not.toContain("player.png");
        }
      }
    }
  });

  it("ships every declared frame file", () => {
    for (const sprite of REBUILD_SPRITES) {
      for (const animation of Object.values(sprite.animations)) {
        for (const frame of animation.frames) {
          expect(existsSync(resolve(process.cwd(), "public", frame.split("?")[0].slice(1))), frame).toBe(true);
        }
      }
    }
  });

  it("does not leave obsolete generated player action frames beside the manifest", () => {
    const playerFrameDir = resolve(process.cwd(), "public/sprites/frames/player");
    const obsoleteFrames = readdirSync(playerFrameDir).filter((file) => file.startsWith("charging-"));
    expect(obsoleteFrames).toEqual([]);
  });

  it("keeps every standalone frame at its full sprite-cell dimensions", () => {
    for (const sprite of REBUILD_SPRITES) {
      for (const animation of Object.values(sprite.animations)) {
        for (const frame of animation.frames) {
          const absPath = resolve(process.cwd(), "public", frame.split("?")[0].slice(1));
          const { width, height } = readPngMetadata(absPath);
          expect({ width, height }, frame).toEqual({ width: sprite.width, height: sprite.height });
        }
      }
    }
  });

  it("keeps the first action deliberately small and one-shot", () => {
    expect(REBUILD_PLAYER.animations.slash.frames).toHaveLength(2);
    expect(REBUILD_PLAYER.animations.slash.loop).toBe(false);
  });

  it("ships dedicated player action sequences", () => {
    expect(REBUILD_PLAYER.animations.run.frames).toHaveLength(12);
    expect(REBUILD_PLAYER.animations.run.loop).toBe(true);
    expect(REBUILD_PLAYER.animations.walk.frames).toHaveLength(8);
    expect(REBUILD_PLAYER.animations.walk.loop).toBe(true);
    expect(REBUILD_PLAYER.animations.charging.frames).toHaveLength(1);
    expect(REBUILD_PLAYER.animations.heavy.frames).toHaveLength(2);
    expect(REBUILD_PLAYER.animations.dodge.frames).toHaveLength(2);
    expect(REBUILD_PLAYER.animations.parry.frames).toHaveLength(1);
  });

  it("gives every enemy class its own authored walk silhouette", () => {
    const enemyFrames = REBUILD_SPRITES.slice(1).map((sprite) => readFileSync(
      resolve(process.cwd(), "public", sprite.animations.walk.frames[0].split("?")[0].slice(1)),
    ));
    for (let left = 0; left < enemyFrames.length; left += 1) {
      for (let right = left + 1; right < enemyFrames.length; right += 1) {
        expect(enemyFrames[left]).not.toEqual(enemyFrames[right]);
      }
    }
  });

  it("uses a readable size ladder for enemy roles", () => {
    const scales = Object.fromEntries(REBUILD_ENEMIES.map((enemy) => [enemy.id, enemy.scale]));
    expect(scales.runner).toBeLessThan(scales.grunt);
    expect(scales.grunt).toBeLessThan(scales.shield);
    expect(scales.shield).toBeLessThan(scales.tank);
    expect(scales.tank).toBeLessThan(scales.boss);
  });

  it("ships dedicated player hurt and death reactions", () => {
    expect(REBUILD_PLAYER.animations.hurt?.frames).toHaveLength(1);
    expect(REBUILD_PLAYER.animations.dead?.frames).toHaveLength(1);
    expect(REBUILD_PLAYER.animations.hurt?.loop).toBe(false);
    expect(REBUILD_PLAYER.animations.dead?.loop).toBe(false);
  });

  it("ships dedicated attack and telegraph sequences for every enemy", () => {
    for (const sprite of REBUILD_SPRITES.slice(1)) {
      expect(sprite.animations.attack?.frames.length, sprite.id).toBeGreaterThan(0);
      expect(sprite.animations.windup?.frames.length, sprite.id).toBeGreaterThan(0);
    }
  });

  it("uses authored standalone walk sequences for every enemy approach", () => {
    for (const sprite of REBUILD_SPRITES.slice(1)) {
      expect(sprite.animations.walk?.frames[0], sprite.id).toMatch(
        new RegExp(`^/sprites/frames/${sprite.id}/walk-`),
      );
    }
  });

  it("ships a dedicated death sequence for every enemy", () => {
    for (const sprite of REBUILD_SPRITES.slice(1)) {
      expect(sprite.animations.dead?.frames.length, sprite.id).toBeGreaterThan(0);
      expect(sprite.animations.dead?.loop, sprite.id).toBe(false);
    }
  });

  it("ships recovery frames for every enemy and a special boss strike", () => {
    for (const sprite of REBUILD_SPRITES.slice(1)) {
      expect(sprite.animations.recover?.frames.length, sprite.id).toBeGreaterThan(0);
    }
    expect(REBUILD_SPRITES.find((sprite) => sprite.id === "boss")?.animations.specialAttack?.frames).toHaveLength(5);
  });
});
