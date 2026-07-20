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
