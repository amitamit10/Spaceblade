# Spaceblade Firebase Lazy-Load Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Firebase leaderboard code from Spaceblade's initial boot path by lazy-loading the leaderboard service only when highscores are opened or an eligible run-end submission happens.

**Architecture:** Keep `leaderboardService.ts` as the policy layer and add a small loader module that dynamically imports the Firebase client on demand. Refactor `App.ts` to call that loader only inside highscores fetch and eligible run-end submission paths, while preserving the same `disabled` and `offline` user-visible states.

**Tech Stack:** TypeScript, Vite dynamic imports, Vitest, jsdom, existing Firebase client module.

## Global Constraints

- Static frontend only; keep Vercel hosting simple and low-cost.
- Keep the app fully playable offline-first.
- Preserve current leaderboard policy:
  - fetch top 20 on demand
  - submit only when score `>= 100`
  - sanitize names exactly as today
- Low-score runs must show `skipped` without loading Firebase.
- Do not trigger leaderboard loading during:
  - app mount
  - title screen
  - tutorial
  - active gameplay
- Do not block game-over UI while submission is pending.
- Keep all existing leaderboard states user-visible and honest.
- No new runtime dependencies.
- Do not change gameplay rules, screen flow, persistence semantics, or art behavior.

---

### Task 1: Add A Cached Lazy Loader For The Leaderboard Service

**Files:**
- Create: `src/state/leaderboard/loadLeaderboardService.ts`
- Create: `src/state/leaderboard/loadLeaderboardService.test.ts`

**Interfaces:**
- Consumes:
  - `createLeaderboardService(client)` from `src/state/leaderboard/leaderboardService.ts`
  - `createLeaderboardClient()` from `src/lib/firebase/leaderboardClient.ts` via dynamic import
- Produces:
  - `loadLeaderboardService(): Promise<LeaderboardService>`
  - `clearLeaderboardServiceCache(): void`

- [x] **Step 1: Write the failing test**

Create `src/state/leaderboard/loadLeaderboardService.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createLeaderboardClient = vi.fn();
const createLeaderboardService = vi.fn();

vi.mock("./leaderboardService", () => ({
  createLeaderboardService,
}));

vi.mock("../../lib/firebase/leaderboardClient", () => ({
  createLeaderboardClient,
}));

describe("loadLeaderboardService", () => {
  beforeEach(() => {
    vi.resetModules();
    createLeaderboardClient.mockReset();
    createLeaderboardService.mockReset();
  });

  afterEach(async () => {
    const mod = await import("./loadLeaderboardService");
    mod.clearLeaderboardServiceCache();
  });

  it("loads and caches one leaderboard service promise", async () => {
    const fakeClient = { fetchTopScores: vi.fn(), submitScore: vi.fn() };
    const fakeService = { loadTopScores: vi.fn(), submitRun: vi.fn() };
    createLeaderboardClient.mockReturnValue(fakeClient);
    createLeaderboardService.mockReturnValue(fakeService);

    const mod = await import("./loadLeaderboardService");
    const first = await mod.loadLeaderboardService();
    const second = await mod.loadLeaderboardService();

    expect(first).toBe(fakeService);
    expect(second).toBe(fakeService);
    expect(createLeaderboardClient).toHaveBeenCalledTimes(1);
    expect(createLeaderboardService).toHaveBeenCalledTimes(1);
    expect(createLeaderboardService).toHaveBeenCalledWith(fakeClient);
  });

  it("clears the cached promise between runs", async () => {
    const fakeServiceA = { loadTopScores: vi.fn(), submitRun: vi.fn() };
    const fakeServiceB = { loadTopScores: vi.fn(), submitRun: vi.fn() };
    createLeaderboardClient.mockReturnValue(null);
    createLeaderboardService
      .mockReturnValueOnce(fakeServiceA)
      .mockReturnValueOnce(fakeServiceB);

    const mod = await import("./loadLeaderboardService");
    expect(await mod.loadLeaderboardService()).toBe(fakeServiceA);

    mod.clearLeaderboardServiceCache();

    expect(await mod.loadLeaderboardService()).toBe(fakeServiceB);
    expect(createLeaderboardService).toHaveBeenCalledTimes(2);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/state/leaderboard/loadLeaderboardService.test.ts`

Expected: FAIL with module-not-found for `./loadLeaderboardService`.

- [x] **Step 3: Write minimal implementation**

Create `src/state/leaderboard/loadLeaderboardService.ts`:

```ts
import type { LeaderboardService } from "./leaderboardService";
import { createLeaderboardService } from "./leaderboardService";

let cached: Promise<LeaderboardService> | null = null;

export function loadLeaderboardService(): Promise<LeaderboardService> {
  if (cached) return cached;

  cached = import("../../lib/firebase/leaderboardClient")
    .then(({ createLeaderboardClient }) => createLeaderboardService(createLeaderboardClient()))
    .catch((error) => {
      cached = null;
      throw error;
    });

  return cached;
}

export function clearLeaderboardServiceCache(): void {
  cached = null;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/state/leaderboard/loadLeaderboardService.test.ts`

Expected: PASS with 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/state/leaderboard/loadLeaderboardService.ts src/state/leaderboard/loadLeaderboardService.test.ts
git commit -m "feat: lazy-load leaderboard service"
```

### Task 2: Refactor App Boot To Use The Loader Only On Demand

**Files:**
- Modify: `src/app/App.ts`
- Modify: `src/app/appLeaderboardFlow.test.ts`

**Interfaces:**
- Consumes:
  - `loadLeaderboardService(): Promise<LeaderboardService>`
- Produces:
  - app behavior where leaderboard code is requested only for highscores and eligible submission

- [x] **Step 1: Write the failing test**

Replace the mock in `src/app/appLeaderboardFlow.test.ts` so it asserts loader timing instead of eager Firebase client timing:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRunController } from "../game/run/runState";

type AppHandle = {
  getScreen(): string;
  getFocusedAction(): string | null;
  tapSpace(): void;
  holdConfirmSpace(): void;
  finishRun(state: ReturnType<typeof createRunController>["state"]): void;
  destroy(): void;
};

const loadLeaderboardService = vi.fn();
const loadTopScores = vi.fn();
const submitRun = vi.fn();

vi.mock("../state/leaderboard/loadLeaderboardService", () => ({
  loadLeaderboardService,
}));

describe("mountApp leaderboard timing", () => {
  let host: HTMLElement;
  let app: AppHandle | null;

  beforeEach(() => {
    vi.resetModules();
    loadLeaderboardService.mockReset();
    loadTopScores.mockReset();
    submitRun.mockReset();
    loadTopScores.mockResolvedValue({ fetchState: "online", entries: [] });
    submitRun.mockResolvedValue("submitted");
    loadLeaderboardService.mockResolvedValue({ loadTopScores, submitRun });

    localStorage.clear();
    host = document.createElement("div");
    host.id = "app";
    document.body.appendChild(host);
    app = null;
  });

  afterEach(() => {
    app?.destroy();
    host.remove();
  });

  async function mount(): Promise<AppHandle> {
    const mod = await import("./App");
    return mod.mountApp(host) as unknown as AppHandle;
  }

  it("does not request the leaderboard loader on mount or when starting a run", async () => {
    app = await mount();
    expect(loadLeaderboardService).not.toHaveBeenCalled();

    app.tapSpace();
    app.holdConfirmSpace();

    expect(app.getScreen()).toBe("playing");
    expect(loadLeaderboardService).not.toHaveBeenCalled();
  });

  it("requests the leaderboard loader when entering highscores", async () => {
    app = await mount();
    app.tapSpace();
    app.holdConfirmSpace();

    const rc = createRunController(0);
    rc.state.score = 1200;
    rc.state.wave = 6;
    rc.state.status = "gameOver";
    app.finishRun(rc.state);

    app.tapSpace();
    app.holdConfirmSpace();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(app.getScreen()).toBe("highscores");
    expect(loadLeaderboardService).toHaveBeenCalledTimes(1);
    expect(loadTopScores).toHaveBeenCalledTimes(1);
  });

  it("does not request the loader for ineligible scores but does for eligible scores", async () => {
    app = await mount();
    app.tapSpace();
    app.holdConfirmSpace();

    const low = createRunController(0);
    low.state.score = 99;
    low.state.wave = 2;
    low.state.status = "gameOver";
    app.finishRun(low.state);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loadLeaderboardService).not.toHaveBeenCalled();
    expect(submitRun).not.toHaveBeenCalled();

    const high = createRunController(0);
    high.state.score = 300;
    high.state.wave = 3;
    high.state.status = "gameOver";
    app.finishRun(high.state);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loadLeaderboardService).toHaveBeenCalledTimes(1);
    expect(submitRun).toHaveBeenCalledTimes(1);
    expect(submitRun).toHaveBeenCalledWith(
      expect.objectContaining({ score: 300, wave: 3 }),
      expect.any(String),
    );
  });

  it("shows offline when the lazy loader itself rejects", async () => {
    loadLeaderboardService.mockRejectedValueOnce(new Error("chunk failed"));
    app = await mount();
    app.tapSpace();
    app.holdConfirmSpace();

    const rc = createRunController(0);
    rc.state.score = 1200;
    rc.state.wave = 6;
    rc.state.status = "gameOver";
    app.finishRun(rc.state);

    app.tapSpace();
    app.holdConfirmSpace();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(app.getScreen()).toBe("highscores");
    expect(host.textContent).toContain("Leaderboard offline");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/appLeaderboardFlow.test.ts`

Expected: FAIL because `App.ts` still eagerly constructs the leaderboard service and still imports the Firebase client directly.

- [x] **Step 3: Write minimal implementation**

Update `src/app/App.ts`:

```ts
import { loadLeaderboardService } from "../state/leaderboard/loadLeaderboardService";
```

Remove:

```ts
import { createLeaderboardClient } from "../lib/firebase/leaderboardClient";
import { createLeaderboardService, localFriendsResult } from "../state/leaderboard/leaderboardService";
```

Replace with:

```ts
import { localFriendsResult } from "../state/leaderboard/leaderboardService";
```

Delete the eager construction:

```ts
const leaderboard = createLeaderboardService(createLeaderboardClient());
```

Change `finishRun(...)` to:

```ts
    if (lastRunStats.score < 100) {
      submitOutcome = "skipped";
      return;
    }

    void loadLeaderboardService()
      .then((leaderboard) => leaderboard.submitRun(lastRunStats, store.getPlayerName()))
      .then((outcome) => {
        submitOutcome = outcome;
        if (screenState.get() === "gameOver") render();
      })
      .catch(() => {
        submitOutcome = "offline";
        if (screenState.get() === "gameOver") render();
      });
```

Change `loadHighscores()` to:

```ts
  async function loadHighscores(): Promise<void> {
    leaderboardView = { ...leaderboardView, tab: "global" };
    if (screenState.get() === "highscores") render();

    try {
      const leaderboard = await loadLeaderboardService();
      const result = await leaderboard.loadTopScores();

      if (screenState.get() === "highscores" && leaderboardView.tab !== "global") return;
      leaderboardView = {
        state: result.fetchState,
        tab: "global",
        entries: result.entries,
        you: buildLocalPlayerEntry(),
      };
    } catch {
      if (screenState.get() === "highscores" && leaderboardView.tab !== "global") return;
      leaderboardView = {
        state: "offline",
        tab: "global",
        entries: [],
        you: buildLocalPlayerEntry(),
      };
    }

    if (screenState.get() === "highscores") render();
  }
```

Remove the old eager-submit block and old `loadHighscores()` implementation completely.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/app/appLeaderboardFlow.test.ts`

Expected: PASS with 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/app/App.ts src/app/appLeaderboardFlow.test.ts
git commit -m "refactor: lazy-load leaderboard in app shell"
```

### Task 3: Verify No Regressions In Leaderboard Units And Production Build

**Files:**
- Modify: none unless a failing test exposes a required fix
- Test: `src/lib/firebase/leaderboardClient.test.ts`
- Test: `src/state/leaderboard/leaderboardService.test.ts`
- Test: `src/app/appFlow.test.ts`

**Interfaces:**
- Consumes:
  - lazy loader from Task 1
  - app integration from Task 2
- Produces:
  - verification evidence that bundle-facing behavior changed without changing user-visible semantics

- [x] **Step 1: Run the focused regression tests**

Run:

```bash
npm test -- --run src/state/leaderboard/loadLeaderboardService.test.ts src/app/appLeaderboardFlow.test.ts src/lib/firebase/leaderboardClient.test.ts src/state/leaderboard/leaderboardService.test.ts src/app/appFlow.test.ts
```

Expected: PASS with all targeted leaderboard/app tests green.

- [x] **Step 2: Run the full suite**

Run:

```bash
npm test -- --run
```

Expected: PASS with 0 failing tests.

- [x] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: PASS with Vite build output and no TypeScript errors.

- [x] **Step 4: Record the verification evidence**

Capture in the execution report or final handoff:

```txt
- app mount no longer imports Firebase eagerly
- highscores path lazy-loads leaderboard service
- eligible run-end submission lazy-loads leaderboard service
- low-score path returns skipped without Firebase load
- loader rejection surfaces offline
- full tests pass
- production build passes
- Evidence: full suite passed with 31 test files and 169 tests; `npm run build` passed.
- Evidence: Vite emitted `index-D2Y9jM4G.js` at 53.52 kB and a separate `leaderboardClient-B5IAgwF7.js` chunk at 344.46 kB.
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "test: verify lazy-loaded leaderboard polish"
```
