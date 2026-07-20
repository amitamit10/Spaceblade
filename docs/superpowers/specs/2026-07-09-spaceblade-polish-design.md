# Spaceblade Firebase Lazy-Load Polish — Design Spec

**Date:** 2026-07-09
**Status:** Approved for planning by default assumption (`polish`)
**Depends on:** Spaceblade v1 shipped, sprite-sheet runtime shipped, leaderboard behavior already implemented

## Goal

Reduce Spaceblade's initial JavaScript cost and keep server cost low by making
Firebase leaderboard code load only when it is actually needed. The title,
tutorial, gameplay, pause, settings, and normal game-over flow should boot and
run without paying the Firebase bundle cost up front.

This is a **runtime-loading and app-boundary polish phase**. Gameplay rules,
screen flow, input timing, persistence behavior, art, and hosting model do not
change.

## Why This Phase

The current production build eagerly imports `firebase/app` and
`firebase/firestore` through `src/lib/firebase/leaderboardClient.ts`, because
`src/app/App.ts` constructs the leaderboard service during app mount:

- `mountApp(...)` creates the local store
- `mountApp(...)` immediately calls `createLeaderboardService(createLeaderboardClient())`
- that import path pulls Firebase into the initial bundle even when the user
  never opens highscores and never submits an eligible run

The leaderboard is intentionally low-frequency:

- read only when entering `highscores`
- write only after game over when score `>= 100`
- disabled entirely when env vars are missing

That makes it an ideal candidate for **on-demand loading**.

## Non-Goals

- No gameplay rebalancing
- No visual or sprite changes
- No Firebase project provisioning or env-var setup in this phase
- No change to leaderboard copy semantics for remote-access paths:
  - missing config stays `disabled`
  - request failures stay `offline`
- No route-level code splitting or multi-page architecture changes
- No new runtime dependencies

## Constraints

- Static frontend only; keep Vercel hosting simple and low-cost
- Keep the app fully playable offline-first
- Preserve current leaderboard policy:
  - fetch top 20 on demand
  - submit only when score `>= 100`
  - sanitize names exactly as today
- Do not trigger leaderboard loading during:
  - app mount
  - title screen
  - tutorial
  - active gameplay
- Do not block game-over UI while submission is pending
- Keep all existing leaderboard states user-visible and honest
- No guesswork for future implementers; boundaries must be explicit in code and tests

## Options Considered

### Option 1: Dynamic-import the leaderboard service path on demand

Create a small loader module that imports Firebase-backed code only when
`loadHighscores()` or run-end submission actually needs it.

Pros:

- Biggest bundle win for the smallest code change
- Preserves the current app architecture and user flow
- Easy to test at the module boundary
- Keeps Firebase completely out of the boot path

Cons:

- Introduces async service acquisition where the app currently has a synchronous service

### Option 2: Keep eager imports and only micro-optimize internal code

Trim small code paths but leave `App.ts` constructing the leaderboard service at mount.

Pros:

- Lowest implementation risk

Cons:

- Misses the main bundle-size opportunity
- Still pays Firebase cost for users who never touch highscores

### Option 3: Move leaderboard into a separate app entry point

Split the feature into a deeper route/module boundary than the current single-app shell.

Pros:

- Strong separation

Cons:

- Too large for the value of this phase
- Unnecessary structure churn for a small static game

## Recommended Direction

Use **Option 1**.

The app should keep a lazy loader boundary between normal gameplay and the
Firebase-backed leaderboard implementation. `App.ts` should no longer directly
import `createLeaderboardClient()`. Instead, it should ask a loader for a
`LeaderboardService` only when needed.

## Target Architecture

### Existing boundary that stays stable

`src/state/leaderboard/leaderboardService.ts` remains the policy layer:

- `loadTopScores(): Promise<LeaderboardResult>`
- `submitRun(stats, playerName): Promise<SubmitOutcome>`
- `createLeaderboardService(client)`

This file already owns the important behavior and should stay the main app-facing
interface.

### New boundary

Add a small loader module:

- `src/state/leaderboard/loadLeaderboardService.ts`

Responsibilities:

- dynamically import `src/lib/firebase/leaderboardClient.ts`
- construct `createLeaderboardService(...)`
- cache the Promise so repeated reads/writes reuse the same service
- never throw at the app boundary

Target shape:

```ts
import type { LeaderboardService } from "./leaderboardService";

export function loadLeaderboardService(): Promise<LeaderboardService>;
export function clearLeaderboardServiceCache(): void;
```

### App integration

`src/app/App.ts` should:

- stop importing `createLeaderboardClient`
- stop constructing the leaderboard service during mount
- request the service only inside:
  - `loadHighscores()`
  - `finishRun(...)` submission path

The app should cache the loader result via the loader module, not through custom
ad-hoc state inside `App.ts`.

## Behavior Requirements

### Boot and gameplay

- Mounting the app must not load Firebase code
- Starting a run must not load Firebase code
- Playing, pausing, resuming, and restarting a run must not load Firebase code

### Highscores

- Entering `highscores` should trigger lazy service loading
- Once loaded, the current behavior stays the same:
  - configured backend -> fetch and show global scores
  - missing config -> `disabled`
  - request failure -> `offline`

### Run-end submission

- Finishing a run with score `< 100` must not load Firebase code
- Finishing a run with score `< 100` should immediately set the game-over status
  to `skipped` (`"Score too low to rank"`) without consulting backend state
- Finishing a run with score `>= 100` may load the leaderboard service and attempt submission
- Submission remains fire-and-forget from the user's perspective; game-over UI must render immediately

## Error Handling

- If the dynamic import fails:
  - highscores should surface `offline`
  - eligible run-end submission should surface `offline`
- Missing Firebase config after a successful dynamic import should still surface `disabled`
- No unhandled promise rejection should escape the app shell

## Testing Requirements

Add explicit proof at the lazy-loader boundary:

1. loader caches one Promise and constructs the service once
2. loader can be reset between tests
3. app mount does not request the loader
4. normal play does not request the loader
5. low-score game over does not request the loader
6. entering highscores requests the loader
7. eligible run-end submission requests the loader
8. loader rejection surfaces `offline`, not an uncaught error

Existing tests for `leaderboardClient` and `leaderboardService` stay valuable and
should remain focused on their own units.

## Acceptance Criteria

- Production build no longer includes eager Firebase usage in the app boot path
- Leaderboard/Firebase code loads only on highscores entry or eligible submission
- Gameplay behavior is unchanged
- `disabled` vs `offline` semantics remain unchanged for remote-access paths
- low-score runs show `skipped` without loading Firebase
- Tests prove no leaderboard load on mount/start/play and prove on-demand load when needed
- `npm test -- --run` remains green
- `npm run build` remains green
