import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as fsLimit,
  serverTimestamp,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { LeaderboardEntry } from "../../app/types";
import { getFirebaseConfig } from "./config";

const COLLECTION = "leaderboardScores";

export type LeaderboardClient = {
  fetchTopScores(max: number): Promise<LeaderboardEntry[]>;
  submitScore(entry: LeaderboardEntry): Promise<void>;
};

/**
 * Firestore-backed leaderboard client. Returns null when Firebase is not
 * configured so callers can present a "disabled" leaderboard. Reads happen only
 * on demand (title/highscores) and writes only at run end — no realtime.
 */
export function createLeaderboardClient(): LeaderboardClient | null {
  const config = getFirebaseConfig();
  if (!config) return null;

  let db: Firestore | null = null;
  const database = (): Firestore => {
    if (!db) db = getFirestore(initializeApp(config));
    return db;
  };

  return {
    fetchTopScores: async (max) => {
      const q = query(collection(database(), COLLECTION), orderBy("score", "desc"), fsLimit(max));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          playerName: String(d.playerName ?? "Pilot"),
          score: Number(d.score ?? 0),
          wave: Number(d.wave ?? 0),
          enemiesDefeated: Number(d.enemiesDefeated ?? 0),
          parries: Number(d.parries ?? 0),
          grade: (d.grade ?? null) as LeaderboardEntry["grade"],
          createdAt: Number(d.createdAt?.toMillis?.() ?? 0),
          clientRunId: String(d.clientRunId ?? ""),
        };
      });
    },
    submitScore: async (entry) => {
      await addDoc(collection(database(), COLLECTION), {
        playerName: entry.playerName,
        score: entry.score,
        wave: entry.wave,
        enemiesDefeated: entry.enemiesDefeated,
        parries: entry.parries,
        grade: entry.grade,
        clientRunId: entry.clientRunId,
        createdAt: serverTimestamp(),
      });
    },
  };
}
