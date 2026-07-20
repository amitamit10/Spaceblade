import { afterEach, describe, expect, it, vi } from "vitest";
import type { LeaderboardEntry } from "../../app/types";

type FirebaseConfigShape = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

const CONFIG: FirebaseConfigShape = {
  apiKey: "key",
  authDomain: "spaceblade.firebaseapp.com",
  projectId: "spaceblade",
  appId: "app",
};

const firestoreFns = vi.hoisted(() => {
  const initializeApp = vi.fn(() => ({ app: "firebase-app" }));
  const getFirestore = vi.fn(() => ({ db: "firestore" }));
  const collection = vi.fn((db, name: string) => ({ db, name, kind: "collection" }));
  const orderBy = vi.fn((field: string, direction: string) => ({ field, direction, kind: "orderBy" }));
  const limit = vi.fn((count: number) => ({ count, kind: "limit" }));
  const query = vi.fn((...parts) => ({ parts, kind: "query" }));
  const getDocs = vi.fn();
  const addDoc = vi.fn();
  const serverTimestamp = vi.fn(() => ({ kind: "serverTimestamp" }));

  return {
    initializeApp,
    getFirestore,
    collection,
    orderBy,
    limit,
    query,
    getDocs,
    addDoc,
    serverTimestamp,
  };
});

vi.mock("firebase/app", () => ({
  initializeApp: firestoreFns.initializeApp,
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: firestoreFns.getFirestore,
  collection: firestoreFns.collection,
  orderBy: firestoreFns.orderBy,
  limit: firestoreFns.limit,
  query: firestoreFns.query,
  getDocs: firestoreFns.getDocs,
  addDoc: firestoreFns.addDoc,
  serverTimestamp: firestoreFns.serverTimestamp,
}));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

async function loadClient(config: FirebaseConfigShape | null) {
  vi.doMock("./config", () => ({
    getFirebaseConfig: () => config,
  }));
  return import("./leaderboardClient");
}

describe("createLeaderboardClient", () => {
  it("returns null when Firebase config is missing", async () => {
    const { createLeaderboardClient } = await loadClient(null);

    expect(createLeaderboardClient()).toBeNull();
  });

  it("fetches top scores ordered by score descending and maps Firestore docs", async () => {
    firestoreFns.getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            playerName: "Neo",
            score: 4500,
            wave: 12,
            enemiesDefeated: 99,
            parries: 14,
            grade: "SS",
            clientRunId: "run-1",
            createdAt: { toMillis: () => 1234 },
          }),
        },
        {
          data: () => ({
            playerName: "Pilot",
            score: 4500,
            wave: 12,
            enemiesDefeated: 99,
            parries: 14,
            grade: "SS",
            clientRunId: "run-2",
            createdAt: { toMillis: () => 2345 },
          }),
        },
      ],
    });

    const { createLeaderboardClient } = await loadClient(CONFIG);
    const client = createLeaderboardClient();
    expect(client).not.toBeNull();

    const entries = await client!.fetchTopScores(20);

    expect(firestoreFns.orderBy).toHaveBeenCalledWith("score", "desc");
    expect(firestoreFns.limit).toHaveBeenCalledWith(20);
    expect(entries).toEqual<LeaderboardEntry[]>([
      {
        playerName: "Pilot",
        score: 4500,
        wave: 12,
        enemiesDefeated: 99,
        parries: 14,
        grade: "SS",
        createdAt: 2345,
        clientRunId: "run-2",
      },
      {
        playerName: "Neo",
        score: 4500,
        wave: 12,
        enemiesDefeated: 99,
        parries: 14,
        grade: "SS",
        createdAt: 1234,
        clientRunId: "run-1",
      },
    ]);
  });

  it("submits a score to the leaderboardScores collection with a server timestamp", async () => {
    const { createLeaderboardClient } = await loadClient(CONFIG);
    const client = createLeaderboardClient();
    expect(client).not.toBeNull();

    const entry: LeaderboardEntry = {
      playerName: "Pilot",
      score: 999,
      wave: 5,
      enemiesDefeated: 25,
      parries: 4,
      grade: "B",
      createdAt: 0,
      clientRunId: "run-abc",
    };

    await client!.submitScore(entry);

    expect(firestoreFns.collection).toHaveBeenCalledWith({ db: "firestore" }, "leaderboardScores");
    expect(firestoreFns.addDoc).toHaveBeenCalledWith(
      { db: { db: "firestore" }, name: "leaderboardScores", kind: "collection" },
      {
        playerName: "Pilot",
        score: 999,
        wave: 5,
        enemiesDefeated: 25,
        parries: 4,
        grade: "B",
        clientRunId: "run-abc",
        createdAt: { kind: "serverTimestamp" },
      },
    );
  });
});
