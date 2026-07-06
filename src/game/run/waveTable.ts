import type { EnemyType } from "../../app/types";
import { enemyStats } from "../enemies/enemyStats";

export type WaveEntry = {
  wave: number;
  spawnEveryMs: number;
  mix: Partial<Record<EnemyType, number>>;
  maxWeight: number;
  includesBoss: boolean;
};

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
] as const satisfies readonly WaveEntry[];

export const FINAL_WAVE = 15;

/** Returns the wave entry for a 1-based wave number (clamped to the table). */
export function getWaveEntry(wave: number): WaveEntry {
  const index = Math.min(Math.max(wave, 1), waveTable.length) - 1;
  return waveTable[index];
}

/** Kills required to clear a (non-boss) wave. */
export function waveClearThreshold(wave: number): number {
  return 6 + wave * 2;
}

/** Threat weight a single enemy of `type` contributes to the active cap. */
export function threatWeightOf(type: EnemyType): number {
  return enemyStats[type].threatWeight;
}
