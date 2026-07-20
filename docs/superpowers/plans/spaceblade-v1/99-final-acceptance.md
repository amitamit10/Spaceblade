# Final Acceptance Checklist

Before calling the project complete, verify every item in this file.

- [x] `npm install` succeeds from a clean checkout.
- [x] `npm test -- --run` passes.
- [x] `npm run build` passes.
- [x] `npm run dev` starts a playable local app.
- [x] Every screen is reachable using only `Space`.
- [x] A full run can end in game over.
- [x] A skilled run can reach boss wave 15.
- [x] Online leaderboard works when Firebase env vars are present. A live production run submitted score 100 to Firestore and Global highscores read it back successfully.
- [x] Highscores screen degrades gracefully when Firebase env vars are absent.
- [x] Local best score persists after refresh.
- [x] Settings persist after refresh.
- [x] README explains setup, controls, leaderboard, and OneKey fit.

Self-review checklist:

- [x] UI shell, player kit, enemy roster, environment, run structure, online leaderboard adapter, and final integration are implemented.
- [x] No required gameplay input uses mouse, touch, arrows, WASD, Enter, or Escape.
- [x] `GameScreen`, `InputAction`, `PlayerStateName`, `EnemyType`, `RunStats`, and `LeaderboardEntry` match `04-shared-types.md`.
- [x] Firebase reads happen only on leaderboard/title entry.
- [x] Firebase writes happen only after eligible run end.
- [x] Each phase's tests and verification commands have been run fresh.

Runtime evidence checkpoint:

- A real browser run reached Wave 15 and defeated the boss with 304 enemies defeated, score 72,225, and best combo 305.
- Standalone player and enemy PNG frame paths were observed changing during live gameplay.
- Production smoke checks passed with no browser errors and no leaderboard request during normal gameplay.
- Production smoke also reached `gameOver`, published the terminal `gameOver` status,
  and restarted into a fresh `playing` run through the mouse end-screen action.
- Latest verified production deployment: `dpl_CqfDmFD1YjDJjVmtLqH7b53vvXYz`.
- Automated online gate passed: score 100 submitted, Global highscores returned 5 rows online, 6 Firestore requests succeeded, and browser errors stayed at 0.
- Firebase online verification: project `spaceblade-game-20260720`, standard free-tier Firestore in `europe-west1`; live writes and reads returned HTTP 200 and server timestamps were present.
- Combat readability motion is covered by three pure motion tests and is visible
  in the Phaser scene for approaching, attacking, and stunned enemies.
- Dedicated standalone player action frames (`charge`, `heavy`, `dodge`, `parry`)
  and enemy `windup`/`attack`/`hurt`/`recover`/`dead` frames are
  manifest-validated and observed live during local Phaser input probes. A
  browser regression observes real enemy `recover-XX.png` and `dead-XX.png`
  frames. The boss `specialAttack` sequence is manifest-validated and selected
  by the impact-window animation test.
- Player `hurt-XX.png` and `dead-XX.png` reactions are manifest-validated and
  the terminal browser regression observes the dead frame before restart. The
  production Chrome probe observed `/sprites/frames/player/dead-00.png` with
  no browser errors.
- The neutral player state uses the authored six-frame `walk-XX.png` sequence;
  the production Chrome probe observed `/sprites/frames/player/walk-02.png`
  with no browser errors.
- Every enemy approach state uses its authored standalone `walk-XX.png`
  sequence; the production Chrome probe observed `/sprites/frames/grunt/walk-01.png`
  advancing with no browser errors.
- The installable app-shell browser test validates the fullscreen manifest;
  the service worker is production-only and caches same-origin static assets.
- A retirement-boundary test covers removal of per-frame work after an enemy's
  death animation completes; the terminal browser regression remains green.
- A visibility regression confirms an active run enters the pause screen when
  the browser tab is hidden, protecting the 30 FPS timer model from throttling.
- Hidden-tab recovery clears a dropped key/pointer release, and a live
  production probe confirms the next hold resumes gameplay correctly.
- Window blur clears dropped transient input as well; the production probe
  confirms a fresh energy-shot hold resumes after focus loss.
- If a configured global leaderboard read goes offline, holding the focused
  `GLOBAL` action retries it without leaving the highscores screen.
- A newly arriving enemy starts a full authored windup on contact-range entry,
  rather than inheriting either an expired or partially elapsed spawn timer;
  the live probe observed the first parry timing state while all 3 hearts were
  still intact.
- The four duplicate neutral `player/idle-XX.png` files are removed, and the
  legacy manifest's neutral frame sources now point to the authored walk cycle;
  the complete standalone-frame asset gate remains green.
- Recovery presentation uses each enemy manifest's authored duration; the boss
  recovery sequence remains visible through its final frame without changing
  simulation timing.
- Simultaneous forward spawns maintain a deterministic 96px separation, covered
  by the run-model regression so dense waves do not visually stack enemies.
- The player walk state masks the supplied walk-frame top-strip artifact while
  combat reactions remain uncropped; production visual verification shows no
  detached fragment above the grounded player.
- Global records with equal scores are ordered deterministically by newest
  server timestamp after the low-cost score query.
- A stalled configured leaderboard request resolves to the offline state after
  eight seconds, preserving a responsive highscores screen.
- A successful configured read cancels its timeout, so repeated highscores
  visits do not accumulate pending timers.
- Partial damage on tanks and the boss selects their authored `hurt-XX.png`
  reaction, shows a floating `-1` damage label, and draws a short impact burst.
- Charged energy shots travel as visible projectiles, resolve deterministic
  collisions, break shields, and are covered by unit and browser regressions.
- Energy shots trigger a dedicated rising-pitch Web Audio cue without adding
  runtime audio assets or a network dependency.
- Enemy damage triggers a distinct short generated cue once per HP decrease,
  keeping combat feedback readable without adding audio assets or server work.
- Projectile impacts show explicit `ENERGY HIT` or `SHIELD BREAK` feedback in
  the live HUD, with browser coverage for the normal hit path.
- Enemy and projectile presentation objects reuse bounded pools, and expired
  hit labels are destroyed to prevent long-run object accumulation.
- The skyline has a live parallax offset separate from floor scroll, with a
  browser regression guarding visible forward-motion feedback.
- Player runner streaks are drawn behind the authored sprite and were visually
  checked in the production gameplay frame without adding runtime assets.
- Successful parries show a `PERFECT PARRY · STUNNED` callout and green flash;
  damage shows a red `HIT` callout, with both effects disabled by Reduced Effects.
- The gameplay HUD shows a live `TOO EARLY / PERFECT / TOO LATE` timing strip
  during real enemy telegraphs; boundary tests cover `+150`, `0`, and `-90 ms`.
- The gameplay HUD uses split left/center/right placement for HP plus bar, Wave,
  and Score/Combo, with a browser regression asserting the layout mode.
- Coarse-pointer entry opens the live `KEYBOARD RECOMMENDED` warning; browser
  coverage confirms a tap dismisses it to the title screen, and pointer hold
  coverage confirms the same one-button gameplay action fires a projectile.
  A pointer-up-outside regression confirms a held action still releases when a
  touch or cursor leaves the canvas.
- Game over exposes the deterministic score grade and leaderboard payloads carry
  that same grade.
- Highscores provides Space-navigable Global and Friends tabs; Friends reads the
  local best without network access and Global preserves disabled/offline copy.
- Settings provides a one-button callsign preset selector and persists the
  selected callsign under `spaceblade.playerName`.
- Pause provides a Space-navigable How To Play screen that returns to pause
  without restarting the active run.
- A system `prefers-reduced-motion` preference defaults to reduced effects and
  disables screen shake when no explicit local setting exists; saved settings
  continue to override that default, including when browser storage is blocked.
- The repeatable production performance gate records an 8-second active-run
  baseline of 28.41 median FPS, 38.8ms p95 update interval, 229 samples, and
  zero browser errors without Firebase loading before gameplay.
- Wide enemy and boss frames are presentation-clamped to the arena viewport;
  world-space collision positions remain unchanged while edge sprites and
  telegraph effects stay visible.
- Late-wave Glitch teleporting now has a deterministic pre-teleport flicker
  window, covered by motion tests and exposed through a runtime marker.
- Spawn pressure enforces the authored active-threat weight cap of 6, with tanks
  and bosses weighted at 2 and a maximum of two active tanks.
- Glitch teleport warnings use a dedicated generated audio cue, gated once per
  teleport deadline so dense frames do not repeat the sound.
- The full deterministic 15-wave simulation asserts the weighted threat cap and
  tank limit; production also exposes the live threat weight for smoke probes.
- Production smoke and performance gates fail if threat telemetry is missing or
  exceeds the weighted capacity, rather than silently accepting an incomplete
  runtime signal.
- Glitch teleport presentation includes pooled scanline fragments that disappear
  when reduced effects are enabled, with no change to the one-button timing.
