import type { LeaderboardEntry, RunStats } from "../app/types";
import { loadLeaderboardService } from "../state/leaderboard/loadLeaderboardService";
import { localFriendsResult, type LeaderboardFetchState, type LeaderboardResult } from "../state/leaderboard/leaderboardService";
import type { RebuildRun } from "./rebuildGame";
import { gradeForScore } from "../game/run/scoreSystem";
import { isFirebaseConfigValue } from "../lib/firebase/config";

export type RebuildHighscores = {
  fetchState: LeaderboardFetchState;
  entries: LeaderboardEntry[];
};

type FirebaseEnv = {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
};

const LEADERBOARD_REQUEST_TIMEOUT_MS = 8_000;

async function loadTopScoresWithTimeout(): Promise<LeaderboardResult> {
  const request = loadLeaderboardService().then((service) => service.loadTopScores());
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Leaderboard request timed out")), LEADERBOARD_REQUEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export function hasRebuildFirebaseConfig(env: FirebaseEnv): boolean {
  return [
    env.VITE_FIREBASE_API_KEY,
    env.VITE_FIREBASE_AUTH_DOMAIN,
    env.VITE_FIREBASE_PROJECT_ID,
    env.VITE_FIREBASE_APP_ID,
  ].every(isFirebaseConfigValue);
}

export async function loadRebuildHighscores(bestScore: number, bestWave: number, playerName = "Pilot"): Promise<RebuildHighscores> {
  if (!hasRebuildFirebaseConfig(import.meta.env)) {
    return { fetchState: "disabled", entries: localFriendsResult(bestScore, bestWave, playerName).entries };
  }
  try {
    const result = await loadTopScoresWithTimeout();
    if (result.fetchState === "disabled") {
      return { fetchState: "disabled", entries: localFriendsResult(bestScore, bestWave, playerName).entries };
    }
    return result;
  } catch {
    return { fetchState: "offline", entries: [] };
  }
}

export async function submitRebuildRun(run: RebuildRun, playerName = "Pilot"): Promise<"submitted" | "skipped" | "offline" | "disabled"> {
  if (run.score < 100) return "skipped";
  if (!hasRebuildFirebaseConfig(import.meta.env)) return "disabled";
  try {
    const stats: RunStats = {
      score: run.score,
      wave: run.wave,
      hearts: run.hearts,
      enemiesDefeated: run.defeated,
      parries: run.parries,
      perfectParryStreak: 0,
      bestCombo: run.bestCombo,
      grade: gradeForScore(run.score),
    };
    return await (await loadLeaderboardService()).submitRun(stats, playerName);
  } catch {
    return "offline";
  }
}
