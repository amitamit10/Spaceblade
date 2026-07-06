export const scoreGradeThresholds = [
  { grade: "B", minScore: 500 },
  { grade: "C", minScore: 1000 },
  { grade: "A", minScore: 1500 },
  { grade: "S", minScore: 3000 },
  { grade: "SS", minScore: 5000 },
  { grade: "SSS", minScore: 7000 },
] as const;

export const parryStreakBonuses = [
  { streak: 10, bonus: 500 },
  { streak: 25, bonus: 1500 },
  { streak: 50, bonus: 3000 },
] as const;

export const cleanWaveBonusMultiplier = 1.5;

export type Grade = "B" | "C" | "A" | "S" | "SS" | "SSS";

/** Combo multiplier applied to KILL score only (never to parry or bonus points). */
export function comboMultiplier(combo: number): number {
  if (combo >= 100) return 1.4;
  if (combo >= 75) return 1.3;
  if (combo >= 50) return 1.2;
  if (combo >= 25) return 1.1;
  if (combo >= 10) return 1.05;
  return 1.0;
}

/** Score awarded for a kill at the given base value and current combo. */
export function killScore(baseScore: number, combo: number): number {
  return Math.round(baseScore * comboMultiplier(combo));
}

/** Wave-clear bonus: 250 * wave, multiplied by 1.5 when the wave was damage-free. */
export function waveClearBonus(wave: number, clean: boolean): number {
  const base = 250 * wave;
  return Math.round(clean ? base * cleanWaveBonusMultiplier : base);
}

/** Returns the streak bonus when `streak` exactly reaches a threshold, else 0. */
export function streakBonusAt(streak: number): number {
  const hit = parryStreakBonuses.find((t) => t.streak === streak);
  return hit ? hit.bonus : 0;
}

/** Highest grade whose threshold the score meets, or null below 500. */
export function gradeForScore(score: number): Grade | null {
  let grade: Grade | null = null;
  for (const tier of scoreGradeThresholds) {
    if (score >= tier.minScore) grade = tier.grade;
  }
  return grade;
}
