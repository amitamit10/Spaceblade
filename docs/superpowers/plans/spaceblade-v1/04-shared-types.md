# Shared Type Contracts

Create `src/app/types.ts` during Task 1 and keep these public names stable:

```ts
export type GameScreen =
  | "title"
  | "tutorial"
  | "playing"
  | "paused"
  | "settings"
  | "gameOver"
  | "highscores"
  | "mobileWarning";

export type InputAction =
  | "tap"
  | "holdStart"
  | "holdRelease"
  | "doubleTap"
  | "parry";

export type PlayerStateName =
  | "idle"
  | "slashing"
  | "charging"
  | "heavySlashing"
  | "dodging"
  | "parrying"
  | "hurt"
  | "dead";

export type EnemyType =
  | "grunt"
  | "runner"
  | "shield"
  | "tank"
  | "glitch"
  | "boss";

export type Facing = "left" | "right";

export type SettingsState = {
  volume: number;
  screenShakeEnabled: boolean;
  reducedEffectsEnabled: boolean;
};

export type RunStats = {
  score: number;
  wave: number;
  hearts: number;
  enemiesDefeated: number;
  parries: number;
  perfectParryStreak: number;
  bestCombo: number;
  grade: "B" | "C" | "A" | "S" | "SS" | "SSS" | null;
};

export type LeaderboardEntry = {
  playerName: string;
  score: number;
  wave: number;
  enemiesDefeated: number;
  parries: number;
  grade: "B" | "C" | "A" | "S" | "SS" | "SSS" | null;
  createdAt: number;
  clientRunId: string;
};
```
