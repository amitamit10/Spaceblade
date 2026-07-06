# Task 9: Wire Full App Flow And Release Candidate

**Purpose:** Connect UI, input, gameplay, rendering, waves, persistence, and leaderboard into one playable product.

**Read first:**

- Every shared plan file.
- Every prior task file.

**Files:**

- Modify `src/app/App.ts`.
- Modify `src/app/createAppRoot.ts`.
- Modify `src/app/appFlow.test.ts`.
- Modify `src/game/scenes/mainGameScene.ts`.
- Modify `src/game/scenes/sceneRouter.ts`.
- Modify `src/styles.css`.
- Create or update `README.md`.

**Exact final flow:**

- Boot:
  - If mobile-like viewport or touch-only device is detected, start on `mobileWarning`.
  - Otherwise start on `title`.
- Title:
  - Tap/hold starts run flow.
  - First run goes to `tutorial`.
  - Later runs go to `playing`.
- Tutorial:
  - Hold continues to `playing`.
  - Set `spaceblade.tutorialSeen` to true when continuing.
- Playing:
  - Space actions drive player.
  - HUD shows hearts, wave, score, and current action state.
  - Idle hold of `900ms` pauses.
- Paused:
  - Resume returns to `playing`.
  - Settings opens `settings`.
  - How To Play opens `tutorial` without changing tutorial-seen flag.
  - Restart Run starts a fresh run.
  - Quit To Title returns to `title`.
- Settings:
  - Tap cycles setting row.
  - Hold toggles selected boolean setting or saves and closes.
  - Volume changes in 10 percent increments on tap when `Volume` is focused.
- Game Over:
  - Submit score asynchronously.
  - Restart starts new run.
  - Highscores opens `highscores`.
  - Quit To Title returns to `title`.
- Highscores:
  - Load top 20 on entry.
  - Return goes back to `gameOver` when opened after run, otherwise `title`.

**Exact README sections:**

- `# Spaceblade`
- `## What It Is`
- `## One-Key Controls`
- `## Local Development`
- `## Online Leaderboard`
- `## Firebase Setup`
- `## Vercel Deployment`
- `## Hack Club OneKey Fit`

**Required end-to-end tests:**

- App boots to title in normal desktop conditions.
- Title to tutorial to playing works with simulated Space input.
- Pause to settings to pause works with simulated Space input.
- Game over to highscores works without Firebase config.
- Tutorial seen flag skips tutorial on next run.

**Manual QA checklist:**

- Start dev server with `npm run dev`.
- Complete one short run using only Space.
- Confirm quick slash, heavy slash, dodge, and parry all trigger.
- Confirm at least one of every enemy type appears by wave 15.
- Confirm boss appears on wave 15.
- Confirm game over allows restart with Space only.
- Confirm highscores screen does not crash without Firebase env vars.
- Confirm `npm run build` succeeds.

**Verification commands:**

```bash
npm test -- --run
npm run build
```

**Quality gate:**

- The project is a complete playable v1.
- No required interaction depends on mouse, touch, WASD, arrows, Enter, or Escape.
- The product still feels good at 30 FPS.

**Commit:**

```bash
git add .
git commit -m "feat: integrate spaceblade release candidate"
```
