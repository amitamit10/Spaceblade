# Spaceblade Pixel-Art Rendering — Design Spec

**Date:** 2026-07-07
**Status:** Approved for planning
**Depends on:** Spaceblade v1 (all 9 tasks complete, deployed)

## Goal

Replace Spaceblade's procedural vector rendering (triangle player, rectangle
enemies, gradient background) with a cohesive **procedural pixel-art** look:
animated pixel-grid sprites for the player and all six enemy types, plus a
pixel-tiled arena background. No external image assets — sprites are authored as
data in code, preserving the project's zero-assets architecture and Vercel
static deploy.

This is a **rendering-only** change. Combat, waves, input parsing, scoring,
persistence, and the leaderboard are untouched.

## Non-Goals

- No imported bitmap/PNG sprite files, sprite sheets, or asset pipeline.
- No changes to gameplay rules, timing constants, or run structure.
- No changes to the DOM screen flow, HUD data, or leaderboard.
- Not aiming for pixel-perfect parity with the mockup renders; aiming for a
  clearly retro, readable pixel-art style that we iterate on after seeing it live.

## Constraints

- Must hold the stable 30 FPS target with up to 6 active enemies (plus boss).
- Must degrade safely where a 2D canvas / offscreen canvas is unavailable
  (jsdom tests): rendering is guarded and never throws.
- Fixed internal resolution stays `1280 x 720`.
- Only existing dependencies (no new libraries).

## Architecture

A small pixel-art rendering layer sits between the game state and the canvas,
swapped into `mainGameScene` in place of the current vector draws. Sprites are
authored as compact character grids with a color palette, **baked once** to
offscreen canvases (nearest-neighbor, image smoothing disabled), and then blitted
with `drawImage` each frame. Baking avoids per-pixel fills every frame, keeping
per-frame cost to a handful of `drawImage` calls.

```
game state (player snapshot, enemy actors, wave)
        │
        ▼
pixel renderers (playerSprites, enemySprites, pixelBackground)
        │  select frame via animation.ts
        ▼
pixelSprite.drawSprite  ──uses──►  bake cache (offscreen canvas per sprite id)
        │
        ▼
   main canvas (1280 x 720)
```

## Components

### 1. `src/game/rendering/pixelSprite.ts`

The sprite data model and renderer.

```ts
export type PixelSprite = {
  id: string;              // unique cache key
  w: number;               // grid width in pixels
  h: number;               // grid height in pixels
  palette: Record<string, string>; // char -> CSS color ('.' is reserved = transparent)
  rows: string[];          // h strings, each w chars
};

// Validates rows length/width and that every non-'.' char is in the palette.
export function validateSprite(sprite: PixelSprite): string[]; // returns problems (empty = ok)

// Bakes a sprite to an offscreen canvas at the given integer pixel scale, cached by id+scale.
// Returns null when canvas is unavailable (headless).
export function bakeSprite(sprite: PixelSprite, scale: number): HTMLCanvasElement | null;

// Blits a baked sprite centered horizontally at (x) with its base at (yBase), optionally flipped.
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: PixelSprite,
  scale: number,
  cx: number,
  yBase: number,
  flipX: boolean,
): void;

export function clearSpriteCache(): void; // for tests / theme swaps
```

- `'.'` is always transparent regardless of palette.
- The bake cache is a module-level `Map<string, HTMLCanvasElement>` keyed by
  `${id}@${scale}`.
- `drawSprite` positions a sprite by its horizontal center and its bottom edge
  (`yBase`) so sprites sit on the ground line naturally; flipping is done by a
  negative-scale `drawImage` (still nearest-neighbor).

### 2. `src/game/rendering/animation.ts`

Pure frame-selection helpers (no canvas), fully unit tested.

```ts
// Looping animations (idle, walk): which frame at time `now`.
export function frameForTime(now: number, frameMs: number, frameCount: number): number;

// One-shot animations (slash, heavy): map progress 0..1 to a frame, clamped.
export function frameForProgress(progress: number, frameCount: number): number;
```

### 3. `src/game/player/playerSprites.ts`

Pixel grids + frame sets for each `PlayerStateName` and a draw entry point.

```ts
export function drawPlayerPixel(
  ctx: CanvasRenderingContext2D,
  snapshot: PlayerSnapshot,
  now: number,
): void;
```

- Poses: `idle` (2-frame breathing loop), `slashing` (progress-driven swing),
  `charging` (glow pose), `heavySlashing` (progress swing), `dodging` (lean +
  afterimage handled by existing dash effect), `parrying` (guard pose), `hurt`
  (flash/red tint), `dead` (collapsed). Facing flips the sprite.
- Cyan-forward palette matching the player color token.

### 4. `src/game/enemies/enemySprites.ts`

Pixel grids for the six enemy types, each with `approach` (2-frame walk),
`windup`, and `stunned` poses, plus a draw entry point.

```ts
export function drawEnemyPixel(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyActor,
  now: number,
): void;
```

- Per-type silhouettes and palettes: grunt (small red), runner (lean magenta),
  shield (bulky with a shield block, drawn when `shielded`), tank (large armored,
  ~1.4x scale), glitch (purple, jitter offset), boss (large, ~1.8x scale).
- Stunned pose renders at reduced alpha; existing telegraphs still draw on top.

### 5. `src/game/rendering/pixelBackground.ts`

Pixel-tiled arena per theme, replacing the smooth gradient/silhouette draw.

```ts
export function drawPixelBackground(
  ctx: CanvasRenderingContext2D,
  theme: SectorTheme,
  now: number,
): void;
```

- Banded pixel sky, three parallax layers of blocky buildings with lit windows,
  a pixel-tiled floor with an accent edge line, twinkling star pixels, and the
  two spawn-gate glows. Parallax offset derived from time (player is centered).
- Reuses the existing `SectorTheme` union and per-theme accent colors.

## Data Flow

`mainGameScene.render()` changes from vector calls to:

1. `drawPixelBackground(ctx, themeForWave(wave), now)`
2. for each living enemy: existing `drawEnemyTelegraph(...)` then `drawEnemyPixel(...)`
3. `drawPlayerPixel(ctx, snapshot, now)`
4. `effects.draw(...)` (unchanged — glow effects render over pixels)
5. camera restore + `drawCanvasHud(...)` (unchanged)

The old `drawEnemyBody` (in `mainGameScene`) and `drawPlayer`
(`playerRenderer.ts`) are retired; `playerRenderer`'s effect-only bits (slash
arc, charge glow, dodge trail, parry ring) either move into the effects system
already covering them or remain as an optional glow overlay. The effect system
(`effects.ts`) already handles slash arc, shockwave, dash trail, parry flash, and
hit spark, so `playerRenderer.ts` is removed and the scene relies on
`drawPlayerPixel` + the effect system.

## Error Handling / Headless Safety

- `bakeSprite` and `drawSprite` no-op (return null / early return) when
  `document.createElement("canvas").getContext("2d")` is unavailable or throws,
  mirroring the scene's existing headless guard. Rendering never throws in tests.
- `validateSprite` is called in unit tests over all authored sprites; a malformed
  grid fails the test rather than corrupting output at runtime.

## Testing Strategy

Unit tested (pure / data):

- `animation.frameForTime` — wraps correctly, handles `frameCount` 1 and edges.
- `animation.frameForProgress` — clamps 0 and 1 to first/last frame, maps middle.
- `validateSprite` — flags wrong row width, wrong row count, unknown palette char;
  passes for well-formed sprites.
- A sweep test asserts **every** authored player and enemy sprite passes
  `validateSprite`.

Manual (browser):

- `npm run dev`, play a run: confirm player poses change per action, enemies walk
  and telegraph, background reads as pixel-art per sector, 30 FPS holds, and the
  game over / victory banners still show.

## Rollout / Phases (for the plan)

1. **Sprite engine** — `pixelSprite.ts` + `animation.ts` + tests.
2. **Player sprites** — `playerSprites.ts`, retire `playerRenderer.ts`, wire scene.
3. **Enemy sprites** — `enemySprites.ts`, retire `drawEnemyBody`, wire scene.
4. **Pixel background** — `pixelBackground.ts`, wire scene, retire gradient bg use.
5. **Polish + verify** — tune grids/palettes, run full suite + build, manual QA,
   redeploy.

Each phase: keep the game runnable, run `npm test -- --run` and `npm run build`,
commit with a clear message.

## Success Criteria

- Player, all six enemies, and the arena render as pixel-art in the browser.
- Player shows a distinct pose per action state; enemies animate an approach walk
  and a windup pose.
- Stable 30 FPS with a full wave on screen.
- `npm test -- --run` and `npm run build` pass; deploy succeeds.
- No regression in gameplay, HUD, screens, or leaderboard behavior.
