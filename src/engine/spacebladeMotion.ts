export type EnemyVisualState = "approaching" | "attacking" | "stunned" | "dead";

export type EnemyVisualMotion = {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
};

export type GlitchTeleportPresentation = {
  readonly active: boolean;
  readonly alpha: number;
  readonly x: number;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export function glitchTeleportPresentation(now: number, teleportAt: number): GlitchTeleportPresentation {
  const remaining = teleportAt - now;
  if (remaining <= 0 || remaining > 260) return { active: false, alpha: 1, x: 0 };

  const pulse = Math.floor(remaining / 52) % 2;
  return {
    active: true,
    alpha: pulse === 0 ? 0.18 : 0.78,
    x: pulse === 0 ? -5 : 5,
  };
}

export function glitchTeleportCueDue(active: boolean, teleportAt: number, lastTeleportAt: number | null): boolean {
  return active && teleportAt !== lastTeleportAt;
}

/**
 * Presentation-only motion. Combat coordinates remain owned by rebuildGame;
 * this helper makes state changes readable without changing hitboxes.
 */
export function enemyVisualMotion(
  state: EnemyVisualState,
  now: number,
  enemyX: number,
  playerX: number,
  nextAttackAt: number,
): EnemyVisualMotion {
  if (state === "dead") return { x: 0, y: 0, angle: 0 };
  if (state === "approaching") {
    return {
      x: 0,
      y: Math.round(Math.sin(now / 110 + enemyX / 90) * 3),
      angle: Math.sin(now / 170 + enemyX / 120) * 1.5,
    };
  }
  if (state === "stunned") {
    return {
      x: 0,
      y: -8 + Math.round(Math.sin(now / 70) * 2),
      angle: Math.sin(now / 60) * 7,
    };
  }

  const impactProgress = clamp(1 - (nextAttackAt - now) / 180, 0, 1);
  if (impactProgress <= 0) return { x: 0, y: 0, angle: 0 };
  const direction = enemyX < playerX ? 1 : -1;
  return {
    x: Math.round(direction * impactProgress * 22),
    y: Math.round(-Math.sin(impactProgress * Math.PI) * 5),
    angle: direction * impactProgress * 8,
  };
}
