import type { LeaderboardEntry, RunStats } from "../../app/types";

export type LeaderboardFetchState = "online" | "offline" | "disabled";

export type LeaderboardResult = {
  fetchState: LeaderboardFetchState;
  entries: LeaderboardEntry[];
};

export type SubmitOutcome = "submitted" | "skipped" | "offline" | "disabled";

export type LeaderboardClient = {
  fetchTopScores(max: number): Promise<LeaderboardEntry[]>;
  submitScore(entry: LeaderboardEntry): Promise<void>;
};

export const MIN_SUBMIT_SCORE = 0;
export const MAX_NAME_LENGTH = 16;
export const DEFAULT_PLAYER_NAME = "Pilot";
const TOP_LIMIT = 20;

/** Restricts a name to letters, numbers, spaces, hyphen, underscore; caps at 16. */
export function sanitizePlayerName(name: string): string {
  const cleaned = name
    .replace(/[^A-Za-z0-9 _-]/g, "")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  return cleaned.length > 0 ? cleaned : DEFAULT_PLAYER_NAME;
}

function makeRunId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `run-${Math.floor(Date.now())}-${Math.floor(performance.now())}`;
}

export type LeaderboardService = {
  loadTopScores(): Promise<LeaderboardResult>;
  submitRun(stats: RunStats, playerName: string): Promise<SubmitOutcome>;
};

/**
 * Wraps a leaderboard client (or null for "not configured") with the app's
 * submit/fetch policy. Never throws: network failures surface as "offline" and
 * a missing client surfaces as "disabled", so gameplay is never blocked.
 */
export function createLeaderboardService(client: LeaderboardClient | null): LeaderboardService {
  return {
    loadTopScores: async () => {
      if (!client) return { fetchState: "disabled", entries: [] };
      try {
        const entries = await client.fetchTopScores(TOP_LIMIT);
        return { fetchState: "online", entries };
      } catch {
        return { fetchState: "offline", entries: [] };
      }
    },

    submitRun: async (stats, playerName) => {
      if (!client) return "disabled";
      if (stats.score < MIN_SUBMIT_SCORE) return "skipped";

      const entry: LeaderboardEntry = {
        playerName: sanitizePlayerName(playerName),
        score: Math.floor(stats.score),
        wave: stats.wave,
        enemiesDefeated: stats.enemiesDefeated,
        parries: stats.parries,
        grade: stats.grade,
        createdAt: Math.floor(Date.now()),
        clientRunId: makeRunId(),
      };

      try {
        await client.submitScore(entry);
        return "submitted";
      } catch {
        return "offline";
      }
    },
  };
}

/**
 * Builds the "Friends" tab purely from local data — a single row for the
 * player's own best result. Never touches the network in v1 (no social graph).
 */
export function localFriendsResult(
  bestScore: number,
  bestWave: number,
  playerName: string,
): LeaderboardResult {
  if (bestScore <= 0) return { fetchState: "online", entries: [] };
  return {
    fetchState: "online",
    entries: [
      {
        playerName: sanitizePlayerName(playerName),
        score: bestScore,
        wave: bestWave,
        enemiesDefeated: 0,
        parries: 0,
        grade: null,
        createdAt: 0,
        clientRunId: "local-best",
      },
    ],
  };
}
