import type { InputAction } from "../../app/types";
import { PLAYER_X, GROUND_Y } from "../constants";
import { playerConfig } from "../player/playerConfig";
import type { PlayerStateMachine } from "../player/playerStateMachine";
import { enemyStats } from "../enemies/enemyStats";
import { createEnemy } from "../enemies/enemyFactory";
import type { EnemyActor } from "../enemies/enemyFactory";
import { resolveHit, isParryWindow, enterWindup, teleportGlitch } from "../enemies/enemyLogic";
import type { AttackKind, EnemyHitResult } from "../enemies/enemyLogic";
import type { EffectSystem } from "../rendering/effects";
import type { Camera } from "../rendering/camera";
import type { SoundBus } from "../audio/soundBus";
import type { SectorTheme } from "../rendering/sectorTheme";
import type { RunController } from "./runState";
import { getWaveEntry, waveClearThreshold } from "./waveTable";
import { canSpawnMore, chooseNextSpawn } from "./spawnScheduler";

export type GameDeps = {
  effects: EffectSystem;
  camera: Camera;
  sound: SoundBus;
  rng: () => number;
};

export type GameLoop = {
  processInput(action: InputAction, now: number): void;
  update(now: number, dtMs: number): void;
};

/** Background theme for a given wave. */
export function themeForWave(wave: number): SectorTheme {
  if (wave <= 5) return "neonCity";
  if (wave <= 10) return "industrialSector";
  return "corruptedCore";
}

const dirOf = (facing: "left" | "right"): number => (facing === "right" ? 1 : -1);
const facingFor = (enemy: EnemyActor): "left" | "right" =>
  enemy.x < PLAYER_X ? "left" : "right";

/**
 * Drives one run: player input resolution, enemy AI + telegraphed attacks,
 * spawning against the wave schedule, and wave advancement. All timing is
 * explicit so the scene can call it from a fixed-step loop.
 */
export function createGameLoop(
  controller: RunController,
  player: PlayerStateMachine,
  deps: GameDeps,
): GameLoop {
  const { effects, camera, sound, rng } = deps;
  let enemyIdSeq = 0;
  let bossSpawned = false;
  const lastTeleportAt = new Map<string, number>();

  const nextId = (): string => `e${(enemyIdSeq += 1)}`;

  const onHitResult = (res: EnemyHitResult, enemy: EnemyActor, now: number): void => {
    switch (res) {
      case "killed":
        effects.spawn("hitSpark", enemy.x, enemy.y - 20, now);
        sound.play("hit");
        controller.registerKill(enemy, now);
        controller.removeEnemy(enemy.id);
        break;
      case "damaged":
      case "shieldBroken":
        effects.spawn("hitSpark", enemy.x, enemy.y - 20, now);
        sound.play("hit");
        break;
      case "stunned":
        effects.spawn("parryFlash", enemy.x, enemy.y - 20, now);
        break;
      case "blocked":
        sound.play("hit");
        break;
      default:
        break;
    }
  };

  const resolveMelee = (kind: AttackKind, now: number): void => {
    const range = kind === "quick" ? playerConfig.quickSlashRange : playerConfig.heavySlashRange;
    const liveEnemies = controller.state.activeEnemies.filter((e) => e.state !== "dead");
    const nearest = [...liveEnemies].sort(
      (a, b) => Math.abs(a.x - PLAYER_X) - Math.abs(b.x - PLAYER_X),
    )[0];
    if (nearest) player.face(facingFor(nearest));

    const dir = dirOf(player.getSnapshot().facing);
    const inRange = liveEnemies
      .filter((e) => {
        const distance = e.x - PLAYER_X;
        if (kind === "heavy") return Math.abs(distance) <= range;
        const forwardDistance = distance * dir;
        return forwardDistance >= 0 && forwardDistance <= range;
      })
      .sort((a, b) => Math.abs(a.x - PLAYER_X) - Math.abs(b.x - PLAYER_X));
    const targets = kind === "quick" ? inRange.slice(0, 1) : inRange;

    effects.spawn(kind === "quick" ? "slashArc" : "shockwave", PLAYER_X, GROUND_Y, now, dir);
    sound.play("slash");
    if (kind === "quick") camera.shake(4, 120, now);
    else {
      camera.shake(9, 220, now);
      camera.zoomPulse(0.04, 220, now);
    }

    for (const enemy of targets) onHitResult(resolveHit(enemy, kind, now), enemy, now);
  };

  const resolveParry = (targets: EnemyActor[], now: number): void => {
    effects.spawn("parryFlash", PLAYER_X, GROUND_Y, now);
    effects.spawn("screenFlash", 0, 0, now);
    sound.play("parry");
    camera.shake(6, 160, now);
    controller.registerParry(now); // one successful parry event
    for (const enemy of targets) onHitResult(resolveHit(enemy, "parry", now), enemy, now);
  };

  const processInput = (action: InputAction, now: number): void => {
    if (controller.state.status !== "running") return;
    if (player.getSnapshot().state === "dead") return;

    switch (action) {
      case "holdStart":
        player.applyAction("holdStart", now);
        break;
      case "doubleTap":
        player.applyAction("doubleTap", now);
        effects.spawn("dashTrail", PLAYER_X, GROUND_Y, now, dirOf(player.getSnapshot().facing));
        break;
      case "tap": {
        const parryTargets = controller.state.activeEnemies.filter(
          (e) => e.state !== "dead" && isParryWindow(e, now),
        );
        if (parryTargets.length > 0) {
          player.applyAction("parry", now);
          resolveParry(parryTargets, now);
        } else {
          player.applyAction("tap", now);
          resolveMelee("quick", now);
        }
        break;
      }
      case "holdRelease":
        player.applyAction("holdRelease", now);
        if (player.getSnapshot().state === "heavySlashing") resolveMelee("heavy", now);
        break;
      default:
        break;
    }
  };

  const maybeSpawn = (now: number): void => {
    if (controller.state.status !== "running") return;
    if (now < controller.state.nextSpawnAt) return;

    const entry = getWaveEntry(controller.state.wave);
    const enemies = controller.state.activeEnemies;

    if (entry.includesBoss && !bossSpawned) {
      controller.addEnemy(createEnemy(nextId(), "boss", rng() < 0.5 ? "left" : "right"));
      bossSpawned = true;
      sound.play("boss");
      controller.state.nextSpawnAt = now + entry.spawnEveryMs;
      return;
    }

    // Non-boss waves stop committing new enemies once enough have been sent.
    if (!entry.includesBoss && controller.spawnedThisWave() >= waveClearThreshold(controller.state.wave)) {
      controller.state.nextSpawnAt = now + entry.spawnEveryMs;
      return;
    }

    if (canSpawnMore(enemies, entry.maxWeight)) {
      const type = chooseNextSpawn(entry, enemies, rng);
      if (type) {
        controller.addEnemy(createEnemy(nextId(), type, rng() < 0.5 ? "left" : "right"));
        sound.play("enemyAlert");
      }
    }
    controller.state.nextSpawnAt = now + entry.spawnEveryMs;
  };

  const updateEnemies = (now: number, dtMs: number): void => {
    const step = dtMs / 1000;
    const afterWave8 = controller.state.wave > 8;

    for (const enemy of controller.state.activeEnemies) {
      if (enemy.state === "dead") continue;

      if (enemy.state === "stunned" || enemy.state === "recovering") {
        if (enemy.stunnedUntil !== null && now >= enemy.stunnedUntil) {
          enemy.state = "approaching";
          enemy.stateChangedAt = now;
          enemy.stunnedUntil = null;
        }
        continue;
      }

      if (enemy.state === "spawning") {
        enemy.state = "approaching";
        enemy.stateChangedAt = now;
      }

      if (enemy.type === "glitch" && afterWave8) {
        const prev = lastTeleportAt.get(enemy.id) ?? now;
        const at = teleportGlitch(enemy, now, prev);
        lastTeleportAt.set(enemy.id, at);
      }

      const stats = enemyStats[enemy.type];
      enemy.facing = PLAYER_X >= enemy.x ? "right" : "left";

      if (enemy.state === "approaching") {
        const gap = PLAYER_X - enemy.x;
        if (Math.abs(gap) <= stats.attackRange) {
          enterWindup(enemy, now);
          sound.play("enemyAlert");
        } else {
          enemy.x += Math.sign(gap) * stats.speed * step;
        }
      } else if (enemy.state === "windup" && enemy.nextImpactAt !== null && now >= enemy.nextImpactAt) {
        // Impact: if the player didn't parry (which would have stunned us) or dodge, they take a hit.
        const snap = player.getSnapshot();
        const inRange = Math.abs(PLAYER_X - enemy.x) <= stats.attackRange + 20;
        if (inRange && snap.state !== "dead" && now >= snap.invulnerableUntil) {
          controller.registerDamage(now);
          player.applyDamage(now);
          sound.play("hit");
          camera.shake(6, 160, now);
          effects.spawn("hitSpark", PLAYER_X, GROUND_Y - 20, now);
        }
        enemy.state = "recovering";
        enemy.stateChangedAt = now;
        enemy.stunnedUntil = now + stats.recoveryMs;
        enemy.nextImpactAt = null;
      }
    }
  };

  const update = (now: number, dtMs: number): void => {
    if (controller.state.status !== "running") return;
    maybeSpawn(now);
    updateEnemies(now, dtMs);
    controller.tryAdvanceWave(now);
  };

  return { processInput, update };
}
