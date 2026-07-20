# Spaceblade — Engineering Report

**Date:** 2026-07-20
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

**Status:** Core v1 gameplay is complete and deployed. The Phaser runner uses
standalone frame PNGs, one-button combat, optional mouse menus, authored wave
pacing, a verified Wave 15 boss victory, a verified terminal-screen restart
flow, and a live Firebase leaderboard submission/read check.

---

## 2. Headline numbers

| Metric | Value |
| --- | --- |
| Tasks completed | 9 (v1) + 4 (pixel-art) = 13 |
| Git commits | 15 (all conventional, one per task/phase) |
| Source files | 64 TypeScript modules |
| Production code | ~3,960 LOC |
| Test code | ~1,070 LOC |
| Tests | **260 passing**, 44 Vitest suites + 22 browser tests |
| Build | `tsc --noEmit` + Vite, clean |
| Dependencies | `firebase`, `phaser` (+ dev: vite, typescript, vitest, jsdom, Playwright, @types/node) |

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
 └─ src/main.ts → engine/spacebladeConfig.ts → engine/spacebladeScene.ts
      ├─ rebuild/       pure runner simulation, frame manifest, animation, leaderboard adapter
      ├─ engine/        Phaser scene, one-button input, HUD, menus, FX, 30 FPS config
      ├─ game/          shared input, combat, audio, sprite and rendering modules
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
- **Low-cost static delivery.** The game is client-side and uses standalone
  PNG frames plus code-drawn backgrounds and effects; the server is not in the
  gameplay loop.

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

### Pixel-art and animation pass
- Runtime uses standalone authored PNG frames under `public/sprites/frames/`;
  it never crops a sprite sheet at runtime.
- Player sequences use dedicated standalone `charge`, `heavy`, `dodge`, and
  `parry` frames; all six enemy types use separate `windup`, `attack`, and
  `hurt`, `recover`, and `dead` sequences in addition to their walk frames.
- The boss also has a dedicated five-frame `specialAttack` sequence for its
  impact window.
- Glitch now flickers with a short alternating alpha/offset presentation during
  the final 260ms before its late-wave teleport; its combat coordinates remain
  unchanged.
- Glitch teleporting also emits one distinct low-volume warning cue per
  teleport deadline, with no audio spam across render frames.
- Enemy presentation adds state-specific bobbing, impact-window lunge/tilt, and
  stunned recoil while leaving simulation coordinates and hitboxes unchanged.
- Defeated enemies play their authored `dead` frames across the existing 360 ms
  death window before being removed from the visible arena.
- Enemy recovery frames play after impact, then return to the telegraph loop;
  this is presentation-only and does not change damage timing.
- Recovery presentation now uses each authored sequence's declared frame count
  and duration, so longer sequences such as the boss's three-frame recovery are
  not cut off by a global timeout.
- First attack timing now starts with a full authored windup whenever a threat
  first reaches contact range, so neither an overdue nor an early inherited
  spawn timer can shorten the readable telegraph. A live browser gate confirms
  the first parry strip appears with all 3 hearts intact.
- Forward spawns now keep a deterministic 96px gap from the furthest active
  threat, preventing dense waves from rendering as a single overlapping stack.
- Active threats now use the specified weighted capacity of 6; tanks and bosses
  count as weight 2, and no more than two tanks can be active simultaneously.
- The player walk presentation masks a detached top-strip artifact present in
  the supplied walk PNGs while leaving every combat reaction uncropped. A live
  production screenshot confirms a clean grounded player with no stray boot
  fragment.
- The player now visibly plays authored `hurt` frames on impact and `dead`
  frames during the short terminal transition before the game-over screen.
- The web shell is installable as a fullscreen landscape PWA; a versioned
  service worker caches same-origin game assets and falls back to the cached
  shell when offline.
- Defeated enemy views retire after their death presentation window, avoiding
  repeated texture and health-bar work during dense late waves.
- Enemy and projectile presentation objects now use reuse pools; expired hit
  labels are destroyed, so long runs do not retain one Phaser object per shot
  or defeated enemy.
- Gameplay pauses automatically when the browser tab becomes hidden, avoiding
  timer jumps from background-tab throttling.
- The HUD now shows a live `TOO EARLY / PERFECT / TOO LATE` parry timing strip
  during real enemy telegraphs, with boundaries covered at 30 FPS timing.
- HUD layout now follows the mockup safe zones: HP and its bar sit left, Wave is
  centered, and Score/Combo are right-aligned.
- The live Phaser entry flow now shows the documented keyboard warning on
  coarse-pointer devices; a tap or Space continues to the title screen, and
  pointer/touch down-up events drive the same one-button gameplay actions.
- Game over now displays the authoritative score grade (`B` through `SSS`, or
  `UNRANKED`) and the same grade is sent with eligible leaderboard submissions.
- Highscores now exposes Space-navigable `GLOBAL` and `FRIENDS` tabs; Friends is
  always local, while Global honestly shows disabled/offline states.
- Settings now includes a one-button `CALLSIGN` selector (`Pilot`, `Nova`,
  `Blade`, `Ghost`, `Zero`, `Ace`) persisted to `spaceblade.playerName` for
  identifiable local and future online scores.
- Pause now includes `HOW TO PLAY`; opening it preserves the current run and
  returns to the paused menu instead of restarting.
- Partial damage on tanks and the boss shows an authored `hurt-XX.png`
  reaction, a floating `-1` damage label, and a short impact burst instead of
  silently changing the health bar.
- Successful parries now replace the HUD instruction with a short
  `PERFECT PARRY · STUNNED` callout and green screen flash; failed defenses show
  a red `HIT` callout and flash, both respecting Reduced Effects.
- Charged energy shots now exist as visible, deterministic projectiles: they
  travel across the lane, resolve one collision on crossing, break shields,
  damage multi-hit enemies, and expire without server work.
- Energy shots have a distinct browser-safe rising-pitch cue, while sword,
  parry, impact, alert, boss, and ambient cues remain asset-free Web Audio.
- Enemy damage now has its own short ascending metallic cue, triggered once per
  actual HP decrease so repeated render frames do not spam audio.
- Projectile transitions now show explicit `ENERGY HIT` and `SHIELD BREAK`
  callouts, so ranged combat feedback is distinct from sword damage.
- Pixel-tiled background, floor scroll, telegraphs, and death effects ship in
  the Phaser scene.
- A low-alpha parallax skyline now advances independently from the floor,
  making the auto-run readable while preserving the 30 FPS rendering budget.
- Low-cost cyan runner streaks now follow the player behind the sprite, making
  forward motion readable even when the player is in the idle animation.
- Shipped to production and verified by browser frame-path checks.
- `npm run verify:production` provides a repeatable live smoke gate for the
  centered player, authored action states, advancing frames, browser errors,
  and the absence of Firebase requests during normal gameplay.
- Firebase configuration now rejects blank and common placeholder values before
  client initialization, preserving an honest disabled state until real project
  credentials are supplied.
- Firestore public writes now require a server-resolved `createdAt` timestamp in
  addition to the existing shape, score, wave, and name validation.
- Visibility pausing now clears dropped transient input, so returning from a
  hidden tab cannot leave the one-button control permanently held.
- Window focus loss clears the same transient state, with live browser coverage
  confirming a new energy-shot hold still works after focus returns.
- Global highscores now expose a direct retry path after a transient offline
  read, without forcing a title-screen round trip.
- The obsolete canvas background renderer was removed; `SectorTheme` now lives
  in a renderer-neutral module shared by the game loop and pixel background.
- A live Chrome probe measured stable ~16.7 ms presentation intervals with no
  browser errors, and the engine test now locks the intentional 30 FPS pacing
  configuration (`forceSetTimeOut`).
- `npm run verify:production:performance` now measures the active production
  simulation for 8 seconds; the current baseline is 28.65 median FPS, 38.6ms
  p95 update interval, 228 samples, and zero browser errors without Firebase
  loading before gameplay.
- The coarse-pointer warning now uses larger mobile typography and concise
  rotate-to-landscape guidance; this was visually checked at 390x844 in Chrome.
- The browser's `prefers-reduced-motion` preference now defaults to reduced
  effects and disabled screen shake; explicit saved settings remain authoritative.
- The reduced-motion default is covered by both persistence tests and a live
  browser regression that still completes one-button gameplay startup.
- If browser storage is blocked, the same reduced-motion defaults still apply;
  storage failure cannot silently re-enable screen shake.
- The arena background now has a 96px overscan buffer so camera shake cannot
  expose transparent black edges; this was visually checked during a live
  heavy attack capture.
- A live unauthenticated Firestore probe confirmed that an invalid score is
  rejected with HTTP 403, protecting the low-cost public leaderboard from
  malformed submissions.
- `npm run verify:firebase-rules` now repeats that public-write rejection check
  from a pulled production env file without printing credentials.
- `npm run verify:production:online` now runs a real eligible score through the
  live app and asserts Global highscores returns online rows with successful
  Firestore requests and no browser errors.
- Equal-score global records receive a deterministic server-timestamp tie-break
  after the single-field Firestore query, avoiding a composite index requirement.
- Configured leaderboard reads have an 8-second client timeout and surface the
  existing offline state instead of leaving the highscores screen loading.
- Successful leaderboard reads cancel that timeout immediately, avoiding stale
  timers across repeated highscores visits.
- The authored six-frame player walk sequence is explicitly exposed in the
  manifest and selected during the neutral running state, preventing normal
  forward motion from reusing a static idle frame. Local and live browser
  checks confirm `/sprites/frames/player/walk-XX.png` advances.
- Enemy approach states now use each roster member's authored standalone
  `walk-XX.png` sequence instead of the legacy rebuild-frame alias. A live
  production probe observed `/sprites/frames/grunt/walk-01.png` advancing with
  no browser errors.
- The unused generated `public/rebuild-frames/` duplicate pack and its cutter
  script were removed from the shipped tree, trimming roughly 456 KB from the
  public asset payload without changing the active Phaser runtime.
- The four unreachable duplicate `player/idle-XX.png` frames were removed;
  both the active and legacy manifest paths now use the authored walk frames for
  neutral auto-running, with the full asset-pack test covering the cleanup.
- Enemy sprite centers and boss telegraph effects are clamped to the arena
  viewport, so wide authored frames remain fully readable instead of being
  clipped at the screen edges; the boundary math is covered by unit tests.

### Ops
- GitHub repo pushed to `main`; Vercel project `spaceblade` created and
  auto-connected to GitHub (push-to-deploy). The latest production deployment
  is `dpl_23aJ3PHPBzbQpGci4s2ZmKDYn1TD`.
- Firebase project `spaceblade-game-20260720` uses standard free-tier
  Firestore in `europe-west1`; checked-in rules are deployed and the live web
  app has submitted and read eligible scores successfully.

---

## 6. What is missing / not done

1. **Further sprite polish.** The separate-frame runtime and state-specific
   motion are working and covered by tests. More authored attack frames would
   still improve combat readability.
2. **Rendering is only partially automated.** Canvas visuals can't be unit-tested;
  sprite *data* and pure logic are tested, but the actual pixels rely on
  eyeballing in the browser.
3. **Audio remains lightweight.** It is still code-generated rather than a
   recorded sound pack, but combat actions now have distinct pitch behavior.
4. **Accessibility/mobile.** Coarse-pointer users get a "keyboard recommended"
   warning, mouse/touch remain fully playable through the same single
   press-hold-release action path, and reduced-motion preferences now alter the
   initial visual-effects defaults.

---

## 7. Known risks / honest caveats

- **Enemy AI is intentionally simple** (approach → windup → telegraphed impact →
  recover). It reads clearly but is not sophisticated; late-wave difficulty comes
  from spawn density, not smarter behavior.
- **Balance is still early-stage.** The parry window is intentionally forgiving
  at −150/+90ms for the 30 FPS one-button loop; hit ranges and spawn pacing
  still need feel tuning with more real players.
- **Firebase remains a secondary chunk** (344.46 kB JS, 86.84 kB gzip) for a
  small game, but it is now lazy-loaded only for highscores or eligible score
  submission; the main bundle is 53.52 kB (16.58 kB gzip).
- **30 FPS target** is conservative; the baked-sprite approach should hold it,
  and presentation objects are pooled. An active-run baseline is now measured
  automatically, but a full late-wave stress profile remains future work.

---

## 8. Plans to improve (prioritized)

1. **Playtest-driven balance pass.** Tune ranges, parry timing, and spawn
   pacing against real player sessions.
2. **FPS and bundle profiling.** Extend the active-run gate to a full late-wave
   stress profile and consider splitting the lazy Firebase chunk further.
3. **Sound pass** — replace generated blips with designed cues (still code or a
   tiny asset set).

---

## 9. Where to look (for a reviewer)

- **Plan + spec:** `docs/superpowers/plans/`, `docs/superpowers/specs/`
- **Pure logic (start here for correctness):** `src/game/run/scoreSystem.ts`,
  `runState.ts`, `waveTable.ts`, `src/game/enemies/enemyLogic.ts`,
  `src/game/player/playerStateMachine.ts`, `src/game/input/inputParser.ts`
- **Integration:** `src/app/App.ts`, `src/game/scenes/mainGameScene.ts`,
  `src/game/run/gameLoop.ts`
- **Tests:** co-located `*.test.ts` (254 tests, 44 suites) plus 22 browser tests
- **Run it:** `npm install && npm run dev`; verify with `npm test -- --run` and
  `npm run build`.
