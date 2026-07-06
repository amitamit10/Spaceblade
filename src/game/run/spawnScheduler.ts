import type { EnemyType } from "../../app/types";
import type { EnemyActor } from "../enemies/enemyFactory";
import { MAX_ACTIVE_THREAT_WEIGHT, MAX_ACTIVE_TANKS } from "../constants";
import { threatWeightOf } from "./waveTable";
import type { WaveEntry } from "./waveTable";

const isAlive = (e: EnemyActor): boolean => e.state !== "dead";

/** Sum of threat weight across living enemies. */
export function activeThreatWeight(enemies: readonly EnemyActor[]): number {
  return enemies.reduce((sum, e) => (isAlive(e) ? sum + threatWeightOf(e.type) : sum), 0);
}

/** Number of living tanks. */
export function activeTankCount(enemies: readonly EnemyActor[]): number {
  return enemies.reduce((n, e) => (isAlive(e) && e.type === "tank" ? n + 1 : n), 0);
}

/** Effective active-weight cap: the tighter of the wave cap and the global cap. */
export function effectiveWeightCap(waveMaxWeight: number): number {
  return Math.min(waveMaxWeight, MAX_ACTIVE_THREAT_WEIGHT);
}

/** Whether there is room under the active-weight cap for another enemy. */
export function canSpawnMore(enemies: readonly EnemyActor[], waveMaxWeight: number): boolean {
  return activeThreatWeight(enemies) < effectiveWeightCap(waveMaxWeight);
}

function pickFromMix(mix: WaveEntry["mix"], rng: () => number): EnemyType {
  const entries = Object.entries(mix) as Array<[EnemyType, number]>;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [type, weight] of entries) {
    r -= weight;
    if (r <= 0) return type;
  }
  return entries[entries.length - 1][0];
}

/**
 * Chooses the next enemy type to spawn for a wave, honoring the active-weight
 * cap and the max-tank limit. Returns null when no spawn is allowed right now.
 * The boss is never returned here; it is spawned explicitly by the run flow.
 */
export function chooseNextSpawn(
  waveEntry: WaveEntry,
  enemies: readonly EnemyActor[],
  rng: () => number = Math.random,
): EnemyType | null {
  const cap = effectiveWeightCap(waveEntry.maxWeight);
  const currentWeight = activeThreatWeight(enemies);
  if (currentWeight >= cap) return null;

  let type = pickFromMix(waveEntry.mix, rng);

  const tanksBlocked =
    type === "tank" &&
    (activeTankCount(enemies) >= MAX_ACTIVE_TANKS || currentWeight + 2 > cap);
  if (tanksBlocked) type = "grunt";

  // Final guard: never exceed the cap.
  if (currentWeight + threatWeightOf(type) > cap) return null;
  return type;
}
