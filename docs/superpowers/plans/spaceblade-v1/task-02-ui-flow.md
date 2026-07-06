# Task 2: Build All DOM Screens And Space-Only Menu Navigation

**Purpose:** Make the full mockup screen flow navigable before gameplay exists.

**Read first:**

- `01-execution-rules.md`
- `02-global-constraints.md`
- `03-locked-constants.md`
- `04-shared-types.md`
- `05-target-file-map.md`
- `task-01-bootstrap-foundation.md`

**Files:**

- Create all `src/ui` files from the target file map.
- Modify `src/app/createAppRoot.ts`.
- Modify `src/styles.css`.

**Exact screen flow:**

- `title`: shows `Spaceblade`, tagline `ONE KEY. ENDLESS FIGHT.`, high score teaser, and focused action `Start`.
- `tutorial`: shows five control rows: tap, hold, release, double tap, perfect timing.
- `playing`: shows canvas plus static sample HUD values for hearts, HP bar, wave, score, current action state, damage number layer, and parry timing strip with `TOO EARLY`, `PERFECT`, `TOO LATE`.
- `paused`: actions in this order: `Resume`, `Settings`, `How To Play`, `Restart Run`, `Quit To Title`.
- `settings`: controls in this order: `Volume`, `Screen Shake`, `Reduced Effects`, `Save And Close`.
- `gameOver`: shows `DEPLOY FAILED`, final score, waves reached, enemies defeated, grade, and actions in this order: `Restart`, `Highscores`, `Quit To Title`.
- `highscores`: shows `Global` and `Friends` tabs, online status line, rank/player/waves/score rows, highlighted `YOU` row, and action `Return`.
- `mobileWarning`: shows keyboard recommended warning and action `Continue`.

**Exact navigation rules:**

- `Space` tap cycles focus to the next action on screens with multiple actions.
- `Space` hold for at least `450ms` confirms the focused action.
- `Space` on title with one focused action starts the game by moving to `tutorial` when tutorial is unseen, otherwise `playing`.
- `Space` hold on tutorial continues to `playing`.
- Pause is triggered from gameplay by `Space` hold for at least `900ms` only when the player is idle.
- Escape, Enter, mouse, touch, and buttons may not be required.

**Required implementation contracts:**

- `createScreenState(initial: GameScreen)` returns `{ get, set, subscribe }`.
- `createSpaceMenuController(actions, onConfirm)` returns `{ getFocusedAction, onTap, onHoldConfirm, reset }`.
- `renderShell(model)` renders the current screen into `[data-overlay-root]`.
- Every screen root must include `data-screen="<screenName>"`.
- Every focusable action must include `data-action="<actionId>"` and `data-focused="true|false"`.

**Required tests:**

- `spaceMenuController.test.ts` covers tap cycling, hold confirmation, and wraparound.
- `screenState.test.ts` covers screen transitions and subscriber notification.
- `appFlow.test.ts` covers title to tutorial to playing and pause to settings to pause.

**Verification commands:**

```bash
npm test -- --run src/ui src/app/appFlow.test.ts
npm run build
```

**Quality gate:**

- A tester can reach every screen using only `Space`.
- Every screen looks intentional at desktop size with static sample gameplay values.
- CSS uses the locked color tokens: dark arena base, cyan panel strokes, magenta danger accents, yellow feedback accents, teal effects, and crisp compact UI.

**Commit:**

```bash
git add .
git commit -m "feat: build one-key ui flow"
```
