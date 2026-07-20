export type RebuildEnemyType = "grunt" | "runner" | "shield" | "tank" | "glitch" | "boss";
export type RebuildRunStatus = "playing" | "gameOver" | "victory";

export type RebuildEnemy = {
  id: string;
  type: RebuildEnemyType;
  side: "left" | "right";
  x: number;
  hp: number;
  maxHp: number;
  shielded: boolean;
  state: "approaching" | "attacking" | "stunned" | "dead";
  nextAttackAt: number;
  stunnedUntil: number;
  teleportAt: number;
  startedAt: number;
};

export type RebuildProjectile = {
  id: string;
  x: number;
  startedAt: number;
  expiresAt: number;
};

export type RebuildPlayerAnimation = "idle" | "slash" | "charging" | "heavy" | "dodge" | "parry";

export type RebuildRun = {
  now: number;
  status: RebuildRunStatus;
  wave: number;
  score: number;
  combo: number;
  bestCombo: number;
  hearts: number;
  defeated: number;
  defeatedThisWave: number;
  parries: number;
  nextSpawnAt: number;
  spawnIndex: number;
  bossSpawned: boolean;
  projectileSerial: number;
  projectiles: RebuildProjectile[];
  player: {
    animation: RebuildPlayerAnimation;
    actionStartedAt: number;
    hurtUntil: number;
    invulnerableUntil: number;
  };
  enemies: RebuildEnemy[];
};

type EnemyStats = {
  hp: number;
  speed: number;
  attackRange: number;
  windupMs: number;
  recoveryMs: number;
  damage: number;
  score: number;
};

const PLAYER_X = 640;
const MAX_SPAWN_X = 1070;
const QUICK_SLASH_RANGE = 150;
const SLASH_DURATION_MS = 280;
const HEAVY_DURATION_MS = 460;
const DODGE_DURATION_MS = 260;
const PARRY_DURATION_MS = 180;
const DODGE_IFRAME_MS = 500;
const PARRY_STUN_MS = 650;
const PARRY_BEFORE_IMPACT_MS = 150;
const PARRY_AFTER_IMPACT_MS = 90;
const CONTACT_ATTACK_STAGGER_MS = 90;
const HEAVY_MIN_HOLD_MS = 300;
const ENERGY_PROJECTILE_SPEED = 760;
const ENERGY_PROJECTILE_LIFETIME_MS = 1400;
const ENERGY_PROJECTILE_HIT_RADIUS = 34;
const MAX_ACTIVE_ENEMIES = 6;
const MAX_ACTIVE_THREAT_WEIGHT = 6;
const MAX_ACTIVE_TANKS = 2;
const WAVE_TARGET_BASE = 6;
const FORWARD_SPAWN_GAP = 96;

const ENEMY_STATS: Record<RebuildEnemyType, EnemyStats> = {
  grunt: { hp: 1, speed: 72, attackRange: 78, windupMs: 380, recoveryMs: 360, damage: 1, score: 100 },
  runner: { hp: 1, speed: 126, attackRange: 72, windupMs: 240, recoveryMs: 300, damage: 1, score: 125 },
  shield: { hp: 1, speed: 54, attackRange: 82, windupMs: 460, recoveryMs: 420, damage: 1, score: 175 },
  tank: { hp: 2, speed: 38, attackRange: 98, windupMs: 680, recoveryMs: 620, damage: 1, score: 275 },
  glitch: { hp: 1, speed: 92, attackRange: 76, windupMs: 300, recoveryMs: 340, damage: 1, score: 300 },
  boss: { hp: 12, speed: 34, attackRange: 130, windupMs: 720, recoveryMs: 580, damage: 2, score: 1500 },
};

const cloneRun = (run: RebuildRun): RebuildRun => ({
  ...run,
  player: { ...run.player },
  enemies: run.enemies.map((enemy) => ({ ...enemy })),
  projectiles: run.projectiles.map((projectile) => ({ ...projectile })),
});

function createEnemy(id: string, type: RebuildEnemyType, side: "left" | "right", x: number, now: number): RebuildEnemy {
  const stats = ENEMY_STATS[type];
  return {
    id,
    type,
    side,
    x,
    hp: stats.hp,
    maxHp: stats.hp,
    shielded: type === "shield",
    state: "approaching",
    nextAttackAt: now + stats.windupMs,
    stunnedUntil: now,
    teleportAt: now + 2200,
    startedAt: now,
  };
}

function pickSpawnType(wave: number, index: number): RebuildEnemyType {
  if (wave >= 8 && index % 5 === 0) return "glitch";
  if (wave >= 6 && index % 4 === 0) return "tank";
  if (wave >= 4 && index % 3 === 0) return "shield";
  if (wave >= 2 && index % 2 === 0) return "runner";
  return "grunt";
}

function activeEnemies(run: RebuildRun): RebuildEnemy[] {
  return run.enemies.filter((enemy) => enemy.state !== "dead");
}

export function rebuildEnemyThreatWeight(type: RebuildEnemyType): number {
  return type === "tank" || type === "boss" ? 2 : 1;
}

export function rebuildActiveThreatWeight(run: RebuildRun): number {
  return activeEnemies(run).reduce((total, enemy) => total + rebuildEnemyThreatWeight(enemy.type), 0);
}

function nextForwardSpawnX(run: RebuildRun): number {
  const forwardEnemies = activeEnemies(run)
    .filter((enemy) => enemy.x > PLAYER_X)
  if (forwardEnemies.length === 0) return MAX_SPAWN_X;
  const furthestForward = forwardEnemies.reduce((furthest, enemy) => Math.max(furthest, enemy.x), MAX_SPAWN_X);
  return furthestForward + FORWARD_SPAWN_GAP;
}

function awardDefeat(run: RebuildRun, enemy: RebuildEnemy): void {
  enemy.hp = 0;
  enemy.state = "dead";
  run.defeated += 1;
  run.defeatedThisWave += 1;
  run.combo += 1;
  run.bestCombo = Math.max(run.bestCombo, run.combo);
  run.score += ENEMY_STATS[enemy.type].score;
  if (enemy.type === "boss" && run.wave === 15) run.status = "victory";
}

export function rebuildSpawnIntervalForWave(wave: number): number {
  if (wave <= 3) return 2200;
  if (wave <= 6) return 1800;
  if (wave <= 10) return 1400;
  if (wave <= 13) return 1100;
  return 800;
}

export function rebuildWaveTarget(wave: number): number {
  if (wave >= 15) return 1;
  return WAVE_TARGET_BASE + wave * 2;
}

export function createRebuildRun(now: number): RebuildRun {
  return {
    now,
    status: "playing",
    wave: 1,
    score: 0,
    combo: 0,
    bestCombo: 0,
    hearts: 3,
    defeated: 0,
    defeatedThisWave: 0,
    parries: 0,
    nextSpawnAt: now + rebuildSpawnIntervalForWave(1),
    spawnIndex: 2,
    bossSpawned: false,
    projectileSerial: 0,
    projectiles: [],
    player: { animation: "idle", actionStartedAt: now, hurtUntil: now, invulnerableUntil: now },
    enemies: [
      createEnemy("enemy-0", "grunt", "right", 900, now),
      createEnemy("enemy-1", "grunt", "right", 1080, now),
    ],
  };
}

export function slashRebuildRun(source: RebuildRun, now: number): RebuildRun {
  const run = advanceRebuildRun(source, now);
  if (run.status !== "playing") return run;
  run.player.animation = "slash";
  run.player.actionStartedAt = now;
  applyAttack(run, QUICK_SLASH_RANGE, 1, "quick");
  return run;
}

function applyAttack(run: RebuildRun, range: number, damage: number, kind: "quick" | "heavy"): void {
  for (const enemy of run.enemies) {
    if (enemy.state === "dead" || enemy.state === "stunned" || Math.abs(enemy.x - PLAYER_X) > range) continue;
    if (enemy.type === "shield" && enemy.shielded) {
      if (kind === "heavy") enemy.shielded = false;
      continue;
    }
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      awardDefeat(run, enemy);
    }
  }
}

function resolveProjectileHit(run: RebuildRun, projectile: RebuildProjectile, previousX: number): boolean {
  const target = activeEnemies(run)
    .filter((enemy) => enemy.x <= projectile.x + ENERGY_PROJECTILE_HIT_RADIUS && enemy.x >= previousX - ENERGY_PROJECTILE_HIT_RADIUS)
    .sort((left, right) => Math.abs(left.x - projectile.x) - Math.abs(right.x - projectile.x))[0];
  if (!target) return false;
  if (target.type === "shield" && target.shielded) {
    target.shielded = false;
    return true;
  }
  target.hp -= 1;
  if (target.hp <= 0) awardDefeat(run, target);
  return true;
}

function advanceProjectiles(run: RebuildRun, elapsed: number, now: number): void {
  const remaining: RebuildProjectile[] = [];
  for (const projectile of run.projectiles) {
    if (now >= projectile.expiresAt) continue;
    const previousX = projectile.x;
    projectile.x += ENERGY_PROJECTILE_SPEED * (elapsed / 1000);
    if (resolveProjectileHit(run, projectile, previousX)) continue;
    remaining.push(projectile);
  }
  run.projectiles = remaining;
}

export function startChargeRebuildRun(source: RebuildRun, now: number): RebuildRun {
  const run = advanceRebuildRun(source, now);
  if (run.status === "playing" && run.player.animation === "idle") {
    run.player.animation = "charging";
    run.player.actionStartedAt = now;
  }
  return run;
}

export function releaseChargeRebuildRun(source: RebuildRun, now: number, holdMs: number): RebuildRun {
  const run = advanceRebuildRun(source, now);
  if (run.status !== "playing") return run;
  if (holdMs < HEAVY_MIN_HOLD_MS) return slashRebuildRun(run, now);
  run.player.animation = "heavy";
  run.player.actionStartedAt = now;
  run.projectileSerial += 1;
  run.projectiles.push({
    id: `projectile-${run.projectileSerial}`,
    x: PLAYER_X,
    startedAt: now,
    expiresAt: now + ENERGY_PROJECTILE_LIFETIME_MS,
  });
  return run;
}

export function dodgeRebuildRun(source: RebuildRun, now: number): RebuildRun {
  const run = advanceRebuildRun(source, now);
  if (run.status !== "playing") return run;
  run.player.animation = "dodge";
  run.player.actionStartedAt = now;
  run.player.invulnerableUntil = now + DODGE_IFRAME_MS;
  return run;
}

export function parryRebuildRun(source: RebuildRun, now: number): RebuildRun {
  const run = advanceRebuildRun(source, now);
  if (run.status !== "playing") return run;
  run.player.animation = "parry";
  run.player.actionStartedAt = now;
  run.player.invulnerableUntil = now + PARRY_DURATION_MS;
  let successful = false;
  for (const enemy of run.enemies) {
    const untilImpact = enemy.nextAttackAt - now;
    if (enemy.state !== "attacking" || untilImpact < -PARRY_AFTER_IMPACT_MS || untilImpact > PARRY_BEFORE_IMPACT_MS) continue;
    enemy.state = "stunned";
    enemy.stunnedUntil = now + PARRY_STUN_MS;
    enemy.nextAttackAt = enemy.stunnedUntil + ENEMY_STATS[enemy.type].windupMs;
    successful = true;
  }
  if (successful) {
    run.parries += 1;
    run.combo += 1;
    run.bestCombo = Math.max(run.bestCombo, run.combo);
    run.score += 50 + run.combo * 25;
  }
  return run;
}

export function tapRebuildRun(source: RebuildRun, now: number, isDoubleTap: boolean): RebuildRun {
  if (isDoubleTap) return dodgeRebuildRun(source, now);
  const candidate = advanceRebuildRun(source, now);
  const canParry = candidate.enemies.some((enemy) => {
    const untilImpact = enemy.nextAttackAt - now;
    return enemy.state === "attacking" && untilImpact >= -PARRY_AFTER_IMPACT_MS && untilImpact <= PARRY_BEFORE_IMPACT_MS;
  });
  return canParry ? parryRebuildRun(candidate, now) : slashRebuildRun(candidate, now);
}

export function advanceRebuildRun(source: RebuildRun, now: number): RebuildRun {
  const run = cloneRun(source);
  if (run.status !== "playing") return run;

  const elapsed = Math.max(0, Math.min(now - run.now, 250));
  run.now = now;
  const actionDuration = run.player.animation === "slash"
    ? SLASH_DURATION_MS
    : run.player.animation === "heavy"
      ? HEAVY_DURATION_MS
      : run.player.animation === "dodge"
        ? DODGE_DURATION_MS
        : run.player.animation === "parry"
          ? PARRY_DURATION_MS
          : null;
  if (actionDuration !== null && now - run.player.actionStartedAt >= actionDuration) {
    run.player.animation = "idle";
  }

  advanceProjectiles(run, elapsed, now);

  for (const [activeIndex, enemy] of activeEnemies(run).entries()) {
    const stats = ENEMY_STATS[enemy.type];
    if (enemy.type === "glitch" && run.wave >= 8 && now >= enemy.teleportAt) {
      enemy.side = "right";
      enemy.x = MAX_SPAWN_X;
      enemy.teleportAt = now + 2200;
      enemy.startedAt = now;
      continue;
    }
    if (enemy.state === "stunned") {
      if (now >= enemy.stunnedUntil) enemy.state = "approaching";
      else continue;
    }
    const distance = Math.abs(enemy.x - PLAYER_X);
    if (distance > stats.attackRange) {
      const direction = enemy.x < PLAYER_X ? 1 : -1;
      enemy.x += direction * stats.speed * (elapsed / 1000);
      enemy.state = "approaching";
      continue;
    }

    const wasApproaching = enemy.state === "approaching";
    enemy.state = "attacking";
    // An enemy's first attack telegraph begins on contact, not at spawn time.
    // Otherwise a distant spawn can arrive with an already-expired timer and
    // damage the player without a readable windup.
    if (wasApproaching) {
      enemy.nextAttackAt = now + stats.windupMs + activeIndex * CONTACT_ATTACK_STAGGER_MS;
    }
    if (now >= enemy.nextAttackAt) {
      enemy.nextAttackAt = now + stats.recoveryMs;
      if (enemy.type === "runner") enemy.x = PLAYER_X + 10;
      if (now >= run.player.hurtUntil && now >= run.player.invulnerableUntil) {
        run.hearts = Math.max(0, run.hearts - stats.damage);
        run.combo = 0;
        run.player.hurtUntil = now + 600 + (stats.damage - 1) * 80;
        if (run.hearts === 0) {
          run.status = "gameOver";
          return run;
        }
      }
    }
  }

  const target = rebuildWaveTarget(run.wave);
  while (now >= run.nextSpawnAt) {
    if (run.wave >= 15 && run.bossSpawned) break;
    const liveEnemies = activeEnemies(run);
    if (liveEnemies.length >= MAX_ACTIVE_ENEMIES || run.defeatedThisWave + liveEnemies.length >= target) break;
    const side = "right" as const;
    const x = nextForwardSpawnX(run);
    const type = run.wave === 15 && !run.bossSpawned ? "boss" : pickSpawnType(run.wave, run.spawnIndex);
    if (rebuildActiveThreatWeight(run) + rebuildEnemyThreatWeight(type) > MAX_ACTIVE_THREAT_WEIGHT) break;
    if (type === "tank" && liveEnemies.filter((enemy) => enemy.type === "tank").length >= MAX_ACTIVE_TANKS) break;
    if (type === "boss") run.bossSpawned = true;
    run.enemies.push(createEnemy(`enemy-${run.spawnIndex}`, type, side, x, now));
    run.spawnIndex += 1;
    run.nextSpawnAt += rebuildSpawnIntervalForWave(run.wave);
  }

  if (run.defeatedThisWave >= target && activeEnemies(run).length === 0) {
    if (run.wave >= 15) run.status = "victory";
    else {
      run.score += 100 * run.wave;
      run.wave += 1;
      run.defeatedThisWave = 0;
      run.hearts = 3;
      run.nextSpawnAt = now + 700;
    }
  }
  return run;
}

export const rebuildEnemyStats = ENEMY_STATS;
