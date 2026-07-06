# Task 8: Implement Local Persistence And Firebase Leaderboard

**Purpose:** Add low-cost online leaderboard behavior without making gameplay depend on the network.

**Read first:**

- `01-execution-rules.md`
- `02-global-constraints.md`
- `03-locked-constants.md`
- `04-shared-types.md`
- `task-07-run-structure.md`

**Files:**

- Create all `src/lib/firebase` files from the target file map.
- Create all `src/state/persistence` files from the target file map.
- Create all `src/state/leaderboard` files from the target file map.
- Modify `src/ui/screens/highscoresScreen.ts`.
- Modify `src/ui/screens/gameOverScreen.ts`.

**Exact localStorage keys:**

- `spaceblade.bestScore`
- `spaceblade.bestWave`
- `spaceblade.settings`
- `spaceblade.tutorialSeen`
- `spaceblade.playerName`

**Exact Firebase env vars:**

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

**Exact Firestore collection:**

- Collection name: `leaderboardScores`
- Document shape:

```ts
{
  playerName: string;
  score: number;
  wave: number;
  enemiesDefeated: number;
  parries: number;
  grade: "B" | "C" | "A" | "S" | "SS" | "SSS" | null;
  clientRunId: string;
  createdAt: serverTimestamp();
}
```

**Exact leaderboard rules in app code:**

- Submit score only after `gameOver` or `victory`.
- Submit only if `score >= 100`.
- Default player name is `Pilot`.
- Sanitize player names to letters, numbers, spaces, hyphen, and underscore.
- Trim player names to 16 characters.
- Fetch top scores with `orderBy("score", "desc")` and `limit(20)`.
- No realtime snapshots.
- If Firebase config is missing, leaderboard service returns `{ fetchState: "disabled", entries: [] }`.
- If network fetch fails, leaderboard service returns `{ fetchState: "offline", entries: [] }`.
- The game must remain playable when leaderboard is disabled or offline.
- `Global` tab displays Firestore results.
- `Friends` tab displays the local best score row only; no social graph or account system exists in v1.

**Exact public API:**

```ts
export type LeaderboardFetchState = "online" | "offline" | "disabled";

export type LeaderboardResult = {
  fetchState: LeaderboardFetchState;
  entries: LeaderboardEntry[];
};

export function createLeaderboardService(client: {
  fetchTopScores(limit: number): Promise<LeaderboardEntry[]>;
  submitScore(entry: LeaderboardEntry): Promise<void>;
}): {
  loadTopScores(): Promise<LeaderboardResult>;
  submitRun(stats: RunStats, playerName: string): Promise<"submitted" | "skipped" | "offline" | "disabled">;
};
```

**Required tests:**

- Local settings persist and load defaults when missing.
- Local best score only updates when new score is higher.
- Missing Firebase config returns disabled result.
- Remote fetch failure returns offline result.
- Score below 100 is skipped.
- Player name sanitization removes unsupported characters and caps length.
- Friends tab data returns the local best score row without making network calls.

**Firestore rules to apply in Firebase before public leaderboard testing:**

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboardScores/{scoreId} {
      allow read: if true;
      allow create: if
        request.resource.data.keys().hasOnly([
          'playerName',
          'score',
          'wave',
          'enemiesDefeated',
          'parries',
          'grade',
          'clientRunId',
          'createdAt'
        ]) &&
        request.resource.data.playerName is string &&
        request.resource.data.playerName.size() >= 1 &&
        request.resource.data.playerName.size() <= 16 &&
        request.resource.data.score is int &&
        request.resource.data.score >= 100 &&
        request.resource.data.score <= 999999 &&
        request.resource.data.wave is int &&
        request.resource.data.wave >= 1 &&
        request.resource.data.wave <= 15 &&
        request.resource.data.enemiesDefeated is int &&
        request.resource.data.enemiesDefeated >= 0 &&
        request.resource.data.enemiesDefeated <= 500 &&
        request.resource.data.parries is int &&
        request.resource.data.parries >= 0 &&
        request.resource.data.parries <= 500 &&
        (
          request.resource.data.grade == null ||
          request.resource.data.grade in ['B', 'C', 'A', 'S', 'SS', 'SSS']
        ) &&
        request.resource.data.clientRunId is string &&
        request.resource.data.clientRunId.size() >= 8 &&
        request.resource.data.clientRunId.size() <= 80;
      allow update, delete: if false;
    }
  }
}
```

**Verification commands:**

```bash
npm test -- --run src/state src/lib
npm run build
```

**Quality gate:**

- Highscores screen shows online, offline, or disabled state clearly.
- Gameplay never waits for Firebase during an active run.
- Firebase usage is limited to run-end write and highscores/title read.

**Commit:**

```bash
git add .
git commit -m "feat: add firebase leaderboard persistence"
```
