import type { EnemyActor } from "./enemyFactory";
import { enemyStats } from "./enemyStats";
import { playerConfig } from "../player/playerConfig";
import { inputConfig } from "../input/inputConfig";
import { LEFT_COMBAT_LIMIT, RIGHT_COMBAT_LIMIT } from "../constants";

export type AttackKind = "quick" | "heavy" | "parry";

export type EnemyHitResult =
  | "missed"
  | "blocked"
  | "damaged"
  | "shieldBroken"
  | "killed"
  | "stunned";

const SHIELD_BASH_RECOVERY_MS = 420;
const BOSS_PARRY_STUN_MS = 450;
const GLITCH_TELEPORT_COOLDOWN_MS = 2200;

/** Puts an enemy into its telegraphed windup with a concrete impact time. */
export function enterWindup(enemy: EnemyActor, now: number): void {
  enemy.state = "windup";
  enemy.stateChangedAt = now;
  enemy.nextImpactAt = now + enemyStats[enemy.type].windupMs;
}

/**
 * A parry lands when the press falls within the window straddling the enemy's
 * telegraphed impact: [impact - parryBeforeImpactMs, impact + parryAfterImpactMs].
 */
export function isParryWindow(enemy: EnemyActor, now: number): boolean {
  if (enemy.nextImpactAt === null) return false;
  return (
    now >= enemy.nextImpactAt - inputConfig.parryBeforeImpactMs &&
    now <= enemy.nextImpactAt + inputConfig.parryAfterImpactMs
  );
}

/** Resolves a player attack against an enemy, mutating and returning the outcome. */
export function resolveHit(enemy: EnemyActor, kind: AttackKind, now: number): EnemyHitResult {
  if (enemy.state === "dead") return "missed";

  const kill = (): EnemyHitResult => {
    enemy.hp = 0;
    enemy.state = "dead";
    enemy.stateChangedAt = now;
    enemy.stunnedUntil = null;
    enemy.nextImpactAt = null;
    return "killed";
  };
  const stun = (ms: number): EnemyHitResult => {
    enemy.state = "stunned";
    enemy.stateChangedAt = now;
    enemy.stunnedUntil = now + ms;
    enemy.nextImpactAt = null;
    return "stunned";
  };
  const damage = (): EnemyHitResult => {
    enemy.hp -= 1;
    if (enemy.hp <= 0) return kill();
    enemy.state = "recovering";
    enemy.stateChangedAt = now;
    enemy.stunnedUntil = now + enemyStats[enemy.type].recoveryMs;
    enemy.nextImpactAt = null;
    return "damaged";
  };

  switch (enemy.type) {
    case "grunt":
    case "runner":
    case "glitch":
      // Fragile enemies: any clean hit ends them.
      return kill();

    case "shield":
      if (kind === "quick") return enemy.shielded ? "blocked" : kill();
      if (kind === "heavy") {
        if (enemy.shielded) {
          enemy.shielded = false;
          enemy.state = "recovering";
          enemy.stateChangedAt = now;
          enemy.stunnedUntil = now + SHIELD_BASH_RECOVERY_MS;
          enemy.nextImpactAt = null;
          return "shieldBroken";
        }
        return kill();
      }
      return stun(playerConfig.parryStunMs);

    case "tank":
      if (kind === "parry") return stun(playerConfig.parryStunMs);
      return damage();

    case "boss":
      if (kind === "parry") return stun(BOSS_PARRY_STUN_MS);
      return damage();

    default:
      return "missed";
  }
}

/**
 * Teleports a glitch to the opposite side once its cooldown has elapsed.
 * Returns the timestamp of the last teleport (unchanged if still on cooldown),
 * so the caller can track cadence without extra actor fields.
 */
export function teleportGlitch(
  enemy: EnemyActor,
  now: number,
  lastTeleportAt: number,
): number {
  if (now - lastTeleportAt < GLITCH_TELEPORT_COOLDOWN_MS) return lastTeleportAt;

  const nextSide = enemy.side === "left" ? "right" : "left";
  enemy.side = nextSide;
  enemy.x = nextSide === "left" ? LEFT_COMBAT_LIMIT + 40 : RIGHT_COMBAT_LIMIT - 40;
  enemy.facing = nextSide === "left" ? "right" : "left";
  enemy.state = "approaching";
  enemy.stateChangedAt = now;
  enemy.stunnedUntil = null;
  enemy.nextImpactAt = null;
  return now;
}
