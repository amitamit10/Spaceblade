import { afterEach, describe, expect, it, vi } from "vitest";
import { hasRebuildFirebaseConfig, loadRebuildHighscores, submitRebuildRun } from "./rebuildLeaderboard";

vi.mock("../state/leaderboard/loadLeaderboardService", () => ({
  loadLeaderboardService: vi.fn(),
}));

import { loadLeaderboardService } from "../state/leaderboard/loadLeaderboardService";

describe("rebuild leaderboard adapter", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("requires all four Firebase values before enabling the online path", () => {
    expect(hasRebuildFirebaseConfig({})).toBe(false);
    expect(hasRebuildFirebaseConfig({ VITE_FIREBASE_API_KEY: "key", VITE_FIREBASE_AUTH_DOMAIN: "domain", VITE_FIREBASE_PROJECT_ID: "project" })).toBe(false);
    expect(hasRebuildFirebaseConfig({ VITE_FIREBASE_API_KEY: "key", VITE_FIREBASE_AUTH_DOMAIN: "domain", VITE_FIREBASE_PROJECT_ID: "project", VITE_FIREBASE_APP_ID: "app" })).toBe(true);
    expect(hasRebuildFirebaseConfig({ VITE_FIREBASE_API_KEY: "your_api_key", VITE_FIREBASE_AUTH_DOMAIN: "domain", VITE_FIREBASE_PROJECT_ID: "project", VITE_FIREBASE_APP_ID: "app" })).toBe(false);
    expect(hasRebuildFirebaseConfig({ VITE_FIREBASE_API_KEY: " key ", VITE_FIREBASE_AUTH_DOMAIN: " domain ", VITE_FIREBASE_PROJECT_ID: " project ", VITE_FIREBASE_APP_ID: " app " })).toBe(true);
  });

  it("keeps the local best visible when online leaderboard is disabled", async () => {
    vi.mocked(loadLeaderboardService).mockResolvedValue({
      loadTopScores: vi.fn().mockResolvedValue({ fetchState: "disabled", entries: [] }),
      submitRun: vi.fn(),
    });

    const result = await loadRebuildHighscores(900, 4, "Pilot");

    expect(result.fetchState).toBe("disabled");
    expect(result.entries[0]).toMatchObject({ score: 900, wave: 4, playerName: "Pilot" });
  });

  it("does not throw when lazy leaderboard loading fails", async () => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", "key");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "domain");
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "project");
    vi.stubEnv("VITE_FIREBASE_APP_ID", "app");
    vi.mocked(loadLeaderboardService).mockRejectedValue(new Error("missing config"));

    await expect(loadRebuildHighscores(0, 0)).resolves.toEqual({ fetchState: "offline", entries: [] });
  });

  it("turns a stalled online request into an offline result", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_FIREBASE_API_KEY", "key");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "domain");
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "project");
    vi.stubEnv("VITE_FIREBASE_APP_ID", "app");
    vi.mocked(loadLeaderboardService).mockReturnValue(new Promise(() => {}));

    const resultPromise = loadRebuildHighscores(0, 0);
    await vi.advanceTimersByTimeAsync(8_000);

    await expect(resultPromise).resolves.toEqual({ fetchState: "offline", entries: [] });
  });

  it("clears the timeout after a successful online read", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_FIREBASE_API_KEY", "key");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "domain");
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "project");
    vi.stubEnv("VITE_FIREBASE_APP_ID", "app");
    vi.mocked(loadLeaderboardService).mockResolvedValue({
      loadTopScores: vi.fn().mockResolvedValue({ fetchState: "online", entries: [] }),
      submitRun: vi.fn(),
    });

    await expect(loadRebuildHighscores(0, 0)).resolves.toEqual({ fetchState: "online", entries: [] });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("submits a completed rebuild run through the lazy service", async () => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", "key");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "domain");
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "project");
    vi.stubEnv("VITE_FIREBASE_APP_ID", "app");
    const submitRun = vi.fn().mockResolvedValue("submitted");
    vi.mocked(loadLeaderboardService).mockResolvedValue({ loadTopScores: vi.fn(), submitRun });
    const run = {
      score: 3000,
      wave: 3,
      hearts: 1,
      defeated: 8,
      parries: 2,
    } as never;

    await expect(submitRebuildRun(run, "Pilot")).resolves.toBe("submitted");
    expect(submitRun).toHaveBeenCalledWith(expect.objectContaining({ score: 3000, wave: 3, enemiesDefeated: 8, parries: 2, grade: "S" }), "Pilot");
  });

  it("skips low-score runs without loading the leaderboard service", async () => {
    vi.mocked(loadLeaderboardService).mockClear();
    const run = { score: 99 } as never;

    await expect(submitRebuildRun(run)).resolves.toBe("skipped");
    expect(loadLeaderboardService).not.toHaveBeenCalled();
  });
});
