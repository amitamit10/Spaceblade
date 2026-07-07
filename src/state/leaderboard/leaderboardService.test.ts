import { describe, it, expect, vi } from "vitest";
import {
  createLeaderboardService,
  sanitizePlayerName,
  localFriendsResult,
} from "./leaderboardService";
import type { LeaderboardClient } from "./leaderboardService";
import type { RunStats } from "../../app/types";

const stats = (score: number): RunStats => ({
  score,
  wave: 7,
  hearts: 0,
  enemiesDefeated: 42,
  parries: 8,
  perfectParryStreak: 3,
  bestCombo: 20,
  grade: score >= 1500 ? "A" : "B",
});

describe("sanitizePlayerName", () => {
  it("removes unsupported characters", () => {
    expect(sanitizePlayerName("Ne<o>@!Slasher")).toBe("NeoSlasher");
  });

  it("keeps letters, numbers, spaces, hyphen, underscore", () => {
    expect(sanitizePlayerName("Cool_Pilot-99 X")).toBe("Cool_Pilot-99 X");
  });

  it("caps length at 16 characters", () => {
    expect(sanitizePlayerName("ABCDEFGHIJKLMNOPQRSTUV")).toHaveLength(16);
  });

  it("falls back to Pilot when empty", () => {
    expect(sanitizePlayerName("!!!")).toBe("Pilot");
  });
});

describe("createLeaderboardService", () => {
  it("returns disabled when there is no client", async () => {
    const service = createLeaderboardService(null);
    expect(await service.loadTopScores()).toEqual({ fetchState: "disabled", entries: [] });
    expect(await service.submitRun(stats(5000), "Neo")).toBe("disabled");
  });

  it("returns offline when a fetch fails", async () => {
    const client: LeaderboardClient = {
      fetchTopScores: () => Promise.reject(new Error("network")),
      submitScore: () => Promise.resolve(),
    };
    expect(await createLeaderboardService(client).loadTopScores()).toEqual({
      fetchState: "offline",
      entries: [],
    });
  });

  it("returns online with entries on success", async () => {
    const client: LeaderboardClient = {
      fetchTopScores: () =>
        Promise.resolve([
          {
            playerName: "Neo",
            score: 9000,
            wave: 15,
            enemiesDefeated: 200,
            parries: 40,
            grade: "SSS",
            createdAt: 1,
            clientRunId: "x",
          },
        ]),
      submitScore: () => Promise.resolve(),
    };
    const res = await createLeaderboardService(client).loadTopScores();
    expect(res.fetchState).toBe("online");
    expect(res.entries).toHaveLength(1);
  });

  it("skips submissions below the minimum score", async () => {
    const submitScore = vi.fn(() => Promise.resolve());
    const client: LeaderboardClient = { fetchTopScores: () => Promise.resolve([]), submitScore };
    const outcome = await createLeaderboardService(client).submitRun(stats(50), "Neo");
    expect(outcome).toBe("skipped");
    expect(submitScore).not.toHaveBeenCalled();
  });

  it("submits eligible runs with a sanitized name", async () => {
    const captured: { name?: string } = {};
    const client: LeaderboardClient = {
      fetchTopScores: () => Promise.resolve([]),
      submitScore: (entry) => {
        captured.name = entry.playerName;
        return Promise.resolve();
      },
    };
    const outcome = await createLeaderboardService(client).submitRun(stats(3000), "Ne<o>!");
    expect(outcome).toBe("submitted");
    expect(captured.name).toBe("Neo");
  });

  it("reports offline when a submission fails", async () => {
    const client: LeaderboardClient = {
      fetchTopScores: () => Promise.resolve([]),
      submitScore: () => Promise.reject(new Error("network")),
    };
    expect(await createLeaderboardService(client).submitRun(stats(3000), "Neo")).toBe("offline");
  });
});

describe("localFriendsResult", () => {
  it("returns the local best row without any network call", () => {
    const res = localFriendsResult(4200, 11, "Neo");
    expect(res.fetchState).toBe("online");
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0]).toMatchObject({ playerName: "Neo", score: 4200, wave: 11 });
  });

  it("is empty when there is no local best yet", () => {
    expect(localFriendsResult(0, 0, "Neo").entries).toHaveLength(0);
  });
});
