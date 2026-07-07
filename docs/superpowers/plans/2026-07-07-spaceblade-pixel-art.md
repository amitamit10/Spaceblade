# Spaceblade Pixel-Art Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Spaceblade's vector rendering with procedural pixel-art — animated sprites for the player and all six enemies, plus a pixel-tiled arena background — with no external image assets.

**Architecture:** Sprites are authored as character-grid + palette data. Each frame is baked once to an offscreen canvas (nearest-neighbor, no smoothing) and cached, then blitted with `drawImage` each frame to hold 30 FPS. Pure frame-selection helpers pick which frame to show. This is a rendering-only swap inside `mainGameScene`; gameplay, input, waves, scoring, and the leaderboard are untouched.

**Tech Stack:** TypeScript, HTML Canvas (2D + offscreen `HTMLCanvasElement`), Vitest, jsdom. No new dependencies.

## Global Constraints

- No imported bitmap/PNG files or sprite sheets; all sprite data lives in code.
- No new npm dependencies.
- Fixed internal resolution stays `1280 x 720`; player is locked to `PLAYER_X = 640`, ground at `GROUND_Y = 520`.
- Must hold stable 30 FPS with up to 6 active enemies plus the boss.
- Rendering must never throw where canvas/offscreen canvas is unavailable (jsdom): guard and no-op.
- Only touch rendering. Do not change files under `src/game/input`, `src/game/run` (except `mainGameScene` render calls), `src/game/player/playerStateMachine.ts`, `src/game/enemies/enemyLogic.ts`, `src/ui`, `src/state`, or `src/lib`.
- Reserved transparent character in every sprite grid is `.` (period).
- Run `npm test -- --run` after every task and `npm run build` after tasks that touch scene wiring. Commit after each task with the exact message given.
- Palette colors reuse the locked tokens where sensible: player cyan `#57eaff`, enemy red `#ff3f62`, effect teal `#39f6b0`, feedback yellow `#ffe45c`, UI purple `#9b5cff`, deep bg `#050812`.

---

### Task 1: Pixel Sprite Engine And Animation Helpers

**Files:**
- Create: `src/game/rendering/pixelSprite.ts`
- Create: `src/game/rendering/pixelSprite.test.ts`
- Create: `src/game/rendering/animation.ts`
- Create: `src/game/rendering/animation.test.ts`

**Interfaces:**
- Produces:
  - `type PixelSprite = { id: string; w: number; h: number; palette: Record<string, string>; rows: string[] }`
  - `validateSprite(sprite: PixelSprite): string[]` — returns a list of problems; empty means valid.
  - `bakeSprite(sprite: PixelSprite, scale: number): HTMLCanvasElement | null` — baked canvas or null when headless.
  - `drawSprite(ctx: CanvasRenderingContext2D, sprite: PixelSprite, scale: number, cx: number, yBase: number, flipX: boolean): void`
  - `clearSpriteCache(): void`
  - `frameForTime(now: number, frameMs: number, frameCount: number): number`
  - `frameForProgress(progress: number, frameCount: number): number`

- [ ] **Step 1: Write the failing tests for animation helpers**

Create `src/game/rendering/animation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { frameForTime, frameForProgress } from "./animation";

describe("frameForTime", () => {
  it("advances one frame per frameMs and wraps", () => {
    expect(frameForTime(0, 100, 3)).toBe(0);
    expect(frameForTime(150, 100, 3)).toBe(1);
    expect(frameForTime(250, 100, 3)).toBe(2);
    expect(frameForTime(300, 100, 3)).toBe(0); // wraps
  });

  it("returns 0 for a single-frame animation", () => {
    expect(frameForTime(9999, 100, 1)).toBe(0);
  });

  it("returns 0 when frameCount is 0", () => {
    expect(frameForTime(500, 100, 0)).toBe(0);
  });
});

describe("frameForProgress", () => {
  it("maps progress across frames and clamps the ends", () => {
    expect(frameForProgress(0, 4)).toBe(0);
    expect(frameForProgress(0.5, 4)).toBe(2);
    expect(frameForProgress(1, 4)).toBe(3); // clamped to last
    expect(frameForProgress(1.5, 4)).toBe(3);
    expect(frameForProgress(-0.5, 4)).toBe(0);
  });

  it("returns 0 for a single-frame animation", () => {
    expect(frameForProgress(0.8, 1)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the animation tests to verify they fail**

Run: `npm test -- --run src/game/rendering/animation.test.ts`
Expected: FAIL — cannot find module `./animation`.

- [ ] **Step 3: Implement the animation helpers**

Create `src/game/rendering/animation.ts`:

```ts
/** Which frame of a looping animation to show at time `now`. */
export function frameForTime(now: number, frameMs: number, frameCount: number): number {
  if (frameCount <= 1 || frameMs <= 0) return 0;
  const idx = Math.floor(now / frameMs) % frameCount;
  return idx < 0 ? idx + frameCount : idx;
}

/** Which frame of a one-shot animation to show for progress in [0, 1]. */
export function frameForProgress(progress: number, frameCount: number): number {
  if (frameCount <= 1) return 0;
  const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return Math.min(frameCount - 1, Math.floor(clamped * frameCount));
}
```

- [ ] **Step 4: Run the animation tests to verify they pass**

Run: `npm test -- --run src/game/rendering/animation.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the failing tests for the sprite engine**

Create `src/game/rendering/pixelSprite.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateSprite } from "./pixelSprite";
import type { PixelSprite } from "./pixelSprite";

const good: PixelSprite = {
  id: "good",
  w: 3,
  h: 2,
  palette: { a: "#fff", b: "#000" },
  rows: ["a.b", "b.a"],
};

describe("validateSprite", () => {
  it("returns no problems for a well-formed sprite", () => {
    expect(validateSprite(good)).toEqual([]);
  });

  it("flags the wrong number of rows", () => {
    const bad = { ...good, rows: ["a.b"] };
    expect(validateSprite(bad).length).toBeGreaterThan(0);
  });

  it("flags a row whose width does not match w", () => {
    const bad = { ...good, rows: ["a.b", "ab"] };
    expect(validateSprite(bad).length).toBeGreaterThan(0);
  });

  it("flags an unknown palette character", () => {
    const bad = { ...good, rows: ["a.b", "b.z"] };
    expect(validateSprite(bad).length).toBeGreaterThan(0);
  });

  it("treats '.' as transparent and always valid", () => {
    const dots: PixelSprite = { id: "dots", w: 2, h: 2, palette: {}, rows: ["..", ".."] };
    expect(validateSprite(dots)).toEqual([]);
  });
});
```

- [ ] **Step 6: Run the sprite tests to verify they fail**

Run: `npm test -- --run src/game/rendering/pixelSprite.test.ts`
Expected: FAIL — cannot find module `./pixelSprite`.

- [ ] **Step 7: Implement the sprite engine**

Create `src/game/rendering/pixelSprite.ts`:

```ts
export type PixelSprite = {
  id: string;
  w: number;
  h: number;
  palette: Record<string, string>;
  rows: string[];
};

const TRANSPARENT = ".";

/** Returns a list of structural problems with a sprite; empty means valid. */
export function validateSprite(sprite: PixelSprite): string[] {
  const problems: string[] = [];
  if (sprite.rows.length !== sprite.h) {
    problems.push(`${sprite.id}: expected ${sprite.h} rows, got ${sprite.rows.length}`);
  }
  sprite.rows.forEach((row, y) => {
    if (row.length !== sprite.w) {
      problems.push(`${sprite.id}: row ${y} width ${row.length} != ${sprite.w}`);
    }
    for (const ch of row) {
      if (ch !== TRANSPARENT && !(ch in sprite.palette)) {
        problems.push(`${sprite.id}: row ${y} uses unknown char '${ch}'`);
      }
    }
  });
  return problems;
}

const cache = new Map<string, HTMLCanvasElement>();

/** Bakes a sprite to an offscreen canvas at the given integer scale (cached). */
export function bakeSprite(sprite: PixelSprite, scale: number): HTMLCanvasElement | null {
  const key = `${sprite.id}@${scale}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  try {
    canvas = document.createElement("canvas");
    canvas.width = sprite.w * scale;
    canvas.height = sprite.h * scale;
    ctx = canvas.getContext("2d");
  } catch {
    return null;
  }
  if (!ctx) return null;

  for (let y = 0; y < sprite.rows.length; y += 1) {
    const row = sprite.rows[y];
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      if (ch === TRANSPARENT) continue;
      const color = sprite.palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  cache.set(key, canvas);
  return canvas;
}

/**
 * Blits a sprite centered horizontally at `cx` with its bottom edge at `yBase`.
 * `flipX` mirrors horizontally (still nearest-neighbor). No-op when headless.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: PixelSprite,
  scale: number,
  cx: number,
  yBase: number,
  flipX: boolean,
): void {
  const baked = bakeSprite(sprite, scale);
  if (!baked) return;
  const w = sprite.w * scale;
  const h = sprite.h * scale;
  const x = Math.round(cx - w / 2);
  const y = Math.round(yBase - h);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flipX) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(baked, 0, 0);
  } else {
    ctx.drawImage(baked, x, y);
  }
  ctx.restore();
}

/** Clears the bake cache (tests / theme swaps). */
export function clearSpriteCache(): void {
  cache.clear();
}
```

- [ ] **Step 8: Run the sprite tests to verify they pass**

Run: `npm test -- --run src/game/rendering/pixelSprite.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 9: Run the full suite and build**

Run: `npm test -- --run`
Expected: all suites pass.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/game/rendering/pixelSprite.ts src/game/rendering/pixelSprite.test.ts src/game/rendering/animation.ts src/game/rendering/animation.test.ts
git commit -m "feat: add pixel sprite engine and animation helpers"
```

---

### Task 2: Player Pixel Sprites

**Files:**
- Create: `src/game/player/playerSprites.ts`
- Create: `src/game/player/playerSprites.test.ts`
- Modify: `src/game/scenes/mainGameScene.ts` (swap `drawPlayer` for `drawPlayerPixel`)
- Delete: `src/game/player/playerRenderer.ts`

**Interfaces:**
- Consumes: `PixelSprite`, `validateSprite`, `drawSprite` from `pixelSprite.ts`; `frameForTime`, `frameForProgress` from `animation.ts`; `PlayerSnapshot` from `playerStateMachine.ts`; `playerConfig` from `playerConfig.ts`; `PLAYER_X`, `GROUND_Y` from `constants.ts`.
- Produces: `drawPlayerPixel(ctx: CanvasRenderingContext2D, snapshot: PlayerSnapshot, now: number): void`, and `PLAYER_SPRITES: PixelSprite[]` (all authored player frames, exported for the validation test).

- [ ] **Step 1: Write the failing test**

Create `src/game/player/playerSprites.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/game/player/playerSprites.test.ts`
Expected: FAIL — cannot find module `./playerSprites`.

- [ ] **Step 3: Implement the player sprites and renderer**

Create `src/game/player/playerSprites.ts`. Author a compact pixel ninja (roughly 12 wide × 16 tall) with a palette for body/cyan trim/skin/blade, one sprite per pose plus a two-frame idle. Use `PLAYER_SCALE = 4`. The exact grids are the implementer's craft, but the file MUST export `PLAYER_SPRITES` (all frames) and `drawPlayerPixel`. Skeleton to fill:

```ts
import type { PixelSprite } from "../rendering/pixelSprite";
import { drawSprite } from "../rendering/pixelSprite";
import { frameForTime, frameForProgress } from "../rendering/animation";
import type { PlayerSnapshot } from "./playerStateMachine";
import { playerConfig } from "./playerConfig";
import { PLAYER_X, GROUND_Y } from "../constants";

const PLAYER_SCALE = 4;

// Palette shared by all player frames.
const P = {
  d: "#0b1b2e", // dark suit
  c: "#57eaff", // cyan trim
  s: "#ffd9b3", // skin
  b: "#d6f7ff", // blade
  h: "#eaffff", // hair highlight
};

// Author each pose as a PixelSprite. Keep w/h consistent (e.g. 12 x 16).
// '.' = transparent. Example idle frame (fill the rest to taste):
const idle0: PixelSprite = {
  id: "player-idle-0",
  w: 12,
  h: 16,
  palette: P,
  rows: [
    "....hh......",
    "...hssh.....",
    "...hssh.....",
    "....dd......",
    "...dddd.....",
    "..dcdcdd....",
    "..dcdcdd..bb",
    "..dddddd.bb.",
    "...dddd.bb..",
    "...d..d.....",
    "...d..d.....",
    "..dd..dd....",
    "..d....d....",
    "..d....d....",
    ".dd....dd...",
    "............",
  ],
};

// idle1 (subtle bob), slash, charge, heavy, dodge, parry, hurt, dead ...
// Author the remaining poses following the same width/height and palette.

export const PLAYER_SPRITES: PixelSprite[] = [idle0 /*, idle1, slash, ... */];

const IDLE = [idle0 /*, idle1 */];

export function drawPlayerPixel(
  ctx: CanvasRenderingContext2D,
  snapshot: PlayerSnapshot,
  now: number,
): void {
  const flip = snapshot.facing === "left";
  const elapsed = now - snapshot.actionStartedAt;
  let sprite: PixelSprite;

  switch (snapshot.state) {
    case "slashing":
      sprite = pickProgress("slash", elapsed / playerConfig.quickSlashActiveMs);
      break;
    case "heavySlashing":
      sprite = pickProgress("heavy", elapsed / playerConfig.heavySlashActiveMs);
      break;
    case "charging":
      sprite = byId("player-charge");
      break;
    case "dodging":
      sprite = byId("player-dodge");
      break;
    case "parrying":
      sprite = byId("player-parry");
      break;
    case "hurt":
      sprite = byId("player-hurt");
      break;
    case "dead":
      sprite = byId("player-dead");
      break;
    default:
      sprite = IDLE[frameForTime(now, 380, IDLE.length)];
      break;
  }

  drawSprite(ctx, sprite, PLAYER_SCALE, PLAYER_X, GROUND_Y + 30, flip);
}

function byId(id: string): PixelSprite {
  return PLAYER_SPRITES.find((s) => s.id === id) ?? PLAYER_SPRITES[0];
}

function pickProgress(prefix: string, progress: number): PixelSprite {
  const frames = PLAYER_SPRITES.filter((s) => s.id.startsWith(`player-${prefix}`));
  if (frames.length === 0) return PLAYER_SPRITES[0];
  return frames[frameForProgress(progress, frames.length)];
}
```

Author all referenced sprites (`player-charge`, `player-dodge`, `player-parry`, `player-hurt`, `player-dead`, and at least one `player-slash-*` and `player-heavy-*` frame) so `byId`/`pickProgress` always resolve. Keep every grid `12 x 16` with palette `P`.

- [ ] **Step 4: Run the player sprite test to verify it passes**

Run: `npm test -- --run src/game/player/playerSprites.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Swap the scene to use the pixel player and delete the vector renderer**

In `src/game/scenes/mainGameScene.ts`:
- Replace the import `import { drawPlayer } from "../player/playerRenderer";` with `import { drawPlayerPixel } from "../player/playerSprites";`.
- In `render`, replace `drawPlayer(context, player.getSnapshot(), now);` with `drawPlayerPixel(context, player.getSnapshot(), now);`.

Delete the now-unused file:

```bash
git rm src/game/player/playerRenderer.ts
```

(The slash arc, charge glow, dodge trail, and parry flash are already emitted by the effect system in `gameLoop.ts`, so removing the vector player loses no feedback.)

- [ ] **Step 6: Run the full suite and build**

Run: `npm test -- --run`
Expected: all suites pass (no references to `playerRenderer` remain).
Run: `npm run build`
Expected: build succeeds with no unused-import or missing-module errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: render player as pixel-art sprites"
```

---

### Task 3: Enemy Pixel Sprites

**Files:**
- Create: `src/game/enemies/enemySprites.ts`
- Create: `src/game/enemies/enemySprites.test.ts`
- Modify: `src/game/scenes/mainGameScene.ts` (swap `drawEnemyBody` for `drawEnemyPixel`)

**Interfaces:**
- Consumes: `PixelSprite`, `validateSprite`, `drawSprite` from `pixelSprite.ts`; `frameForTime` from `animation.ts`; `EnemyActor` from `enemyFactory.ts`.
- Produces: `drawEnemyPixel(ctx: CanvasRenderingContext2D, enemy: EnemyActor, now: number): void`, and `ENEMY_SPRITES: PixelSprite[]` (all authored enemy frames).

- [ ] **Step 1: Write the failing test**

Create `src/game/enemies/enemySprites.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/game/enemies/enemySprites.test.ts`
Expected: FAIL — cannot find module `./enemySprites`.

- [ ] **Step 3: Implement the enemy sprites and renderer**

Create `src/game/enemies/enemySprites.ts`. Author a distinct silhouette per type with a `<type>-walk-0`, `<type>-walk-1`, and `<type>-windup` sprite id. Skeleton to fill:

```ts
import type { PixelSprite } from "../rendering/pixelSprite";
import { drawSprite } from "../rendering/pixelSprite";
import { frameForTime } from "../rendering/animation";
import type { EnemyActor } from "./enemyFactory";
import type { EnemyType } from "../../app/types";

const ENEMY_SCALE = 4;

const SCALE_BY_TYPE: Record<EnemyType, number> = {
  grunt: 4,
  runner: 4,
  shield: 4,
  tank: 5,
  glitch: 4,
  boss: 7,
};

// Author walk-0 / walk-1 / windup for each of the six types.
// Example grunt walk-0 (fill the others to taste, keep per-type w/h consistent):
const gruntWalk0: PixelSprite = {
  id: "grunt-walk-0",
  w: 12,
  h: 16,
  palette: { r: "#ff3f62", d: "#7a1020", e: "#ffd9b3" },
  rows: [
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
  ],
};

export const ENEMY_SPRITES: PixelSprite[] = [gruntWalk0 /*, ...all others */];

function spriteFor(enemy: EnemyActor, now: number): PixelSprite {
  const t = enemy.type;
  if (enemy.state === "windup") return byId(`${t}-windup`, t);
  const walk = ENEMY_SPRITES.filter((s) => s.id.startsWith(`${t}-walk`));
  const frames = walk.length > 0 ? walk : ENEMY_SPRITES.filter((s) => s.id.startsWith(`${t}-`));
  return frames[frameForTime(now, 220, frames.length)];
}

function byId(id: string, type: EnemyType): PixelSprite {
  return (
    ENEMY_SPRITES.find((s) => s.id === id) ??
    ENEMY_SPRITES.find((s) => s.id.startsWith(`${type}-`)) ??
    ENEMY_SPRITES[0]
  );
}

export function drawEnemyPixel(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyActor,
  now: number,
): void {
  const sprite = spriteFor(enemy, now);
  const scale = SCALE_BY_TYPE[enemy.type] ?? ENEMY_SCALE;
  ctx.save();
  ctx.globalAlpha = enemy.state === "stunned" ? 0.5 : 1;
  drawSprite(ctx, sprite, scale, enemy.x, enemy.y + 30, enemy.facing === "left");
  ctx.restore();
}
```

Author `walk-0`, `walk-1`, and `windup` for all six types (`grunt`, `runner`, `shield`, `tank`, `glitch`, `boss`). Give the shield a visible shield block, the tank a bulky armored body, the glitch a purple palette, and the boss a large menacing silhouette. Keep each type's frames at a consistent `w`/`h`.

- [ ] **Step 4: Run the enemy sprite test to verify it passes**

Run: `npm test -- --run src/game/enemies/enemySprites.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Swap the scene to use the pixel enemies**

In `src/game/scenes/mainGameScene.ts`:
- Add `import { drawEnemyPixel } from "../enemies/enemySprites";`.
- In `render`, replace the `drawEnemyBody(context, enemy);` call with `drawEnemyPixel(context, enemy, now);`.
- Delete the now-unused local `drawEnemyBody` function and the `ENEMY_COLORS` constant from `mainGameScene.ts`.

- [ ] **Step 6: Run the full suite and build**

Run: `npm test -- --run`
Expected: all suites pass.
Run: `npm run build`
Expected: build succeeds (no unused `drawEnemyBody`/`ENEMY_COLORS`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: render enemies as pixel-art sprites"
```

---

### Task 4: Pixel-Tiled Background

**Files:**
- Create: `src/game/rendering/pixelBackground.ts`
- Create: `src/game/rendering/pixelBackground.test.ts`
- Modify: `src/game/scenes/mainGameScene.ts` (swap `drawBackground` for `drawPixelBackground`)

**Interfaces:**
- Consumes: `GAME_WIDTH`, `GAME_HEIGHT`, `GROUND_Y`, `LEFT_SPAWN_X`, `RIGHT_SPAWN_X` from `constants.ts`; `SectorTheme` from `backgroundLayers.ts`.
- Produces: `drawPixelBackground(ctx: CanvasRenderingContext2D, theme: SectorTheme, now: number): void`, and `pixelBackgroundThemes(): SectorTheme[]` (the themes it supports, for the test).

- [ ] **Step 1: Write the failing test**

Create `src/game/rendering/pixelBackground.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pixelBackgroundThemes, drawPixelBackground } from "./pixelBackground";

describe("pixel background", () => {
  it("supports all three sector themes", () => {
    expect(pixelBackgroundThemes()).toEqual([
      "neonCity",
      "industrialSector",
      "corruptedCore",
    ]);
  });

  it("does not throw when given a null-safe 2d context stub", () => {
    // Minimal stub: drawPixelBackground must only call methods that exist here.
    const calls: string[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === "canvas") return { width: 1280, height: 720 };
          if (prop === "createLinearGradient") {
            return () => ({ addColorStop: () => calls.push("stop") });
          }
          return () => calls.push(String(prop));
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    expect(() => drawPixelBackground(ctx, "neonCity", 0)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/game/rendering/pixelBackground.test.ts`
Expected: FAIL — cannot find module `./pixelBackground`.

- [ ] **Step 3: Implement the pixel background**

Create `src/game/rendering/pixelBackground.ts`. Draw a banded pixel sky, three parallax rows of blocky buildings with lit-window pixels, a pixel-tiled floor with an accent edge line, twinkling stars, and the two spawn-gate glows. Use only `fillRect`, `fillStyle`, `createLinearGradient`, `save`, `restore`, `globalAlpha`, and reads of `ctx.canvas`. Skeleton:

```ts
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  LEFT_SPAWN_X,
  RIGHT_SPAWN_X,
} from "../constants";
import type { SectorTheme } from "./backgroundLayers";

type Palette = {
  skyTop: string;
  skyBottom: string;
  far: string;
  mid: string;
  near: string;
  window: string;
  accent: string;
  floor: string;
};

const THEMES: Record<SectorTheme, Palette> = {
  neonCity: { skyTop: "#0b1a30", skyBottom: "#050812", far: "#12213d", mid: "#1a2f52", near: "#0e1b33", window: "#57eaff", accent: "#57eaff", floor: "#0a1526" },
  industrialSector: { skyTop: "#1c1220", skyBottom: "#070409", far: "#2a1a2e", mid: "#3a2438", near: "#1c1018", window: "#ff8a3f", accent: "#ff8a3f", floor: "#170d14" },
  corruptedCore: { skyTop: "#1a0b2e", skyBottom: "#070310", far: "#2a1150", mid: "#3d1b6e", near: "#180a2e", window: "#c58bff", accent: "#9b5cff", floor: "#120826" },
};

const PX = 8; // background pixel size

export function pixelBackgroundThemes(): SectorTheme[] {
  return ["neonCity", "industrialSector", "corruptedCore"];
}

export function drawPixelBackground(
  ctx: CanvasRenderingContext2D,
  theme: SectorTheme,
  now: number,
): void {
  const p = THEMES[theme];

  const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, p.skyTop);
  sky.addColorStop(1, p.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawStars(ctx, p.window, now);
  drawBuildings(ctx, p.far, p.window, 150, now * 0.004, 90, 0.3);
  drawBuildings(ctx, p.mid, p.window, 190, now * 0.008, 120, 0.55);
  drawBuildings(ctx, p.near, p.window, 240, now * 0.016, 150, 0.85);
  drawFloor(ctx, p);
  drawSpawnGate(ctx, LEFT_SPAWN_X, p.accent, now);
  drawSpawnGate(ctx, RIGHT_SPAWN_X, p.accent, now);
}

function drawStars(ctx: CanvasRenderingContext2D, color: string, now: number): void {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 40; i += 1) {
    const x = (i * 137) % GAME_WIDTH;
    const y = (i * 53) % (GROUND_Y - 200);
    ctx.globalAlpha = 0.2 + 0.2 * Math.abs(Math.sin(now / 700 + i));
    ctx.fillRect(x, y, PX / 2, PX / 2);
  }
  ctx.restore();
}

function drawBuildings(
  ctx: CanvasRenderingContext2D,
  color: string,
  windowColor: string,
  maxH: number,
  offset: number,
  spacing: number,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const baseY = GROUND_Y - 10;
  for (let i = -1; i * spacing < GAME_WIDTH + spacing; i += 1) {
    const seed = i * 41;
    const h = 60 + Math.abs(Math.sin(seed)) * maxH;
    const w = spacing * 0.7;
    const x = Math.round(((i * spacing - offset) % (GAME_WIDTH + spacing)) - spacing);
    ctx.fillStyle = color;
    ctx.fillRect(x, baseY - h, w, h);
    ctx.fillStyle = windowColor;
    for (let wy = baseY - h + PX * 2; wy < baseY - PX; wy += PX * 2) {
      for (let wx = x + PX; wx < x + w - PX; wx += PX * 2) {
        if ((wx + wy + seed) % 3 === 0) ctx.fillRect(wx, wy, PX, PX);
      }
    }
  }
  ctx.restore();
}

function drawFloor(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.floor;
  ctx.fillRect(0, GROUND_Y + 30, GAME_WIDTH, GAME_HEIGHT - GROUND_Y - 30);
  ctx.fillStyle = p.accent;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, GROUND_Y + 30, GAME_WIDTH, PX / 2);
  ctx.globalAlpha = 1;
}

function drawSpawnGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  accent: string,
  now: number,
): void {
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.25 * Math.sin(now / 260);
  ctx.fillStyle = accent;
  ctx.fillRect(x - 26, GROUND_Y - 96, PX / 2, 128);
  ctx.fillRect(x + 26, GROUND_Y - 96, PX / 2, 128);
  ctx.restore();
}
```

- [ ] **Step 4: Run the background test to verify it passes**

Run: `npm test -- --run src/game/rendering/pixelBackground.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Swap the scene to use the pixel background**

In `src/game/scenes/mainGameScene.ts`:
- Replace `import { drawBackground } from "../rendering/backgroundLayers";` with `import { drawPixelBackground } from "../rendering/pixelBackground";` (keep the `themeForWave` import from `gameLoop.ts` and any `SectorTheme` type import if present).
- In `render`, replace `drawBackground(context, themeForWave(controller.state.wave), now);` with `drawPixelBackground(context, themeForWave(controller.state.wave), now);`.

Leave `backgroundLayers.ts` in place — `pixelBackground.ts` still imports its `SectorTheme` type.

- [ ] **Step 6: Run the full suite and build**

Run: `npm test -- --run`
Expected: all suites pass.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: render arena as pixel-tiled background"
```

---

### Task 5: Polish, Verify, And Redeploy

**Files:**
- Modify (tuning only): `src/game/player/playerSprites.ts`, `src/game/enemies/enemySprites.ts`, `src/game/rendering/pixelBackground.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–4. Produces no new public API.

- [ ] **Step 1: Manual visual QA**

Run: `npm run dev`
Open http://localhost:5173 and play a run. Confirm:
- Player shows a distinct pose per action (idle bob, slash, charge, heavy, dodge, parry, hurt).
- Enemies walk (2-frame) while approaching and switch to the windup pose with their red telegraph.
- Shield shows its shield, tank is bulky, glitch is purple, boss is large.
- Background reads as pixel-art per sector (neon city → industrial → corrupted core across waves).
- HUD, effects, camera shake, and game over / victory banners still work.
- Frame rate stays smooth with a full wave on screen.

Record any grids that read poorly and adjust the sprite `rows` (data-only edits; no logic changes).

- [ ] **Step 2: Re-run the sprite validation and full suite**

Run: `npm test -- --run`
Expected: all suites pass, including the sprite-validation sweeps (any grid you edited still matches its declared `w`/`h` and palette).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit any tuning**

```bash
git add -A
git commit -m "polish: tune pixel-art sprites and background"
```

- [ ] **Step 5: Push and redeploy**

```bash
git push origin main
vercel --prod --yes --scope amits-projects-79cd529f
```

Expected: deployment reaches READY. Verify the production URL loads (HTTP 200) and shows the pixel-art game.

---

## Final Acceptance

- [ ] `npm test -- --run` passes (new suites: animation, pixelSprite, playerSprites, enemySprites, pixelBackground).
- [ ] `npm run build` passes.
- [ ] Player, all six enemies, and the arena render as pixel-art in the browser.
- [ ] Player pose changes per action state; enemies animate a walk and show a windup pose.
- [ ] 30 FPS holds with a full wave on screen.
- [ ] No regression in gameplay, HUD, screens, effects, or leaderboard.
- [ ] `playerRenderer.ts` is deleted; `drawEnemyBody`/`ENEMY_COLORS` removed from `mainGameScene.ts`.
- [ ] Production redeploy is live.
