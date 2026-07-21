import type { RebuildPlayerAnimation } from "../rebuild/rebuildGame";
import type { RebuildFloorTraversalPhase } from "../rebuild/renderScene";

export function clampSpriteCenterX(
  x: number,
  frameWidth: number,
  scale: number,
  viewportWidth: number,
): number {
  if (viewportWidth <= 0) return x;
  const halfWidth = Math.max(0, frameWidth * scale / 2);
  if (halfWidth * 2 >= viewportWidth) return viewportWidth / 2;
  return Math.max(halfWidth, Math.min(viewportWidth - halfWidth, x));
}

export function playerVisualAnimation(
  action: RebuildPlayerAnimation | "hurt" | "dead",
  available: ReadonlySet<string>,
): string {
  if (available.has(action)) return action;
  if (available.has("slash")) return "slash";
  return "idle";
}

export function playerTraversalAnimation(
  phase: RebuildFloorTraversalPhase,
  available: ReadonlySet<string>,
): string {
  const preferred = phase === "wall-climb"
    ? "climb"
    : phase === "pause"
      ? "hang"
      : phase === "landing"
        ? "fall"
        : phase === "vault"
          ? "jump"
          : "run";
  if (available.has(preferred)) return preferred;
  return available.has("run") ? "run" : "idle";
}

export function enemyVisualAnimation(
  state: "approaching" | "attacking" | "stunned",
  timeToImpact: number,
  available: ReadonlySet<string>,
  recoveryElapsed = -1,
  isBoss = false,
  recoveryDurationMs = 220,
): string {
  if (state === "attacking") {
    if (recoveryElapsed >= 0 && recoveryElapsed < recoveryDurationMs && available.has("recover")) return "recover";
    if (recoveryElapsed >= recoveryDurationMs && available.has("windup")) return "windup";
    if (isBoss && timeToImpact <= 180 && available.has("specialAttack")) return "specialAttack";
    if (timeToImpact > 180 && available.has("windup")) return "windup";
    if (available.has("attack")) return "attack";
  }
  if (state === "stunned" && available.has("hurt")) return "hurt";
  return available.has("walk") ? "walk" : "idle";
}

export function enemyAnimationElapsed(
  state: "approaching" | "attacking" | "stunned",
  now: number,
  startedAt: number,
  nextAttackAt: number,
  recoveryAt = -1,
): number {
  if (state === "attacking" && recoveryAt >= 0) return Math.max(0, now - recoveryAt);
  if (state === "attacking") return Math.max(0, 180 - (nextAttackAt - now));
  return Math.max(0, now - startedAt);
}

export function enemyDeathVisualAnimation(available: ReadonlySet<string>): string {
  if (available.has("dead")) return "dead";
  return available.has("walk") ? "walk" : "idle";
}

export function enemyHitVisualAnimation(available: ReadonlySet<string>): string {
  if (available.has("hurt")) return "hurt";
  return available.has("walk") ? "walk" : "idle";
}

export function enemyHitIsVisible(elapsed: number, duration = 160): boolean {
  return elapsed >= 0 && elapsed <= duration;
}

export type ParryTimingSignal = "tooEarly" | "perfect" | "tooLate";

export function parryTimingSignal(timeToImpact: number): ParryTimingSignal {
  if (timeToImpact > 150) return "tooEarly";
  if (timeToImpact >= -90) return "perfect";
  return "tooLate";
}

export function enemyDeathAnimationElapsed(now: number, deathAt: number): number {
  return Math.max(0, now - deathAt);
}

export function enemyDeathIsVisible(elapsed: number, duration = 360): boolean {
  return elapsed <= duration;
}
