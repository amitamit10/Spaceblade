import type { EnemyActor } from "../enemies/enemyFactory";
import type { RunStats } from "../../app/types";
import { enemyStats } from "../enemies/enemyStats";
import { killScore, waveClearBonus, streakBonusAt, gradeForScore } from "./scoreSystem";
import { getWaveEntry, waveClearThreshold } from "./waveTable";

const WAVE_START_GRACE_MS = 900;

export type RunStatus = "ready" | "running" | "waveClear" | "gameOver" | "victory";

export type RunState = {
  status: RunStatus;
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

export type WaveAdvance = { advanced: boolean; clean: boolean };

export type RunController = {
  state: RunState;
  addEnemy(enemy: EnemyActor): void;
  removeEnemy(id: string): void;
  /** Register a kill; boss kills also end the run in victory. Returns points added. */
  registerKill(enemy: EnemyActor, now: number): void;
  registerParry(now: number): void;
  registerDamage(now: number): void;
  /** Attempt to clear the current (non-boss) wave and advance. */
  tryAdvanceWave(now: number): WaveAdvance;
  defeatedThisWave(): number;
  spawnedThisWave(): number;
};

/**
 * Owns the mutable run state plus the bookkeeping the public RunState shape
 * doesn't carry (per-run streak awards, per-wave spawn/defeat counters).
 */
export function createRunController(now: number): RunController {
  const state: RunState = {
    status: "running",
    wave: 1,
    score: 0,
    combo: 0,
    bestCombo: 0,
    perfectParryStreak: 0,
    damageTakenThisWave: 0,
    hearts: 3,
    enemiesDefeated: 0,
    parries: 0,
    activeEnemies: [],
    nextSpawnAt: now + WAVE_START_GRACE_MS,
    startedAt: now,
    endedAt: null,
  };

  const awardedStreaks = new Set<number>();
  let defeated = 0;
  let spawned = 0;

  const bumpCombo = (): void => {
    state.combo += 1;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
  };

  const controller: RunController = {
    state,

    addEnemy: (enemy) => {
      state.activeEnemies.push(enemy);
      spawned += 1;
    },

    removeEnemy: (id) => {
      state.activeEnemies = state.activeEnemies.filter((e) => e.id !== id);
    },

    registerKill: (enemy, time) => {
      state.score += killScore(enemyStats[enemy.type].score, state.combo);
      bumpCombo();
      state.enemiesDefeated += 1;
      defeated += 1;
      if (enemy.type === "boss") {
        state.status = "victory";
        state.endedAt = time;
      }
    },

    registerParry: () => {
      state.score += 100;
      bumpCombo();
      state.parries += 1;
      state.perfectParryStreak += 1;
      const bonus = streakBonusAt(state.perfectParryStreak);
      if (bonus > 0 && !awardedStreaks.has(state.perfectParryStreak)) {
        state.score += bonus;
        awardedStreaks.add(state.perfectParryStreak);
      }
    },

    registerDamage: (time) => {
      if (state.status !== "running") return;
      state.hearts -= 1;
      state.damageTakenThisWave += 1;
      state.combo = 0;
      state.perfectParryStreak = 0;
      if (state.hearts <= 0) {
        state.hearts = 0;
        state.status = "gameOver";
        state.endedAt = time;
      }
    },

    tryAdvanceWave: (now) => {
      const entry = getWaveEntry(state.wave);
      if (entry.includesBoss) return { advanced: false, clean: false };
      const ready =
        defeated >= waveClearThreshold(state.wave) && state.activeEnemies.length === 0;
      if (!ready) return { advanced: false, clean: false };

      const clean = state.damageTakenThisWave === 0;
      state.score += waveClearBonus(state.wave, clean);
      state.wave += 1;
      state.hearts = 3;
      state.damageTakenThisWave = 0;
      defeated = 0;
      spawned = 0;
      state.status = "running";
      state.nextSpawnAt = now + WAVE_START_GRACE_MS;
      return { advanced: true, clean };
    },

    defeatedThisWave: () => defeated,
    spawnedThisWave: () => spawned,
  };

  return controller;
}

/** Snapshot the run into the public RunStats shape, computing the final grade. */
export function toRunStats(state: RunState): RunStats {
  return {
    score: state.score,
    wave: state.wave,
    hearts: state.hearts,
    enemiesDefeated: state.enemiesDefeated,
    parries: state.parries,
    perfectParryStreak: state.perfectParryStreak,
    bestCombo: state.bestCombo,
    grade: gradeForScore(state.score),
  };
}
