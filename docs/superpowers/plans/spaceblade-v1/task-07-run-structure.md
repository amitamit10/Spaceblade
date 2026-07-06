# Task 7: Implement Waves, Spawns, Run State, Score, And Boss Wave

**Purpose:** Turn the finished actors into a complete 15-wave run.

**Read first:**

- `01-execution-rules.md`
- `02-global-constraints.md`
- `03-locked-constants.md`
- `04-shared-types.md`
- `task-06-rendering-audio.md`

**Files:**

- Create all `src/game/run` files from the target file map.
- Modify `src/game/scenes/mainGameScene.ts`.

**Exact run state:**

```ts
export type RunState = {
  status: "ready" | "running" | "waveClear" | "gameOver" | "victory";
  wave: number;
  score: number;
  combo: number;
  bestCombo: number;
  perfectParryStreak: number;
  damageTakenThisWave: number;
  hearts: number;
  enemiesDefeated: number;
  parries: number;
  activeEnemies: EnemyActor[];
  nextSpawnAt: number;
  startedAt: number;
  endedAt: number | null;
};
```

**Exact wave table:**

```ts
export const waveTable = [
  { wave: 1, spawnEveryMs: 2200, mix: { grunt: 1 }, maxWeight: 3, includesBoss: false },
  { wave: 2, spawnEveryMs: 2100, mix: { grunt: 0.8, runner: 0.2 }, maxWeight: 4, includesBoss: false },
  { wave: 3, spawnEveryMs: 1900, mix: { grunt: 0.7, runner: 0.3 }, maxWeight: 4, includesBoss: false },
  { wave: 4, spawnEveryMs: 1800, mix: { grunt: 0.6, runner: 0.3, shield: 0.1 }, maxWeight: 5, includesBoss: false },
  { wave: 5, spawnEveryMs: 1700, mix: { grunt: 0.55, runner: 0.3, shield: 0.15 }, maxWeight: 5, includesBoss: false },
  { wave: 6, spawnEveryMs: 1600, mix: { grunt: 0.45, runner: 0.3, shield: 0.15, tank: 0.1 }, maxWeight: 6, includesBoss: false },
  { wave: 7, spawnEveryMs: 1500, mix: { grunt: 0.4, runner: 0.3, shield: 0.15, tank: 0.15 }, maxWeight: 6, includesBoss: false },
  { wave: 8, spawnEveryMs: 1400, mix: { grunt: 0.35, runner: 0.3, shield: 0.15, tank: 0.1, glitch: 0.1 }, maxWeight: 6, includesBoss: false },
  { wave: 9, spawnEveryMs: 1300, mix: { grunt: 0.3, runner: 0.25, shield: 0.2, tank: 0.15, glitch: 0.1 }, maxWeight: 6, includesBoss: false },
  { wave: 10, spawnEveryMs: 1200, mix: { grunt: 0.25, runner: 0.25, shield: 0.2, tank: 0.15, glitch: 0.15 }, maxWeight: 6, includesBoss: false },
  { wave: 11, spawnEveryMs: 1150, mix: { grunt: 0.2, runner: 0.25, shield: 0.2, tank: 0.15, glitch: 0.2 }, maxWeight: 6, includesBoss: false },
  { wave: 12, spawnEveryMs: 1100, mix: { grunt: 0.18, runner: 0.22, shield: 0.2, tank: 0.2, glitch: 0.2 }, maxWeight: 6, includesBoss: false },
  { wave: 13, spawnEveryMs: 1000, mix: { grunt: 0.15, runner: 0.2, shield: 0.2, tank: 0.2, glitch: 0.25 }, maxWeight: 7, includesBoss: false },
  { wave: 14, spawnEveryMs: 900, mix: { grunt: 0.12, runner: 0.18, shield: 0.2, tank: 0.25, glitch: 0.25 }, maxWeight: 7, includesBoss: false },
  { wave: 15, spawnEveryMs: 1300, mix: { grunt: 0.2, runner: 0.2, shield: 0.15, tank: 0.15, glitch: 0.1 }, maxWeight: 6, includesBoss: true },
] as const;
```

**Exact scoring rules:**

- Add enemy `score` value on kill.
- Add `100` points per successful parry.
- Add `250 * wave` points on wave clear.
- If `damageTakenThisWave` is `0`, multiply the wave clear bonus by `1.5` and show a clean-wave feedback label.
- Combo increments on kills and parries.
- Combo resets when the player takes damage.
- Perfect parry streak increments only on successful parries and resets when the player takes damage.
- Award perfect parry streak bonuses once per run at these first-hit thresholds: 10 parries adds `500`, 25 parries adds `1500`, 50 parries adds `3000`.
- Compute grade from final score using `scoreGradeThresholds`; scores below 500 have grade `null`.
- Apply combo multiplier to kill score only:
  - combo 0-9: `1.0`
  - combo 10-24: `1.05`
  - combo 25-49: `1.10`
  - combo 50-74: `1.20`
  - combo 75-99: `1.30`
  - combo 100+: `1.40`

**Exact wave clear rules:**

- A non-boss wave ends when at least `6 + wave * 2` enemies have been defeated and no active enemies remain.
- Starting a new wave restores hearts to `3` and resets `damageTakenThisWave` to `0`.
- Wave 15 ends in `victory` when the boss dies.
- Game over occurs immediately when hearts reach zero.

**Required tests:**

- Wave table has exactly 15 waves and wave 15 includes boss.
- Active threat weight cap is respected.
- Tank and boss each count as weight 2.
- Score multiplier applies only to kill score.
- Damage resets combo.
- Clean-wave bonus applies only when no damage was taken in the current wave.
- Parry streak bonuses trigger exactly once at 10, 25, and 50 successful parries.
- Grade thresholds return the expected grade for scores 500, 1000, 1500, 3000, 5000, and 7000.
- Boss death sets run status to `victory`.

**Verification commands:**

```bash
npm test -- --run src/game/run src/game/enemies src/game/player
npm run build
```

**Quality gate:**

- A complete 15-wave run is playable locally.
- Difficulty increases through enemy mix and pacing.

**Commit:**

```bash
git add .
git commit -m "feat: implement full run progression"
```
