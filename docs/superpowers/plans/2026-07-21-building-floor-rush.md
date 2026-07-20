# Building Floor Rush Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Spaceblade a fast-paced one-button building assault with floor-based speed escalation and automatic vault/wall-climb traversal.

**Architecture:** Keep deterministic pacing and enemy behavior in `src/rebuild/rebuildGame.ts`. Keep the building interior, floor framing, traversal phases, and browser observability in the Phaser scene and pure render helpers. Reuse existing public assets and graphics; do not add a server or physics dependency.

**Tech Stack:** TypeScript, Phaser, Vitest, Vite, existing public sprite/audio assets.

## Global Constraints

- Space remains the only combat input.
- Pause and name submission remain UI-only exceptions.
- Floor 1 is baseline; floor 15 is capped near 50-55% faster.
- Spawn intervals never go below 520ms.
- Attack windups never go below 160ms.
- No remote runtime assets or new backend state.

### Task 1: Add Deterministic Floor Pacing

**Files:**
- Modify: `src/rebuild/rebuildGame.ts`
- Test: `src/rebuild/rebuildGame.test.ts`

- [ ] Add failing tests for exported pacing helpers: floor 1 multiplier `1`, floor 15 multiplier `1.55`, later-floor enemy speed greater than floor 1, windup minimum `160`, and spawn interval minimum `520`.
- [ ] Implement `rebuildFloorPacingMultiplier`, `rebuildEnemySpeedForFloor`, and `rebuildEnemyWindupForFloor` with a cap of `1.55`.
- [ ] Apply scaled speed, windup, and teleport timing when enemies are created and advanced.
- [ ] Make `rebuildSpawnIntervalForWave` use the multiplier with a `520ms` floor.
- [ ] Run the focused rebuild-game tests and preserve existing combat behavior.
- [ ] Commit as `feat: ramp building floor pacing`.

### Task 2: Make Traversal Read As Building Movement

**Files:**
- Modify: `src/rebuild/renderScene.ts`
- Test: `src/rebuild/renderScene.test.ts`
- Modify: `src/engine/spacebladeScene.ts`

- [ ] Add failing tests for explicit floor traversal phase labels and the existing vault/climb/descent timing.
- [ ] Add a pure phase helper returning `vault`, `wall-climb`, `shaft`, `landing`, or `complete`.
- [ ] Draw a low-cost interior building shell with side walls, ceiling beams, floor slab, window panels, and a vertical shaft around the active lane.
- [ ] Shift the building shell and floor label when the wave changes; keep enemy combat on the active floor.
- [ ] Expose `data-spaceblade-floor` and `data-spaceblade-parkour` values for browser checks.
- [ ] Play existing traversal sounds at jump, climb, and landing boundaries.
- [ ] Run render, engine, and build checks.
- [ ] Commit as `feat: add building floor traversal presentation`.

### Task 3: Verify and Deploy

**Files:**
- Modify: `README.md`
- Modify: `docs/art/public-asset-sources.md` only if asset attribution changes

- [ ] Update the gameplay description to describe the building assault and speed ramp.
- [ ] Run focused tests, `npm run build`, `git diff --check`, and production HTTP smoke checks.
- [ ] Push `main` and deploy with `npx vercel --prod --yes`.
- [ ] Confirm the production root returns HTTP 200 and report the commit/deployment.
