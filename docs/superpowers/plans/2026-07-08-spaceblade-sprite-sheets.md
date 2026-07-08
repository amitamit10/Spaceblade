# Spaceblade Sprite Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current code-authored player and enemy pixel grids with a real sprite-sheet pipeline that supports explicit animation manifests, low-cost static hosting, safe runtime fallback, and full-polish animation scope.

**Architecture:** Add a typed sprite-sheet contract, a small loader/cache, pure animation helpers, and a frame renderer that draws from one PNG sheet per actor. Keep the current procedural player/enemy renderers as fallbacks until sheet-backed rendering is integrated and verified, so the game never goes blank while assets are incomplete or loading.

**Tech Stack:** TypeScript, Vite static asset imports, HTML Canvas 2D, Vitest, jsdom.

## Global Constraints

- Static frontend only; no increase in server complexity.
- Hosting cost must stay low: prefer fewer files and cache-friendly assets.
- Keep fixed internal resolution at `1280 x 720`.
- Must degrade safely when images are unavailable or canvas is headless in tests.
- No runtime guessing: frame layout, anchor points, and animation timing must be explicit in code manifests.
- No new npm dependencies unless they are strictly necessary; default plan uses none.
- Mirroring left/right should be done in code where possible to avoid duplicate art.
- Do not change gameplay rules, combat timings, waves, scoring, persistence, leaderboard behavior, DOM screens, menu navigation, or HUD structure.
- The `imeges/` folder is style reference only and must not become the runtime asset source.

---

### Task 1: Add The Sprite-Sheet Contract And Validation

**Files:**
- Create: `src/game/rendering/spriteManifest.ts`
- Create: `src/game/rendering/spriteManifest.test.ts`

**Interfaces:**
- Produces:
  - `type SpriteAnimationDef = { row: number; frames: number; frameDurationMs: number; loop: boolean; holdLastFrame?: boolean }`
  - `type SpriteSheetDef = { id: string; src: string; frameWidth: number; frameHeight: number; scale: number; anchorX: number; anchorY: number; defaultFacing: "left" | "right"; hitboxVisualOffset?: { x: number; y: number }; animations: Record<string, SpriteAnimationDef> }`
  - `type SpriteSheetLoadStatus = "ready" | "loading" | "error" | "unavailable"`
  - `validateSpriteSheetDef(def: SpriteSheetDef): string[]`
  - `validateSheetGeometry(def: SpriteSheetDef, imageWidth: number, imageHeight: number): string[]`
- Consumed later by:
  - `src/game/rendering/spriteSheetLoader.ts`
  - actor manifest files under `src/game/assets/sprites/`

- [x] **Step 1: Write the failing tests**

Create `src/game/rendering/spriteManifest.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateSpriteSheetDef, validateSheetGeometry } from "./spriteManifest";
import type { SpriteSheetDef } from "./spriteManifest";

const good: SpriteSheetDef = {
  id: "player",
  src: "/sprites/player.png",
  frameWidth: 64,
  frameHeight: 64,
  scale: 3,
  anchorX: 32,
  anchorY: 60,
  defaultFacing: "right",
  animations: {
    idle: { row: 0, frames: 4, frameDurationMs: 120, loop: true },
    slash: { row: 1, frames: 5, frameDurationMs: 70, loop: false, holdLastFrame: true },
  },
};

describe("validateSpriteSheetDef", () => {
  it("accepts a well-formed manifest", () => {
    expect(validateSpriteSheetDef(good)).toEqual([]);
  });

  it("rejects zero-sized frames and scales", () => {
    expect(
      validateSpriteSheetDef({ ...good, frameWidth: 0, scale: 0 }).length,
    ).toBeGreaterThan(0);
  });

  it("rejects anchors outside the frame", () => {
    expect(
      validateSpriteSheetDef({ ...good, anchorX: 80, anchorY: 90 }).length,
    ).toBeGreaterThan(0);
  });

  it("rejects animations with invalid row, frames, or duration", () => {
    expect(
      validateSpriteSheetDef({
        ...good,
        animations: { bad: { row: -1, frames: 0, frameDurationMs: 0, loop: true } },
      }).length,
    ).toBeGreaterThan(0);
  });
});

describe("validateSheetGeometry", () => {
  it("accepts animations that fit inside the sheet image", () => {
    expect(validateSheetGeometry(good, 256, 128)).toEqual([]);
  });

  it("rejects animations that overflow the image bounds", () => {
    expect(validateSheetGeometry(good, 128, 64).length).toBeGreaterThan(0);
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/game/rendering/spriteManifest.test.ts`

Expected: FAIL with module-not-found for `./spriteManifest`.

- [x] **Step 3: Implement the contract and validators**

Create `src/game/rendering/spriteManifest.ts`:

```ts
export type SpriteAnimationDef = {
  row: number;
  frames: number;
  frameDurationMs: number;
  loop: boolean;
  holdLastFrame?: boolean;
};

export type SpriteSheetDef = {
  id: string;
  src: string;
  frameWidth: number;
  frameHeight: number;
  scale: number;
  anchorX: number;
  anchorY: number;
  defaultFacing: "left" | "right";
  hitboxVisualOffset?: { x: number; y: number };
  animations: Record<string, SpriteAnimationDef>;
};

export type SpriteSheetLoadStatus = "ready" | "loading" | "error" | "unavailable";

export function validateSpriteSheetDef(def: SpriteSheetDef): string[] {
  const problems: string[] = [];
  if (!def.id) problems.push("id is required");
  if (!def.src) problems.push("src is required");
  if (def.frameWidth <= 0) problems.push("frameWidth must be > 0");
  if (def.frameHeight <= 0) problems.push("frameHeight must be > 0");
  if (def.scale <= 0 || !Number.isInteger(def.scale)) problems.push("scale must be a positive integer");
  if (def.anchorX < 0 || def.anchorX >= def.frameWidth) problems.push("anchorX must be within the frame");
  if (def.anchorY < 0 || def.anchorY >= def.frameHeight) problems.push("anchorY must be within the frame");
  if (Object.keys(def.animations).length === 0) problems.push("at least one animation is required");

  for (const [name, anim] of Object.entries(def.animations)) {
    if (anim.row < 0 || !Number.isInteger(anim.row)) problems.push(`${name}: row must be a non-negative integer`);
    if (anim.frames <= 0 || !Number.isInteger(anim.frames)) problems.push(`${name}: frames must be a positive integer`);
    if (anim.frameDurationMs <= 0) problems.push(`${name}: frameDurationMs must be > 0`);
  }

  return problems;
}

export function validateSheetGeometry(
  def: SpriteSheetDef,
  imageWidth: number,
  imageHeight: number,
): string[] {
  const problems = validateSpriteSheetDef(def);
  const cols = Math.floor(imageWidth / def.frameWidth);
  const rows = Math.floor(imageHeight / def.frameHeight);

  for (const [name, anim] of Object.entries(def.animations)) {
    if (anim.row >= rows) problems.push(`${name}: row ${anim.row} exceeds image row count ${rows}`);
    if (anim.frames > cols) problems.push(`${name}: frames ${anim.frames} exceed image col count ${cols}`);
  }

  return problems;
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run src/game/rendering/spriteManifest.test.ts`

Expected: PASS (6 tests).

- [x] **Step 5: Commit**

```bash
git add src/game/rendering/spriteManifest.ts src/game/rendering/spriteManifest.test.ts
git commit -m "feat: add sprite sheet manifest contract"
```

### Task 2: Add Loader, Cache, And Frame Rendering

**Files:**
- Create: `src/game/rendering/spriteSheetLoader.ts`
- Create: `src/game/rendering/spriteSheetLoader.test.ts`
- Create: `src/game/rendering/spriteSheetRenderer.ts`
- Create: `src/game/rendering/spriteSheetRenderer.test.ts`

**Interfaces:**
- Consumes:
  - `SpriteSheetDef`
  - `SpriteSheetLoadStatus`
- Produces:
  - `type LoadedSpriteSheet = { image: HTMLImageElement; width: number; height: number }`
  - `primeSpriteSheet(def: SpriteSheetDef): void`
  - `getSpriteSheet(def: SpriteSheetDef): LoadedSpriteSheet | null`
  - `getSpriteSheetStatus(def: SpriteSheetDef): SpriteSheetLoadStatus`
  - `clearSpriteSheetCache(): void`
  - `drawSheetFrame(ctx, sheet, def, animation, frameIndex, cx, yBase, facing): void`

- [x] **Step 1: Write the failing loader test**

Create `src/game/rendering/spriteSheetLoader.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { clearSpriteSheetCache, getSpriteSheet, getSpriteSheetStatus } from "./spriteSheetLoader";
import type { SpriteSheetDef } from "./spriteManifest";

const def: SpriteSheetDef = {
  id: "dummy",
  src: "/sprites/dummy.png",
  frameWidth: 32,
  frameHeight: 32,
  scale: 2,
  anchorX: 16,
  anchorY: 31,
  defaultFacing: "right",
  animations: { idle: { row: 0, frames: 1, frameDurationMs: 100, loop: true } },
};

describe("spriteSheetLoader", () => {
  it("starts unavailable/empty in headless tests until primed", () => {
    clearSpriteSheetCache();
    expect(getSpriteSheet(def)).toBeNull();
    expect(["unavailable", "loading", "error", "ready"]).toContain(getSpriteSheetStatus(def));
  });
});
```

- [x] **Step 2: Write the failing renderer test**

Create `src/game/rendering/spriteSheetRenderer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { drawSheetFrame } from "./spriteSheetRenderer";
import type { SpriteSheetDef, SpriteAnimationDef } from "./spriteManifest";

describe("drawSheetFrame", () => {
  it("returns safely when the canvas context is unavailable", () => {
    const ctx = null as unknown as CanvasRenderingContext2D;
    const sheet = { image: {} as HTMLImageElement, width: 64, height: 64 };
    const def: SpriteSheetDef = {
      id: "dummy",
      src: "/sprites/dummy.png",
      frameWidth: 32,
      frameHeight: 32,
      scale: 2,
      anchorX: 16,
      anchorY: 31,
      defaultFacing: "right",
      animations: {},
    };
    const anim: SpriteAnimationDef = { row: 0, frames: 1, frameDurationMs: 100, loop: true };
    expect(() => drawSheetFrame(ctx, sheet, def, anim, 0, 100, 200, "right")).not.toThrow();
  });
});
```

- [x] **Step 3: Run the tests to verify they fail**

Run: `npm test -- --run src/game/rendering/spriteSheetLoader.test.ts src/game/rendering/spriteSheetRenderer.test.ts`

Expected: FAIL with module-not-found errors.

- [x] **Step 4: Implement the loader**

Create `src/game/rendering/spriteSheetLoader.ts`:

```ts
import type { SpriteSheetDef, SpriteSheetLoadStatus } from "./spriteManifest";

export type LoadedSpriteSheet = {
  image: HTMLImageElement;
  width: number;
  height: number;
};

type CacheEntry = {
  status: SpriteSheetLoadStatus;
  sheet: LoadedSpriteSheet | null;
};

const cache = new Map<string, CacheEntry>();

export function primeSpriteSheet(def: SpriteSheetDef): void {
  if (cache.has(def.id) || typeof Image === "undefined") {
    if (!cache.has(def.id) && typeof Image === "undefined") {
      cache.set(def.id, { status: "unavailable", sheet: null });
    }
    return;
  }

  const image = new Image();
  cache.set(def.id, { status: "loading", sheet: null });

  image.onload = () => {
    cache.set(def.id, {
      status: "ready",
      sheet: { image, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height },
    });
  };
  image.onerror = () => {
    cache.set(def.id, { status: "error", sheet: null });
  };
  image.src = def.src;
}

export function getSpriteSheet(def: SpriteSheetDef): LoadedSpriteSheet | null {
  return cache.get(def.id)?.sheet ?? null;
}

export function getSpriteSheetStatus(def: SpriteSheetDef): SpriteSheetLoadStatus {
  return cache.get(def.id)?.status ?? (typeof Image === "undefined" ? "unavailable" : "unavailable");
}

export function clearSpriteSheetCache(): void {
  cache.clear();
}
```

- [x] **Step 5: Implement the frame renderer**

Create `src/game/rendering/spriteSheetRenderer.ts`:

```ts
import type { LoadedSpriteSheet } from "./spriteSheetLoader";
import type { SpriteAnimationDef, SpriteSheetDef } from "./spriteManifest";

export function drawSheetFrame(
  ctx: CanvasRenderingContext2D | null,
  sheet: LoadedSpriteSheet,
  def: SpriteSheetDef,
  animation: SpriteAnimationDef,
  frameIndex: number,
  cx: number,
  yBase: number,
  facing: "left" | "right",
): void {
  if (!ctx) return;

  const sx = frameIndex * def.frameWidth;
  const sy = animation.row * def.frameHeight;
  const dw = def.frameWidth * def.scale;
  const dh = def.frameHeight * def.scale;
  const baseX = Math.round(cx - def.anchorX * def.scale + (def.hitboxVisualOffset?.x ?? 0));
  const baseY = Math.round(yBase - def.anchorY * def.scale + (def.hitboxVisualOffset?.y ?? 0) - dh + def.frameHeight * def.scale);
  const shouldFlip = facing !== def.defaultFacing;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (shouldFlip) {
    ctx.translate(baseX + dw, baseY);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet.image, sx, sy, def.frameWidth, def.frameHeight, 0, 0, dw, dh);
  } else {
    ctx.drawImage(sheet.image, sx, sy, def.frameWidth, def.frameHeight, baseX, baseY, dw, dh);
  }

  ctx.restore();
}
```

- [x] **Step 6: Run the tests to verify they pass**

Run: `npm test -- --run src/game/rendering/spriteSheetLoader.test.ts src/game/rendering/spriteSheetRenderer.test.ts`

Expected: PASS (2 tests).

- [x] **Step 7: Commit**

```bash
git add src/game/rendering/spriteSheetLoader.ts src/game/rendering/spriteSheetLoader.test.ts src/game/rendering/spriteSheetRenderer.ts src/game/rendering/spriteSheetRenderer.test.ts
git commit -m "feat: add sprite sheet loader and renderer"
```

### Task 3: Add Pure Animation Selection Helpers For Sheet Playback

**Files:**
- Create: `src/game/rendering/spriteAnimator.ts`
- Create: `src/game/rendering/spriteAnimator.test.ts`

**Interfaces:**
- Produces:
  - `frameIndexForLoop(now: number, anim: SpriteAnimationDef): number`
  - `frameIndexForOneShot(progress: number, anim: SpriteAnimationDef): number`
  - `progressFromTimes(now: number, startedAt: number, totalDurationMs: number): number`

- [x] **Step 1: Write the failing tests**

Create `src/game/rendering/spriteAnimator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { frameIndexForLoop, frameIndexForOneShot, progressFromTimes } from "./spriteAnimator";

const looping = { row: 0, frames: 4, frameDurationMs: 100, loop: true };
const oneShot = { row: 1, frames: 5, frameDurationMs: 80, loop: false, holdLastFrame: true };

describe("spriteAnimator", () => {
  it("wraps looping animations", () => {
    expect(frameIndexForLoop(0, looping)).toBe(0);
    expect(frameIndexForLoop(199, looping)).toBe(1);
    expect(frameIndexForLoop(450, looping)).toBe(0);
  });

  it("clamps one-shot animations", () => {
    expect(frameIndexForOneShot(0, oneShot)).toBe(0);
    expect(frameIndexForOneShot(0.5, oneShot)).toBe(2);
    expect(frameIndexForOneShot(1, oneShot)).toBe(4);
  });

  it("converts time to bounded progress", () => {
    expect(progressFromTimes(100, 0, 400)).toBe(0.25);
    expect(progressFromTimes(999, 0, 400)).toBe(1);
    expect(progressFromTimes(0, 100, 400)).toBe(0);
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --run src/game/rendering/spriteAnimator.test.ts`

Expected: FAIL with module-not-found for `./spriteAnimator`.

- [x] **Step 3: Implement the helper**

Create `src/game/rendering/spriteAnimator.ts`:

```ts
import type { SpriteAnimationDef } from "./spriteManifest";

export function frameIndexForLoop(now: number, anim: SpriteAnimationDef): number {
  if (anim.frames <= 1 || anim.frameDurationMs <= 0) return 0;
  return Math.floor(now / anim.frameDurationMs) % anim.frames;
}

export function frameIndexForOneShot(progress: number, anim: SpriteAnimationDef): number {
  if (anim.frames <= 1) return 0;
  const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return Math.min(anim.frames - 1, Math.floor(clamped * anim.frames));
}

export function progressFromTimes(now: number, startedAt: number, totalDurationMs: number): number {
  if (totalDurationMs <= 0) return 1;
  if (now <= startedAt) return 0;
  const raw = (now - startedAt) / totalDurationMs;
  return raw < 0 ? 0 : raw > 1 ? 1 : raw;
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --run src/game/rendering/spriteAnimator.test.ts`

Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add src/game/rendering/spriteAnimator.ts src/game/rendering/spriteAnimator.test.ts
git commit -m "feat: add sprite animation helpers"
```

### Task 4: Add Actor Sheet Manifests And Player Integration With Fallback

**Files:**
- Create: `src/game/assets/sprites/player.ts`
- Create: `src/game/assets/sprites/grunt.ts`
- Create: `src/game/assets/sprites/runner.ts`
- Create: `src/game/assets/sprites/shield.ts`
- Create: `src/game/assets/sprites/tank.ts`
- Create: `src/game/assets/sprites/glitch.ts`
- Create: `src/game/assets/sprites/boss.ts`
- Create: `src/game/assets/sprites/index.ts`
- Modify: `src/game/player/playerSprites.ts`
- Modify: `src/game/scenes/mainGameScene.ts`
- Test: `src/game/player/playerSprites.test.ts`

**Interfaces:**
- Consumes:
  - `SpriteSheetDef`
  - `primeSpriteSheet`
  - `getSpriteSheet`
  - `drawSheetFrame`
  - `frameIndexForLoop`
  - `frameIndexForOneShot`
  - `progressFromTimes`
- Produces:
  - `PLAYER_SHEET: SpriteSheetDef`
  - `ALL_SPRITE_SHEETS: SpriteSheetDef[]`
  - `drawPlayerPixel(...)` upgraded to prefer sheet rendering and fallback to current baked-grid sprites when unavailable

- [x] **Step 1: Add the failing player manifest/render test**

Update `src/game/player/playerSprites.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { PLAYER_SHEET } from "../assets/sprites/player";
import { validateSpriteSheetDef } from "../rendering/spriteManifest";

it("exports a valid player sprite-sheet manifest with full animation coverage", () => {
  expect(validateSpriteSheetDef(PLAYER_SHEET)).toEqual([]);
  for (const key of ["idle", "walk", "slash", "charge", "heavy", "dodge", "parry", "hurt", "dead"]) {
    expect(PLAYER_SHEET.animations[key]).toBeDefined();
  }
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/game/player/playerSprites.test.ts`

Expected: FAIL with module-not-found for `../assets/sprites/player`.

- [x] **Step 3: Create the actor manifests**

Create `src/game/assets/sprites/player.ts`:

```ts
import playerSrc from "./player.png";
import type { SpriteSheetDef } from "../../rendering/spriteManifest";

export const PLAYER_SHEET: SpriteSheetDef = {
  id: "player",
  src: playerSrc,
  frameWidth: 96,
  frameHeight: 96,
  scale: 3,
  anchorX: 48,
  anchorY: 92,
  defaultFacing: "right",
  animations: {
    idle: { row: 0, frames: 4, frameDurationMs: 130, loop: true },
    walk: { row: 1, frames: 6, frameDurationMs: 90, loop: true },
    slash: { row: 2, frames: 5, frameDurationMs: 70, loop: false, holdLastFrame: true },
    charge: { row: 3, frames: 4, frameDurationMs: 100, loop: true },
    heavy: { row: 4, frames: 6, frameDurationMs: 75, loop: false, holdLastFrame: true },
    dodge: { row: 5, frames: 4, frameDurationMs: 65, loop: false, holdLastFrame: true },
    parry: { row: 6, frames: 4, frameDurationMs: 70, loop: false, holdLastFrame: true },
    hurt: { row: 7, frames: 2, frameDurationMs: 120, loop: false, holdLastFrame: true },
    dead: { row: 8, frames: 3, frameDurationMs: 180, loop: false, holdLastFrame: true },
  },
};
```

Create the six enemy files in the same shape, using exact required keys:

```ts
walk, windup, attack, recover, hurt, dead
```

Boss adds:

```ts
specialAttack
```

Create `src/game/assets/sprites/index.ts`:

```ts
import { PLAYER_SHEET } from "./player";
import { GRUNT_SHEET } from "./grunt";
import { RUNNER_SHEET } from "./runner";
import { SHIELD_SHEET } from "./shield";
import { TANK_SHEET } from "./tank";
import { GLITCH_SHEET } from "./glitch";
import { BOSS_SHEET } from "./boss";

export const ALL_SPRITE_SHEETS = [
  PLAYER_SHEET,
  GRUNT_SHEET,
  RUNNER_SHEET,
  SHIELD_SHEET,
  TANK_SHEET,
  GLITCH_SHEET,
  BOSS_SHEET,
];
```

- [x] **Step 4: Upgrade `drawPlayerPixel` to use the sheet when loaded**

Inside `src/game/player/playerSprites.ts`, preserve the current procedural sprites and add this flow:

```ts
const sheet = getSpriteSheet(PLAYER_SHEET);
if (sheet) {
  const animKey =
    snapshot.state === "slashing" ? "slash" :
    snapshot.state === "charging" ? "charge" :
    snapshot.state === "heavySlashing" ? "heavy" :
    snapshot.state === "dodging" ? "dodge" :
    snapshot.state === "parrying" ? "parry" :
    snapshot.state === "hurt" ? "hurt" :
    snapshot.state === "dead" ? "dead" :
    "idle";

  const anim = PLAYER_SHEET.animations[animKey];
  const frameIndex = anim.loop
    ? frameIndexForLoop(now, anim)
    : frameIndexForOneShot(
        progressFromTimes(
          now,
          snapshot.actionStartedAt,
          anim.frames * anim.frameDurationMs,
        ),
        anim,
      );

  drawSheetFrame(ctx, sheet, PLAYER_SHEET, anim, frameIndex, PLAYER_X, GROUND_Y + 30, snapshot.facing);
  return;
}

// Existing procedural fallback path stays below unchanged.
```

- [x] **Step 5: Prime sheets on scene start**

In `src/game/scenes/mainGameScene.ts`, import `ALL_SPRITE_SHEETS` and `primeSpriteSheet`, then in `start()`:

```ts
for (const def of ALL_SPRITE_SHEETS) primeSpriteSheet(def);
```

- [x] **Step 6: Run targeted tests**

Run: `npm test -- --run src/game/player/playerSprites.test.ts src/game/scenes/mainGameScene.test.ts`

Expected: PASS.

- [x] **Step 7: Run the build**

Run: `npm run build`

Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add src/game/assets/sprites src/game/player/playerSprites.ts src/game/scenes/mainGameScene.ts src/game/player/playerSprites.test.ts
git commit -m "feat: integrate player sprite sheets with fallback"
```

### Task 5: Add Enemy Sheet Integration, Full Verification, And Fallback Preservation

**Files:**
- Modify: `src/game/enemies/enemySprites.ts`
- Modify: `src/game/enemies/enemySprites.test.ts`
- Modify: `src/game/scenes/mainGameScene.ts`
- Test: `src/game/enemies/enemySprites.test.ts`

**Interfaces:**
- Consumes:
  - all enemy `SpriteSheetDef`s
  - `getSpriteSheet`
  - `drawSheetFrame`
  - `frameIndexForLoop`
  - `frameIndexForOneShot`
  - `progressFromTimes`
- Produces:
  - `drawEnemyPixel(...)` upgraded to prefer sheet rendering and fallback to current procedural sprites

- [x] **Step 1: Add the failing manifest coverage test**

Update `src/game/enemies/enemySprites.test.ts`:

```ts
import { validateSpriteSheetDef } from "../rendering/spriteManifest";
import { GRUNT_SHEET } from "../assets/sprites/grunt";
import { RUNNER_SHEET } from "../assets/sprites/runner";
import { SHIELD_SHEET } from "../assets/sprites/shield";
import { TANK_SHEET } from "../assets/sprites/tank";
import { GLITCH_SHEET } from "../assets/sprites/glitch";
import { BOSS_SHEET } from "../assets/sprites/boss";

it("exports valid enemy manifests with required animation keys", () => {
  for (const def of [GRUNT_SHEET, RUNNER_SHEET, SHIELD_SHEET, TANK_SHEET, GLITCH_SHEET, BOSS_SHEET]) {
    expect(validateSpriteSheetDef(def)).toEqual([]);
  }
  for (const key of ["walk", "windup", "attack", "recover", "hurt", "dead"]) {
    expect(BOSS_SHEET.animations[key]).toBeDefined();
  }
  expect(BOSS_SHEET.animations.specialAttack).toBeDefined();
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/game/enemies/enemySprites.test.ts`

Expected: FAIL until enemy manifests exist and export the expected names.

- [x] **Step 3: Upgrade `drawEnemyPixel` to use sprite sheets first**

In `src/game/enemies/enemySprites.ts`, add a per-type manifest map:

```ts
const SHEETS: Record<EnemyType, SpriteSheetDef> = {
  grunt: GRUNT_SHEET,
  runner: RUNNER_SHEET,
  shield: SHIELD_SHEET,
  tank: TANK_SHEET,
  glitch: GLITCH_SHEET,
  boss: BOSS_SHEET,
};
```

Then inside `drawEnemyPixel(...)`:

```ts
const def = SHEETS[enemy.type];
const sheet = getSpriteSheet(def);
if (sheet) {
  const key =
    enemy.state === "approaching" ? "walk" :
    enemy.state === "windup" ? "windup" :
    enemy.state === "attacking" ? "attack" :
    enemy.state === "recovering" ? "recover" :
    enemy.state === "stunned" ? (def.animations.stunned ? "stunned" : "hurt") :
    enemy.state === "dead" ? "dead" :
    "walk";
  const anim = def.animations[key];
  const frameIndex = anim.loop
    ? frameIndexForLoop(now, anim)
    : frameIndexForOneShot(0, anim);
  drawSheetFrame(ctx, sheet, def, anim, frameIndex, enemy.x, enemy.y + 30, enemy.facing);
  return;
}

// Existing procedural fallback path stays below unchanged.
```

- [x] **Step 4: Run targeted tests**

Run: `npm test -- --run src/game/enemies/enemySprites.test.ts src/game/scenes/mainGameScene.test.ts`

Expected: PASS.

- [x] **Step 5: Run the full suite**

Run: `npm test -- --run`

Expected: PASS.

- [x] **Step 6: Run the build**

Run: `npm run build`

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add src/game/enemies/enemySprites.ts src/game/enemies/enemySprites.test.ts src/game/assets/sprites
git commit -m "feat: integrate enemy sprite sheets with fallback"
```

### Task 6: Manual QA, Asset Drop-In, And Cleanup Gate

**Files:**
- Modify: `README.md`
- Optional cleanup after parity: `src/game/player/playerSprites.ts`, `src/game/enemies/enemySprites.ts`

**Interfaces:**
- Consumes:
  - all prior tasks
- Produces:
  - updated runtime asset instructions in README
  - decision on whether procedural fallback remains or can be retired

- [x] **Step 1: Document the sprite-sheet contract in README**

Add a short section:

```md
## Character Sprite Sheets

Runtime character art loads from `src/game/assets/sprites/`.
Each actor uses one PNG sheet plus one TypeScript manifest that defines frame size,
anchor point, scale, facing, and animation rows.
If a sheet is missing or fails to load, the game falls back to the built-in procedural renderer.
```

- [x] **Step 2: Run manual QA in the browser**

Run: `npm run dev`

Verify:
- player alignment on ground
- slash/heavy/parry readability
- enemy windup clarity
- left/right mirroring
- boss framing
- no blurry scaling
- fallback still works if a sheet path is broken

- [x] **Step 3: Keep or retire fallback intentionally**

If all actor sheets are complete and aligned, remove obsolete procedural-only code.
If not, keep fallback and ship with that explicit safety net. Do not remove fallback partially.

- [x] **Step 4: Run final verification**

Run:
- `npm test -- --run`
- `npm run build`

Expected: both PASS.

- [x] **Step 5: Commit**

```bash
git add README.md src/game/player/playerSprites.ts src/game/enemies/enemySprites.ts
git commit -m "docs: finalize sprite sheet rollout guidance"
```
