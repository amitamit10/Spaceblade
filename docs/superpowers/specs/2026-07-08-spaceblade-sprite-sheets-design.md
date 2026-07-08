# Spaceblade Sprite-Sheet Asset Pipeline — Design Spec

**Date:** 2026-07-08
**Status:** Approved for planning
**Depends on:** Spaceblade v1 gameplay complete, procedural pixel renderer shipped

## Goal

Replace the current code-authored pixel-grid character art with a real
sprite-sheet pipeline built for low hosting cost, explicit animation control,
and zero guesswork during implementation. The result should support full
gameplay-ready character animation for the player, all six enemy types, and the
boss while preserving the current one-key gameplay, static hosting model, and
30 FPS target.

This is primarily an **asset-pipeline and rendering-system upgrade**. Gameplay
rules, combat timings, waves, scoring, persistence, and leaderboard behavior do
not change.

## Why This Direction

The current uploaded art in `imeges/` is useful as **style reference only**:

- The files are standalone renders, not sprite sheets.
- They are all `1254 x 1254`, which is too large and too ambiguous for runtime
  frame slicing.
- They do not define frame boundaries, animation rows, or timing.

For low server cost and implementation reliability, the runtime format should be
**one sprite sheet per actor class plus one explicit manifest file per sheet**.
That minimizes requests, compresses well, caches cleanly, and gives the coding
agent a precise contract instead of inference.

## Non-Goals

- No gameplay rebalancing in this phase.
- No multiplayer, backend, or leaderboard changes.
- No auto-detection of frame layout from arbitrary PNGs.
- No support for both loose PNG frames and sheets in v1 of the asset pipeline.
- No mandatory external art tools or runtime dependencies.
- No changes to DOM screens, menu navigation, or HUD structure.

## Constraints

- Static frontend only; no increase in server complexity.
- Hosting cost must stay low: prefer fewer files and cache-friendly assets.
- Keep fixed internal resolution at `1280 x 720`.
- Must degrade safely when images are unavailable or canvas is headless in tests.
- No runtime guessing: frame layout, anchor points, and animation timing must be
  explicit in code manifests.
- No new npm dependencies unless they are strictly necessary; default plan uses
  none.
- Mirroring left/right should be done in code where possible to avoid duplicate
  art.

## Recommended Asset Format

Each actor class gets:

1. One sheet image:
   - `src/game/assets/sprites/<actor>.png`
2. One colocated manifest:
   - `src/game/assets/sprites/<actor>.ts`

Actor classes in scope:

- `player`
- `grunt`
- `runner`
- `shield`
- `tank`
- `glitch`
- `boss`

### Sheet Rules

- Each sheet contains a regular grid.
- Every frame in a given sheet has the same `frameWidth` and `frameHeight`.
- Rows are grouped by animation name.
- Frames in each row are contiguous from column `0`.
- Unused cells are allowed only if the manifest never references them.
- Transparency must be real alpha, not chroma-key background fills.
- Sheets should be authored at native pixel scale and drawn with
  `imageSmoothingEnabled = false`.

### Manifest Contract

Every sprite sheet manifest exports a strongly typed object describing exactly
how to interpret the sheet:

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
```

Required meaning of fields:

- `frameWidth`, `frameHeight`: native size of one frame cell in the sheet.
- `scale`: integer draw multiplier in the current `1280 x 720` game world.
- `anchorX`: horizontal pixel inside the frame that should align to actor `x`.
- `anchorY`: vertical pixel inside the frame that should align to ground/base.
- `defaultFacing`: the direction the authored art naturally faces.
- `hitboxVisualOffset`: optional render-only adjustment for visual centering.
- `animations`: explicit row/timing map, no inferred names or lengths.

## Animation Scope

This pass targets the user's requested **full polish** animation scope.

### Player Required Animations

- `idle`
- `walk`
- `slash`
- `charge`
- `heavy`
- `dodge`
- `parry`
- `hurt`
- `dead`

### Standard Enemy Required Animations

- `walk`
- `windup`
- `attack`
- `recover`
- `hurt`
- `dead`

### Boss Required Animations

- `idle` or `walk` depending on art direction
- `windup`
- `attack`
- `recover`
- `hurt`
- `dead`
- `specialAttack`

If an actor does not have enough art for a unique animation on day one, the
manifest may intentionally alias multiple gameplay states to the same animation
row. That aliasing must happen explicitly in code, not implicitly by fallback.

## Runtime Architecture

The existing renderer should evolve from “code-authored sprite selection” into
“sheet-backed animation selection” with four small modules:

### 1. `spriteSheetLoader`

Responsibilities:

- Load sheet images once.
- Cache successful loads.
- Return a stable status: `ready`, `loading`, `error`, `unavailable`.
- Never throw during render.

Shape:

```ts
export type LoadedSpriteSheet = {
  image: HTMLImageElement;
  width: number;
  height: number;
};

export function primeSpriteSheet(def: SpriteSheetDef): void;
export function getSpriteSheet(def: SpriteSheetDef): LoadedSpriteSheet | null;
export function clearSpriteSheetCache(): void;
```

### 2. `spriteManifest`

Responsibilities:

- Provide typed definitions for all actors.
- Validate that referenced rows and frame counts fit inside the actual sheet.
- Centralize all animation naming.

### 3. `spriteAnimator`

Responsibilities:

- Convert `now + actor state` into a specific frame index.
- Decide whether to loop, hold, or clamp.
- Map gameplay states to manifest animation keys.

Shape:

```ts
export function frameIndexForLoop(now: number, anim: SpriteAnimationDef): number;
export function frameIndexForOneShot(progress: number, anim: SpriteAnimationDef): number;
```

### 4. `spriteSheetRenderer`

Responsibilities:

- Draw one frame cell from a loaded sheet.
- Apply nearest-neighbor rendering.
- Mirror horizontally when world-facing differs from authored-facing.
- Align to actor position using `anchorX` and `anchorY`.

Shape:

```ts
export function drawSheetFrame(
  ctx: CanvasRenderingContext2D,
  sheet: LoadedSpriteSheet,
  def: SpriteSheetDef,
  animation: SpriteAnimationDef,
  frameIndex: number,
  cx: number,
  yBase: number,
  facing: "left" | "right",
): void;
```

## State Mapping Rules

To prevent guessing, gameplay state to animation selection must be fixed:

### Player

- `idle` -> `idle`
- `slashing` -> `slash`
- `charging` -> `charge`
- `heavySlashing` -> `heavy`
- `dodging` -> `dodge`
- `parrying` -> `parry`
- `hurt` -> `hurt`
- `dead` -> `dead`

`walk` exists in the sheet contract for future mobility or menu/demo scenes, but
the player is currently locked in place during the actual run. It may be unused
in the first integration while still being part of the asset standard.

### Enemies

- `approaching` -> `walk`
- `windup` -> `windup`
- `attacking` or impact window -> `attack`
- `recovering` -> `recover`
- `stunned` -> `hurt` or a dedicated stunned row if supplied
- `dead` -> `dead`

### Boss

- Same mapping as enemies, with `specialAttack` reserved for any unique boss
  branch added later.

## Fallback Behavior

Runtime must stay playable even when some or all new sheets are missing:

- If a sheet is not loaded yet, render the current code-authored sprite for that
  actor.
- If a manifest references a missing animation key, fail validation in tests.
- If an image fails to load at runtime, mark it errored and keep using the
  existing procedural renderer.
- No blank invisible actors should ever ship.

This keeps the rollout incremental and safe.

## File Layout

New asset-oriented structure:

```text
src/game/assets/sprites/
  player.png
  player.ts
  grunt.png
  grunt.ts
  runner.png
  runner.ts
  shield.png
  shield.ts
  tank.png
  tank.ts
  glitch.png
  glitch.ts
  boss.png
  boss.ts

src/game/rendering/
  spriteSheetLoader.ts
  spriteSheetLoader.test.ts
  spriteSheetRenderer.ts
  spriteSheetRenderer.test.ts
  spriteAnimator.ts
  spriteAnimator.test.ts
```

The current `imeges/` folder remains a reference stash and is not part of the
runtime contract.

## Asset Authoring Contract

To keep implementation deterministic, artists or future image-generation steps
must follow these rules:

- One actor per sheet.
- Fixed frame cell size across the whole sheet.
- Transparent background only.
- Actor feet/base must stay aligned consistently across rows.
- No rotation between left/right variants; runtime mirroring handles direction.
- Motion arcs must stay inside the frame box or intentionally overflow in a
  consistent way accounted for by anchors.
- If weapons extend far outside the body, `anchorX` and `anchorY` still refer to
  the actor body’s gameplay alignment, not the total visual width.

## Cost And Performance Strategy

Low server cost comes from:

- One sheet file per actor, not dozens of loose PNGs.
- Static files served directly by Vercel/CDN.
- Browser caching on a tiny, stable set of URLs.
- No backend image transformation, no dynamic generation.

Performance comes from:

- Loading once, drawing source rects via `drawImage`.
- Integer scale rendering only.
- No per-frame slicing to temporary canvases.
- Keeping effects like slash arcs and flashes code-driven until a later pass.

## Testing Strategy

### Automated

Validate pure logic and contracts:

- Manifest validation:
  - frame size positive
  - anchor values within frame bounds
  - animation rows/frames stay inside image dimensions
  - required animation keys exist per actor class
- Animator tests:
  - looping frame selection wraps correctly
  - one-shot animations clamp correctly
  - hold-last-frame behavior works
- Renderer tests:
  - render function early-returns safely when image/canvas is unavailable
  - mirroring math uses `defaultFacing` consistently

### Manual

Browser QA checklist:

- every actor aligns to the ground cleanly
- left/right mirroring looks correct
- player slash/heavy/parry timing still reads clearly
- enemy windup silhouettes remain readable under telegraphs
- boss stays fully visible and centered enough during combat
- no sprite jitter from anchor mismatch
- no blurry scaling

## Rollout Plan Shape

The later implementation plan should split into these phases:

1. Sheet/manifest contract and validators
2. Loader + renderer + headless-safe tests
3. Player sheet integration with fallback
4. Enemy sheet integration with fallback
5. Boss and special attack integration
6. Removal or retirement of procedural character renderers only after parity
7. Manual QA, build, and deploy verification

Each phase must keep the game playable.

## Success Criteria

- Spaceblade uses sprite sheets as the runtime contract for character art.
- The contract is explicit enough that another coding agent can implement it
  without inferring frame layout or animation names.
- Full-polish animation scope is represented in the design, even if some rows
  are temporarily aliased during early integration.
- Hosting remains static and low-cost.
- The game preserves current gameplay behavior and stays deployable on Vercel.

## Open Decisions Already Resolved

- **Asset format:** sprite sheets per character
- **Cost priority:** fewer files, no server-side image work
- **Animation ambition:** full polish, not minimal placeholder animation
- **Current uploaded PNGs:** reference only, not runtime assets
