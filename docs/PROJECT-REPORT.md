# Spaceblade — Engineering Report

**Date:** 2026-07-07
**Author:** Claude (Opus 4.8), pair-building with amit
**Live:** https://spaceblade.vercel.app
**Repo:** https://github.com/amitamit10/Spaceblade (branch `main`)

---

## 1. What this is

Spaceblade is a one-key, 2D side-view cyberpunk action game for the Hack Club
**OneKey** challenge. Every interaction — menus, combat, pause, settings — is
driven by the `Space` key alone. The player is locked to the center of the arena
and survives 15 escalating waves in "Neon-Sector 04", ending with a boss.

It is a Vite + TypeScript static frontend, gameplay on one HTML Canvas, menus as
DOM overlays, an optional Firebase leaderboard, deployed to Vercel.

**Status:** v1 complete and deployed. A pixel-art rendering pass is in progress
(currently procedural; real sprite assets being sourced next).

---

## 2. Headline numbers

| Metric | Value |
| --- | --- |
| Tasks completed | 9 (v1) + 4 (pixel-art) = 13 |
| Git commits | 15 (all conventional, one per task/phase) |
| Source files | 64 TypeScript modules |
| Production code | ~3,960 LOC |
| Test code | ~1,070 LOC |
| Tests | **114 passing**, 18 suites |
| Build | `tsc --noEmit` + Vite, clean |
| Dependencies | `firebase` only (+ dev: vite, typescript, vitest, jsdom, @types/node) |

---

## 3. How the work was run (process)

This was executed as a disciplined, plan-driven build, not ad-hoc coding:

1. **Studied the inputs first** — 5 mockup design sheets + a pre-written split
   spec and 9-task implementation plan under `docs/superpowers/`.
2. **Executed task-by-task** with a strict cycle per task: write failing tests →
   implement → run tests → `npm run build` → commit with the plan's exact
   message. Never started a task before the previous one's quality gate passed.
3. **Kept gameplay logic pure** (no canvas) so it is unit-testable; rendering is
   a thin layer over tested state.
4. **For the pixel-art overhaul**, ran a full mini-lifecycle: brainstorm → design
   spec (committed) → implementation plan (committed) → task execution.
5. **Deployed** to GitHub + Vercel with CLI, verified live (HTTP 200 + asset load).

Traceability: `docs/superpowers/specs/` (design), `docs/superpowers/plans/`
(task breakdowns), and one commit per task make the history auditable.

---

## 4. Architecture

```
index.html
 └─ src/main.ts → App.ts (screen state machine, single Space authority)
      ├─ ui/            DOM overlays: 8 screens + Space-only menu controller
      ├─ game/
      │   ├─ input/     inputParser: raw Space up/down timestamps → actions
      │   ├─ player/    playerStateMachine (pure) + pixel sprites
      │   ├─ enemies/   enemyFactory/logic (pure) + telegraphs + pixel sprites
      │   ├─ run/        runState, waveTable, spawnScheduler, scoreSystem, gameLoop
      │   ├─ rendering/  canvas root, camera, effects, pixel sprite engine, bg
      │   ├─ audio/      code-generated Web Audio cues (no files)
      │   └─ scenes/     mainGameScene (rAF loop, pause/resume via scene clock)
      ├─ state/         localStorage store + leaderboard service
      └─ lib/firebase/  env-gated Firestore client
```

**Key design decisions**

- **Pure simulation, thin rendering.** Player/enemy/run logic are `now`-driven
  pure functions/classes — fully testable in jsdom without a canvas.
- **Single input authority.** `inputParser` converts Space up/down timestamps
  into `tap` / `doubleTap` / `holdStart` / `holdRelease`; combat upgrades a
  well-timed tap into a parry. Menus and gameplay share the one key.
- **Scene clock for pause.** The game scene runs on
  `performance.now() - pausedOffset`, so pausing never desyncs absolute timers
  (enemy impacts, i-frames) — a subtle correctness win.
- **Graceful degradation.** No Firebase config → leaderboard "disabled"; network
  error → "offline". Gameplay never waits on the network. Audio and canvas both
  no-op safely when unavailable (e.g. headless tests).
- **Zero art assets (so far).** Backgrounds, effects, and sprites are all drawn
  in code, keeping the deploy a pure static bundle.

---

## 5. What is finished

### Gameplay (v1, Tasks 1–9)
- One-key input parser with deterministic tap/hold/double-tap/parry resolution.
- Player state machine: idle, slash, charge→heavy, dodge (i-frames), parry,
  hurt, dead — all with locked timing constants and tests.
- Six enemy types with distinct counterplay + red attack telegraphs: grunt,
  runner, shield (block/break/parry), tank (2 HP), glitch (teleport), boss (12 HP).
- Full 15-wave run: exact spawn table, weighted mix, active-weight + tank caps,
  difficulty ramp, boss on wave 15, victory/game-over.
- Scoring: combo multipliers (kills only), parry points + once-per-run streak
  bonuses, clean-wave ×1.5, grade tiers (B→SSS).
- Arena rendering: parallax background (3 themes), camera shake/zoom/flash,
  effect system with reduced-effects mode, code-generated Web Audio cues.
- Full UX flow: title, tutorial, playing HUD, pause, settings (persisted),
  game over, highscores (Global/Friends), mobile-warning — all Space-navigable.
- Persistence: best score/wave, settings, tutorial-seen, player name in
  localStorage.
- Online leaderboard: env-gated Firestore client + service, submit-on-run-end
  (score ≥ 100), sanitized names, top-20 read, security rules file provided.
- Full integration: mobile detection, real boot flow, pause/resume, README with
  all required sections.

### Pixel-art pass (Tasks 1–4 of 5)
- Sprite engine: character-grid + palette sprites, baked once to offscreen
  canvases (nearest-neighbor), blitted per frame. Pure animation frame-pickers.
- Player rendered as 11 pixel poses (per action state) with an idle bob.
- All six enemies as pixel sprites with walk animation + windup pose.
- Pixel-tiled background (banded sky, parallax buildings with lit windows,
  stars, floor, spawn gates) per sector theme.
- Shipped to production.

### Ops
- GitHub repo pushed to `main`; Vercel project `spaceblade` created and
  auto-connected to GitHub (push-to-deploy). Two successful production deploys.

---

## 6. What is missing / not done

1. **Real sprite art.** The procedural pixel sprites read as crude blobs. The
   agreed next step is loading ChatGPT-generated PNGs via a sprite loader (design
   already exists as brainstorm Option 2). **This is the current blocker on
   visual quality.**
2. **Firebase leaderboard is not live.** Code and security rules are done, but no
   Firebase project/env vars are configured, so the live site shows "disabled".
   Turning it on is a config task (create Firestore, apply rules, add 4 env
   vars, redeploy).
3. **No sprite animation frames from assets.** Current animation is limited
   (2-frame walks, pose-per-state). Multi-frame attack/walk cycles would need
   either richer authored grids or asset sheets.
4. **Rendering is only manually verified.** Canvas visuals can't be unit-tested;
   sprite *data* and pure logic are tested, but the actual pixels rely on
   eyeballing in the browser.
5. **Audio is minimal.** Code-generated blips, not designed sound. Fine for v1,
   not polished.
6. **Accessibility/mobile.** Touch users get a "keyboard recommended" warning but
   no touch-playable fallback (by design for the OneKey constraint).
7. **`backgroundLayers.ts`** is now dead for rendering (kept only for its
   `SectorTheme` type) — minor cleanup debt.

---

## 7. Known risks / honest caveats

- **Enemy AI is intentionally simple** (approach → windup → telegraphed impact →
  recover). It reads clearly but is not sophisticated; late-wave difficulty comes
  from spawn density, not smarter behavior.
- **Balance is untuned by real playtesting.** Constants are reasonable first
  guesses; hit ranges, parry window (−120/+60ms), and spawn pacing may need feel
  tuning.
- **Firebase bundle is heavy** (~380 KB JS, ~99 KB gzip) for a small game,
  because the whole SDK is imported even when the leaderboard is disabled. Could
  be lazy-loaded to shrink first paint.
- **30 FPS target** is conservative; the baked-sprite approach should hold it,
  but this hasn't been profiled under a full late-wave screen.

---

## 8. Plans to improve (prioritized)

1. **Swap in real sprite assets** (in progress). Build `spriteLoader` +
   image-based renderers; key out magenta if PNGs lack alpha; normalize scale.
2. **Enable the live leaderboard.** Provision Firestore, apply `firestore.rules`,
   set env vars, redeploy. Add a name-entry field on game over.
3. **Lazy-load Firebase** so the initial bundle is tiny and the game boots faster.
4. **Playtest-driven balance pass** on ranges, parry window, and spawn pacing.
5. **Richer animation** (attack/walk cycles) once real assets exist.
6. **Sound pass** — replace generated blips with designed cues (still code or a
   tiny asset set).
7. **Cleanup** — remove dead `backgroundLayers` render path; consider profiling
   FPS under max load.

---

## 9. Where to look (for a reviewer)

- **Plan + spec:** `docs/superpowers/plans/`, `docs/superpowers/specs/`
- **Pure logic (start here for correctness):** `src/game/run/scoreSystem.ts`,
  `runState.ts`, `waveTable.ts`, `src/game/enemies/enemyLogic.ts`,
  `src/game/player/playerStateMachine.ts`, `src/game/input/inputParser.ts`
- **Integration:** `src/app/App.ts`, `src/game/scenes/mainGameScene.ts`,
  `src/game/run/gameLoop.ts`
- **Tests:** co-located `*.test.ts` (114 tests, 18 suites)
- **Run it:** `npm install && npm run dev`; verify with `npm test -- --run` and
  `npm run build`.
