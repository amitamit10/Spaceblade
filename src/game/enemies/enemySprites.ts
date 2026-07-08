import type { PixelSprite } from "../rendering/pixelSprite";
import { drawSprite } from "../rendering/pixelSprite";
import { frameForTime } from "../rendering/animation";
import { frameIndexForLoop, frameIndexForOneShot, progressFromTimes } from "../rendering/spriteAnimator";
import { drawSheetFrame } from "../rendering/spriteSheetRenderer";
import { getSpriteSheet } from "../rendering/spriteSheetLoader";
import type { EnemyActor } from "./enemyFactory";
import type { EnemyType } from "../../app/types";
import type { SpriteAnimationDef, SpriteSheetDef } from "../rendering/spriteManifest";
import { BOSS_SHEET } from "../assets/sprites/boss";
import { GLITCH_SHEET } from "../assets/sprites/glitch";
import { GRUNT_SHEET } from "../assets/sprites/grunt";
import { RUNNER_SHEET } from "../assets/sprites/runner";
import { SHIELD_SHEET } from "../assets/sprites/shield";
import { TANK_SHEET } from "../assets/sprites/tank";

const SCALE_BY_TYPE: Record<EnemyType, number> = {
  grunt: 4,
  runner: 4,
  shield: 4,
  tank: 5,
  glitch: 4,
  boss: 7,
};

const SHEETS: Record<EnemyType, SpriteSheetDef> = {
  grunt: GRUNT_SHEET,
  runner: RUNNER_SHEET,
  shield: SHIELD_SHEET,
  tank: TANK_SHEET,
  glitch: GLITCH_SHEET,
  boss: BOSS_SHEET,
};

const sprite = (
  id: string,
  w: number,
  h: number,
  palette: Record<string, string>,
  rows: string[],
): PixelSprite => ({ id, w, h, palette, rows });

// --- Grunt: small red frontliner (12x16) ---
const GRUNT = { r: "#ff3f62", d: "#3a0a12", e: "#ffd9b3", w: "#ff8a3f" };
const gruntWalk0 = sprite("grunt-walk-0", 12, 16, GRUNT, [
  "....dd......",
  "...deed.....",
  "...deed.....",
  "....rr......",
  "...rrrr.....",
  "..rrrrrr....",
  "..rrrrrr....",
  "..rrrrrr....",
  "...rrrr.....",
  "...r..r.....",
  "...r..r.....",
  "..rr..rr....",
  "..r....r....",
  "..r....r....",
  ".rr....rr...",
  "............",
]);
const gruntWalk1 = sprite("grunt-walk-1", 12, 16, GRUNT, [
  "....dd......",
  "...deed.....",
  "...deed.....",
  "....rr......",
  "...rrrr.....",
  "..rrrrrr....",
  "..rrrrrr....",
  "..rrrrrr....",
  "...rrrr.....",
  "...r..r.....",
  "...r..r.....",
  "...rr.rr....",
  "...r...r....",
  "..rr...r....",
  ".rr.....r...",
  "............",
]);
const gruntWindup = sprite("grunt-windup", 12, 16, GRUNT, [
  "....dd....w.",
  "...deed..w..",
  "...deed.w...",
  "....rrw.....",
  "...rrrr.....",
  "..rrrrrr....",
  "..rrrrrr....",
  "..rrrrrr....",
  "...rrrr.....",
  "...r..r.....",
  "...r..r.....",
  "..rr..rr....",
  "..r....r....",
  "..r....r....",
  ".rr....rr...",
  "............",
]);

// --- Runner: lean fast striker (12x16) ---
const RUNNER = { m: "#ff5c8a", d: "#3a0a1a", e: "#ffd9b3", w: "#ffd9b3" };
const runnerWalk0 = sprite("runner-walk-0", 12, 16, RUNNER, [
  ".....dd.....",
  "....deed....",
  "....deed....",
  ".....mm.....",
  "....mmmm....",
  "....mmmm....",
  "....mmmm....",
  "....mmmm....",
  ".....mm.....",
  ".....mm.....",
  "....m.m.....",
  "...m..m.....",
  "..m...m.....",
  ".m....m.....",
  ".m.....m....",
  "............",
]);
const runnerWalk1 = sprite("runner-walk-1", 12, 16, RUNNER, [
  ".....dd.....",
  "....deed....",
  "....deed....",
  ".....mm.....",
  "....mmmm....",
  "....mmmm....",
  "....mmmm....",
  "....mmmm....",
  ".....mm.....",
  ".....mm.....",
  ".....m.m....",
  ".....m..m...",
  ".....m...m..",
  ".....m....m.",
  "....m.....m.",
  "............",
]);
const runnerWindup = sprite("runner-windup", 12, 16, RUNNER, [
  ".....dd.....",
  "....deed....",
  "....deed....",
  ".....mm.....",
  "....mmmmwwww",
  "....mmmm....",
  "....mmmm....",
  "....mmmm....",
  ".....mm.....",
  "....mm.mm...",
  "...mm...mm..",
  "..mm.....m..",
  ".mm......m..",
  ".m.......m..",
  "m........m..",
  "............",
]);

// --- Shield: bulky blocker with a shield (12x16) ---
const SHIELD = { b: "#6c7b93", l: "#bcd4ff", e: "#ffd9b3", d: "#2a3242" };
const shieldWalk0 = sprite("shield-walk-0", 12, 16, SHIELD, [
  "...dddd.....",
  "..deeeed....",
  "..deeeed....",
  "...bbbb.....",
  "..bbbbbb..ll",
  ".bbbbbbbb.ll",
  ".bbbbbbbb.ll",
  ".bbbbbbbb.ll",
  "..bbbbbb..ll",
  "..bb..bb..ll",
  "..b....b..ll",
  "..b....b..ll",
  ".bb....bb...",
  ".b......b...",
  "bb......bb..",
  "............",
]);
const shieldWalk1 = sprite("shield-walk-1", 12, 16, SHIELD, [
  "...dddd.....",
  "..deeeed....",
  "..deeeed....",
  "...bbbb.....",
  "..bbbbbb..ll",
  ".bbbbbbbb.ll",
  ".bbbbbbbb.ll",
  ".bbbbbbbb.ll",
  "..bbbbbb..ll",
  "..bb..bb..ll",
  "..b....b..ll",
  "..bb..bb..ll",
  ".b......b...",
  "bb......bb..",
  ".bb....bb...",
  "............",
]);
const shieldWindup = sprite("shield-windup", 12, 16, SHIELD, [
  "...dddd.....",
  "..deeeed.lll",
  "..deeeed.lll",
  "...bbbb..lll",
  "..bbbbbb.lll",
  ".bbbbbbbblll",
  ".bbbbbbbblll",
  ".bbbbbbbb.ll",
  "..bbbbbb....",
  "..bb..bb....",
  "..b....b....",
  "..b....b....",
  ".bb....bb...",
  ".b......b...",
  "bb......bb..",
  "............",
]);

// --- Tank: heavy armored bruiser (14x16) ---
const TANK = { a: "#c0473d", k: "#4a1510", e: "#ffe45c", w: "#ff8a3f" };
const tankWalk0 = sprite("tank-walk-0", 14, 16, TANK, [
  "....aaaaaa....",
  "...akkkkkka...",
  "...akkeekka...",
  "....aaaaaa....",
  "..aaaaaaaaaa..",
  ".aaaaaaaaaaaa.",
  ".aaaaaaaaaaaa.",
  ".aaaaaaaaaaaa.",
  "..aaaaaaaaaa..",
  "..aaa..aaa....",
  "..aa....aa....",
  "..aa....aa....",
  ".aaa....aaa...",
  ".aa......aa...",
  "aaa......aaa..",
  "..............",
]);
const tankWalk1 = sprite("tank-walk-1", 14, 16, TANK, [
  "....aaaaaa....",
  "...akkkkkka...",
  "...akkeekka...",
  "....aaaaaa....",
  "..aaaaaaaaaa..",
  ".aaaaaaaaaaaa.",
  ".aaaaaaaaaaaa.",
  ".aaaaaaaaaaaa.",
  "..aaaaaaaaaa..",
  "...aaa..aaa...",
  "..aa....aa....",
  ".aa......aa...",
  ".aaa....aaa...",
  "..aa....aa....",
  "..aaa..aaa....",
  "..............",
]);
const tankWindup = sprite("tank-windup", 14, 16, TANK, [
  "....aaaaaa..ww",
  "...akkkkkka.w.",
  "...akkeekkaw..",
  "....aaaaaaw...",
  "..aaaaaaaaaa..",
  ".aaaaaaaaaaaa.",
  ".aaaaaaaaaaaa.",
  ".aaaaaaaaaaaa.",
  "..aaaaaaaaaa..",
  "..aaa..aaa....",
  "..aa....aa....",
  "..aa....aa....",
  ".aaa....aaa...",
  ".aa......aa...",
  "aaa......aaa..",
  "..............",
]);

// --- Glitch: teleporting purple elite (12x16) ---
const GLITCH = { p: "#9b5cff", v: "#c58bff", e: "#ffffff", g: "#ffe45c" };
const glitchWalk0 = sprite("glitch-walk-0", 12, 16, GLITCH, [
  "....pp......",
  "...pvvp.....",
  "...pvvp.....",
  "....pp......",
  "...pppp.p...",
  "..pppppp....",
  ".p.pppp.p...",
  "..pppppp....",
  "...pppp.....",
  "...p..p.....",
  "..p...p.....",
  "..p...p.....",
  ".pp..pp.....",
  ".p...p......",
  "pp..pp......",
  "............",
]);
const glitchWalk1 = sprite("glitch-walk-1", 12, 16, GLITCH, [
  ".....pp.....",
  "....pvvp....",
  "....pvvp....",
  ".p...pp.....",
  "...pppp.....",
  "..pppppp.p..",
  "..pppppp....",
  ".p.pppp.....",
  "...pppp.....",
  "...p..p.....",
  "..p...p.....",
  ".pp...pp....",
  ".p....p.....",
  "pp...pp.....",
  "..p.........",
  "............",
]);
const glitchWindup = sprite("glitch-windup", 12, 16, GLITCH, [
  "g...pp...g..",
  "...pvvp.....",
  "g..pvvp..g..",
  "....pp......",
  ".gpppppg....",
  "..pppppp....",
  "g.pppppp.g..",
  "..pppppp....",
  "...pppp.....",
  "...p..p.....",
  "..p...p.....",
  "..p...p.....",
  ".pp..pp.....",
  ".p...p......",
  "pp..pp......",
  "............",
]);

// --- Boss: large menace (16x20) ---
const BOSS = { o: "#ff2d55", k: "#5a0f1e", e: "#ffe45c", w: "#ff8a3f" };
const bossWalk0 = sprite("boss-walk-0", 16, 20, BOSS, [
  ".....oooooo.....",
  "....okkkkkko....",
  "....okeeeeko....",
  ".....oooooo.....",
  "...oooooooooo...",
  "..oooooooooooo..",
  ".oooooooooooooo.",
  ".oooooooooooooo.",
  ".oooooooooooooo.",
  ".oooooooooooooo.",
  "..oooooooooooo..",
  "...oooooooooo...",
  "...ooo....ooo...",
  "..ooo......ooo..",
  "..oo........oo..",
  "..oo........oo..",
  ".ooo........ooo.",
  ".oo..........oo.",
  "ooo..........ooo",
  "................",
]);
const bossWalk1 = sprite("boss-walk-1", 16, 20, BOSS, [
  ".....oooooo.....",
  "....okkkkkko....",
  "....okeeeeko....",
  ".....oooooo.....",
  "...oooooooooo...",
  "..oooooooooooo..",
  ".oooooooooooooo.",
  ".oooooooooooooo.",
  ".oooooooooooooo.",
  ".oooooooooooooo.",
  "..oooooooooooo..",
  "...oooooooooo...",
  "...ooo....ooo...",
  "...ooo....ooo...",
  "..ooo......ooo..",
  "..oo........oo..",
  "..ooo......ooo..",
  ".ooo........ooo.",
  ".oo..........oo.",
  "................",
]);
const bossWindup = sprite("boss-windup", 16, 20, BOSS, [
  ".....oooooo..ww.",
  "....okkkkkkoww..",
  "....okeeeekow...",
  ".....oooooow....",
  "...oooooooooo...",
  "..oooooooooooo..",
  ".oooooooooooooo.",
  ".oooooooooooooo.",
  ".oooooooooooooo.",
  ".oooooooooooooo.",
  "..oooooooooooo..",
  "...oooooooooo...",
  "...ooo....ooo...",
  "..ooo......ooo..",
  "..oo........oo..",
  "..oo........oo..",
  ".ooo........ooo.",
  ".oo..........oo.",
  "ooo..........ooo",
  "................",
]);

export const ENEMY_SPRITES: PixelSprite[] = [
  gruntWalk0,
  gruntWalk1,
  gruntWindup,
  runnerWalk0,
  runnerWalk1,
  runnerWindup,
  shieldWalk0,
  shieldWalk1,
  shieldWindup,
  tankWalk0,
  tankWalk1,
  tankWindup,
  glitchWalk0,
  glitchWalk1,
  glitchWindup,
  bossWalk0,
  bossWalk1,
  bossWindup,
];

function byId(id: string, type: EnemyType): PixelSprite {
  return (
    ENEMY_SPRITES.find((s) => s.id === id) ??
    ENEMY_SPRITES.find((s) => s.id.startsWith(`${type}-`)) ??
    ENEMY_SPRITES[0]
  );
}

function spriteFor(enemy: EnemyActor, now: number): PixelSprite {
  const t = enemy.type;
  if (enemy.state === "windup") return byId(`${t}-windup`, t);
  const walk = ENEMY_SPRITES.filter((s) => s.id.startsWith(`${t}-walk`));
  const frames = walk.length > 0 ? walk : ENEMY_SPRITES.filter((s) => s.id.startsWith(`${t}-`));
  return frames[frameForTime(now, 220, frames.length)];
}

type EnemySheetPose = {
  key: keyof SpriteSheetDef["animations"];
  frameIndex: number;
};

function oneShotFrame(now: number, startedAt: number, totalDurationMs: number, anim: SpriteAnimationDef): number {
  return frameIndexForOneShot(progressFromTimes(now, startedAt, totalDurationMs), anim);
}

export function getEnemySheetPose(enemy: EnemyActor, now: number): EnemySheetPose {
  const def = SHEETS[enemy.type];
  const startedAt = enemy.stateChangedAt;
  switch (enemy.state) {
    case "spawning":
    case "approaching":
      return { key: "walk", frameIndex: frameIndexForLoop(now, def.animations.walk) };
    case "windup": {
      const anim = def.animations.windup;
      const total = enemy.nextImpactAt !== null ? Math.max(anim.frameDurationMs, enemy.nextImpactAt - startedAt) : anim.frames * anim.frameDurationMs;
      return { key: "windup", frameIndex: oneShotFrame(now, startedAt, total, anim) };
    }
    case "recovering": {
      const attackAnim = def.animations.attack;
      const recoverAnim = def.animations.recover;
      const total = enemy.stunnedUntil !== null
        ? Math.max(attackAnim.frameDurationMs + recoverAnim.frameDurationMs, enemy.stunnedUntil - startedAt)
        : attackAnim.frames * attackAnim.frameDurationMs + recoverAnim.frames * recoverAnim.frameDurationMs;
      const elapsed = Math.max(0, now - startedAt);
      const attackBudget = Math.max(attackAnim.frameDurationMs * attackAnim.frames, Math.round(total * 0.45));
      if (elapsed < attackBudget) {
        return { key: "attack", frameIndex: oneShotFrame(now, startedAt, attackBudget, attackAnim) };
      }
      return {
        key: "recover",
        frameIndex: oneShotFrame(now, startedAt + attackBudget, Math.max(recoverAnim.frameDurationMs, total - attackBudget), recoverAnim),
      };
    }
    case "stunned": {
      const anim = def.animations.hurt;
      const total = enemy.stunnedUntil !== null
        ? Math.max(anim.frameDurationMs * anim.frames, enemy.stunnedUntil - startedAt)
        : anim.frameDurationMs * anim.frames;
      return { key: "hurt", frameIndex: oneShotFrame(now, startedAt, total, anim) };
    }
    case "dead": {
      const anim = def.animations.dead;
      return { key: "dead", frameIndex: oneShotFrame(now, startedAt, anim.frameDurationMs * anim.frames, anim) };
    }
    case "attacking": {
      const anim = def.animations.attack;
      return { key: "attack", frameIndex: oneShotFrame(now, startedAt, anim.frameDurationMs * anim.frames, anim) };
    }
    default:
      return { key: "walk", frameIndex: frameIndexForLoop(now, def.animations.walk) };
  }
}

/** Draws an enemy as a pixel-art sprite for its type and current state. */
export function drawEnemyPixel(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyActor,
  now: number,
): void {
  const def = SHEETS[enemy.type];
  const sheet = getSpriteSheet(def);
  if (sheet) {
    const pose = getEnemySheetPose(enemy, now);
    const anim = def.animations[pose.key];

    ctx.save();
    ctx.globalAlpha = enemy.state === "stunned" ? 0.5 : 1;
    drawSheetFrame(ctx, sheet, def, anim, pose.frameIndex, enemy.x, enemy.y + 30, enemy.facing);
    ctx.restore();
    return;
  }

  const sprite = spriteFor(enemy, now);
  const scale = SCALE_BY_TYPE[enemy.type] ?? 4;
  ctx.save();
  ctx.globalAlpha = enemy.state === "stunned" ? 0.5 : 1;
  drawSprite(ctx, sprite, scale, enemy.x, enemy.y + 30, enemy.facing === "left");
  ctx.restore();
}
