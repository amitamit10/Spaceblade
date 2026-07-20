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
