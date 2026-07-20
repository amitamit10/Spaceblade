import { describe, expect, it } from "vitest";
import {
  advanceRebuildRun,
  createRebuildRun,
  dodgeRebuildRun,
  parryRebuildRun,
  releaseChargeRebuildRun,
  rebuildSpawnIntervalForWave,
  rebuildWaveTarget,
  slashRebuildRun,
  startChargeRebuildRun,
  tapRebuildRun,
} from "./rebuildGame";

describe("rebuild run model", () => {
  it("starts a deterministic wave with a live player and two threats", () => {
    const run = createRebuildRun(0);

    expect(run.status).toBe("playing");
    expect(run.wave).toBe(1);
    expect(run.hearts).toBe(3);
    expect(run.enemies).toHaveLength(2);
    expect(run.enemies.every((enemy) => enemy.x > 640)).toBe(true);
  });

  it("spawns every new threat in front of the auto-runner", () => {
    const run = createRebuildRun(0);
    run.enemies.forEach((enemy) => { enemy.state = "dead"; });
    run.nextSpawnAt = 0;

    const next = advanceRebuildRun(run, 1);

    expect(next.enemies.filter((enemy) => enemy.state !== "dead").every((enemy) => enemy.x > 640)).toBe(true);
  });

  it("keeps simultaneous forward spawns visibly separated", () => {
    const run = createRebuildRun(0);
    run.enemies.forEach((enemy) => { enemy.state = "dead"; });
    run.nextSpawnAt = 0;

    const next = advanceRebuildRun(run, 5000);
    const spawned = next.enemies.filter((enemy) => enemy.state !== "dead");

    expect(spawned.length).toBeGreaterThanOrEqual(3);
    expect(spawned[1].x - spawned[0].x).toBeGreaterThanOrEqual(96);
    expect(spawned[2].x - spawned[1].x).toBeGreaterThanOrEqual(96);
  });

  it("ramps spawn pacing across the authored wave bands", () => {
    expect(rebuildSpawnIntervalForWave(1)).toBe(2200);
    expect(rebuildSpawnIntervalForWave(4)).toBe(1800);
    expect(rebuildSpawnIntervalForWave(7)).toBe(1400);
    expect(rebuildSpawnIntervalForWave(11)).toBe(1100);
    expect(rebuildSpawnIntervalForWave(14)).toBe(800);
    expect(rebuildSpawnIntervalForWave(15)).toBe(800);
  });

  it("uses the wave target as a hard cap on live plus defeated threats", () => {
    const run = createRebuildRun(0);
    run.enemies.forEach((enemy) => { enemy.state = "dead"; });
    run.defeatedThisWave = rebuildWaveTarget(run.wave) - 1;
    run.nextSpawnAt = 0;

    const next = advanceRebuildRun(run, 1);

    expect(next.enemies.filter((enemy) => enemy.state !== "dead")).toHaveLength(1);
    expect(next.defeatedThisWave + next.enemies.filter((enemy) => enemy.state !== "dead").length).toBe(rebuildWaveTarget(next.wave));
  });

  it("slash damages enemies in range and awards their score on defeat", () => {
    const run = createRebuildRun(0);
    run.enemies[0].x = 730;

    const afterSlash = slashRebuildRun(run, 100);

    expect(afterSlash.player.animation).toBe("slash");
    expect(afterSlash.enemies[0].hp).toBe(0);
    expect(afterSlash.enemies[0].state).toBe("dead");
    expect(afterSlash.score).toBe(100);
  });

  it("requires two slashes to defeat a tank", () => {
    const run = createRebuildRun(0);
    run.enemies[0].type = "tank";
    run.enemies[0].hp = 2;
    run.enemies[0].maxHp = 2;
    run.enemies[0].x = 730;

    const first = slashRebuildRun(run, 100);
    const second = slashRebuildRun(first, 500);

    expect(first.enemies[0].state).not.toBe("dead");
    expect(second.enemies[0].state).toBe("dead");
    expect(second.score).toBe(275);
  });

  it("moves a threat toward the player and damages an unprotected player", () => {
    const run = createRebuildRun(0);
    run.enemies[0].x = 690;

    const telegraph = advanceRebuildRun(run, 1000);
    const advanced = advanceRebuildRun(telegraph, telegraph.enemies[0].nextAttackAt);

    expect(advanced.enemies[0].x).toBeGreaterThan(300);
    expect(advanced.hearts).toBe(2);
    expect(advanced.enemies[0].nextAttackAt).toBeGreaterThan(1000);
  });

  it("starts a fresh windup when an overdue threat reaches contact range", () => {
    const run = createRebuildRun(0);
    run.enemies[0].x = 690;
    run.enemies[0].nextAttackAt = 0;

    const telegraph = advanceRebuildRun(run, 1000);

    expect(telegraph.hearts).toBe(3);
    expect(telegraph.enemies[0].state).toBe("attacking");
    expect(telegraph.enemies[0].nextAttackAt).toBe(1380);

    const impact = advanceRebuildRun(telegraph, 1380);
    expect(impact.hearts).toBe(2);
  });

  it("gives a threat its full windup when it enters contact early", () => {
    const run = createRebuildRun(0);
    run.enemies[0].x = 690;
    run.enemies[0].nextAttackAt = 1000;

    const telegraph = advanceRebuildRun(run, 100);

    expect(telegraph.hearts).toBe(3);
    expect(telegraph.enemies[0].state).toBe("attacking");
    expect(telegraph.enemies[0].nextAttackAt).toBe(480);
  });

  it("lets a runner lunge into contact when its telegraph resolves", () => {
    const run = createRebuildRun(0);
    run.enemies[0].type = "runner";
    run.enemies[0].x = 700;
    run.enemies[0].state = "attacking";
    run.enemies[0].nextAttackAt = 100;

    const impact = advanceRebuildRun(run, 100);

    expect(impact.enemies[0].state).toBe("attacking");
    expect(impact.enemies[0].x).toBe(650);
    expect(impact.hearts).toBe(2);
  });

  it("makes a boss impact cost two hearts", () => {
    const run = createRebuildRun(0);
    run.wave = 15;
    run.enemies[0].type = "boss";
    run.enemies[0].x = 700;
    run.enemies[0].state = "attacking";
    run.enemies[0].nextAttackAt = 100;

    const impact = advanceRebuildRun(run, 100);

    expect(impact.hearts).toBe(1);
    expect(impact.player.hurtUntil).toBeGreaterThan(100);
  });

  it("locks damage during the hurt window", () => {
    const run = createRebuildRun(0);
    run.enemies[0].x = 690;
    run.enemies[1].x = 590;
    run.enemies[0].state = "attacking";
    run.enemies[1].state = "attacking";
    run.enemies[0].nextAttackAt = 0;
    run.enemies[1].nextAttackAt = 0;

    const first = advanceRebuildRun(run, 1);
    const duringHurt = advanceRebuildRun(first, 200);

    expect(first.hearts).toBe(2);
    expect(duringHurt.hearts).toBe(2);
    expect(duringHurt.player.hurtUntil).toBeGreaterThan(200);
  });

  it("ends the run after three unprotected impacts", () => {
    const run = createRebuildRun(0);
    run.enemies[0].x = 690;
    run.enemies[0].state = "attacking";
    run.enemies[0].nextAttackAt = 0;

    const first = advanceRebuildRun(run, 1);
    const second = advanceRebuildRun(first, 500);
    const final = advanceRebuildRun(second, 1000);

    expect(first.hearts).toBe(2);
    expect(second.hearts).toBe(1);
    expect(final.hearts).toBe(0);
    expect(final.status).toBe("gameOver");
  });

  it("starts the next wave from a fresh per-wave defeat count", () => {
    const run = createRebuildRun(0);
    run.enemies.forEach((enemy) => { enemy.state = "dead"; });
    run.defeatedThisWave = 8;

    const next = advanceRebuildRun(run, 100);

    expect(next.wave).toBe(2);
    expect(next.defeatedThisWave).toBe(0);
  });

  it("restores all hearts when a new wave begins", () => {
    const run = createRebuildRun(0);
    run.enemies.forEach((enemy) => { enemy.state = "dead"; });
    run.hearts = 1;
    run.defeatedThisWave = 8;

    const next = advanceRebuildRun(run, 100);

    expect(next.wave).toBe(2);
    expect(next.hearts).toBe(3);
  });

  it("spawns a boss on wave 15", () => {
    const run = createRebuildRun(0);
    run.wave = 15;
    run.nextSpawnAt = 0;
    run.enemies.forEach((enemy) => { enemy.state = "dead"; });

    const next = advanceRebuildRun(run, 1);

    expect(next.enemies.some((enemy) => enemy.type === "boss")).toBe(true);
    expect(next.bossSpawned).toBe(true);
  });

  it("enters charging and releases a heavy slash after a long hold", () => {
    const run = createRebuildRun(0);
    run.enemies[0].type = "tank";
    run.enemies[0].hp = 2;
    run.enemies[0].maxHp = 2;
    run.enemies[0].x = 850;

    const charging = startChargeRebuildRun(run, 100);
    const heavy = releaseChargeRebuildRun(charging, 500, 400);

    expect(charging.player.animation).toBe("charging");
    expect(heavy.player.animation).toBe("heavy");
    expect(heavy.enemies[0].hp).toBe(2);
    expect(heavy.projectiles).toHaveLength(1);
  });

  it("moves an energy projectile forward and resolves its hit on crossing", () => {
    const run = createRebuildRun(0);
    run.enemies[0].x = 850;

    const fired = releaseChargeRebuildRun(startChargeRebuildRun(run, 100), 500, 400);
    const inFlight = advanceRebuildRun(fired, 650);
    const impact = advanceRebuildRun(inFlight, 800);

    expect(inFlight.projectiles).toHaveLength(1);
    expect(inFlight.enemies[0].hp).toBe(1);
    expect(impact.projectiles).toHaveLength(0);
    expect(impact.enemies[0].state).toBe("dead");
    expect(impact.score).toBe(100);
  });

  it("uses an energy projectile to break a shield without killing the shielded enemy", () => {
    const run = createRebuildRun(0);
    run.enemies[0].type = "shield";
    run.enemies[0].x = 850;
    run.enemies[0].shielded = true;

    const fired = releaseChargeRebuildRun(startChargeRebuildRun(run, 100), 500, 400);
    const impact = advanceRebuildRun(fired, 800);

    expect(impact.projectiles).toHaveLength(0);
    expect(impact.enemies[0].shielded).toBe(false);
    expect(impact.enemies[0].state).not.toBe("dead");
  });

  it("grants dodge invulnerability for the configured window", () => {
    const dodging = dodgeRebuildRun(createRebuildRun(0), 100);

    expect(dodging.player.animation).toBe("dodge");
    expect(dodging.player.invulnerableUntil).toBe(450);
  });

  it("parries an impact inside the precise timing window", () => {
    const run = createRebuildRun(0);
    run.enemies[0].x = 690;
    run.enemies[0].state = "attacking";
    run.enemies[0].nextAttackAt = 200;

    const parried = parryRebuildRun(run, 100);

    expect(parried.parries).toBe(1);
    expect(parried.enemies[0].state).toBe("stunned");
    expect(parried.player.animation).toBe("parry");
    expect(parried.combo).toBe(1);
    expect(parried.score).toBe(75);
  });

  it("keeps parry timing readable across a 30 FPS update boundary", () => {
    const run = createRebuildRun(0);
    run.enemies[0].x = 690;
    run.enemies[0].state = "attacking";
    run.enemies[0].nextAttackAt = 230;

    const parried = parryRebuildRun(run, 100);

    expect(parried.parries).toBe(1);
    expect(parried.enemies[0].state).toBe("stunned");
  });

  it("resets combo when the player takes damage", () => {
    const run = createRebuildRun(0);
    run.combo = 4;
    run.enemies[0].x = 690;
    run.enemies[0].state = "attacking";
    run.enemies[0].nextAttackAt = 0;

    const damaged = advanceRebuildRun(run, 1);

    expect(damaged.combo).toBe(0);
  });

  it("awards a clean-wave bonus when the next wave starts", () => {
    const run = createRebuildRun(0);
    run.enemies.forEach((enemy) => { enemy.state = "dead"; });
    run.defeatedThisWave = 8;

    const next = advanceRebuildRun(run, 100);

    expect(next.score).toBe(100);
  });

  it("keeps an ordinary tap as a quick slash and a close double tap as a dodge", () => {
    const first = tapRebuildRun(createRebuildRun(0), 100, false);
    const second = tapRebuildRun(first, 250, true);

    expect(first.player.animation).toBe("slash");
    expect(second.player.animation).toBe("dodge");
  });

  it("blocks a quick slash until a heavy slash breaks the shield", () => {
    const run = createRebuildRun(0);
    run.enemies[0].type = "shield";
    run.enemies[0].hp = 1;
    run.enemies[0].maxHp = 1;
    run.enemies[0].shielded = true;
    run.enemies[0].x = 730;

    const blocked = slashRebuildRun(run, 100);
    const fired = releaseChargeRebuildRun(startChargeRebuildRun(blocked, 400), 800, 400);
    const broken = advanceRebuildRun(fired, 1100);
    const killed = slashRebuildRun(broken, 1200);

    expect(blocked.enemies[0].hp).toBe(1);
    expect(broken.enemies[0].shielded).toBe(false);
    expect(killed.enemies[0].state).toBe("dead");
  });

  it("teleports a glitch only after wave eight and respects its cooldown", () => {
    const run = createRebuildRun(0);
    run.wave = 8;
    run.enemies[0].type = "glitch";
    run.enemies[0].teleportAt = 100;
    run.enemies[0].side = "left";
    run.enemies[0].x = 400;

    const teleported = advanceRebuildRun(run, 100);
    const held = advanceRebuildRun(teleported, 2000);

    expect(teleported.enemies[0].side).toBe("right");
    expect(teleported.enemies[0].x).toBe(1070);
    expect(held.enemies[0].side).toBe("right");
  });

  it("keeps a glitch in the forward lane when it teleports", () => {
    const run = createRebuildRun(0);
    run.wave = 8;
    run.enemies[0].type = "glitch";
    run.enemies[0].teleportAt = 100;
    run.enemies[0].side = "right";
    run.enemies[0].x = 700;

    const teleported = advanceRebuildRun(run, 100);

    expect(teleported.enemies[0].side).toBe("right");
    expect(teleported.enemies[0].x).toBe(1070);
  });

  it("can complete a skilled 15-wave run and defeat the boss", () => {
    let run = createRebuildRun(0);
    let now = 0;
    let guard = 0;

    while (run.status === "playing" && guard < 2000) {
      guard += 1;
      now = Math.max(now + 250, run.nextSpawnAt);
      run = advanceRebuildRun(run, now);
      for (const enemy of run.enemies) {
        if (enemy.state === "dead") continue;
        enemy.x = 640;
        enemy.state = "attacking";
        enemy.nextAttackAt = Number.MAX_SAFE_INTEGER;
      }

      const target = run.enemies.find((enemy) => enemy.state !== "dead");
      if (target) {
        if (target.shielded) {
          run = releaseChargeRebuildRun(startChargeRebuildRun(run, now), now + 400, 400);
          run = advanceRebuildRun(run, now + 900);
        } else {
          run = slashRebuildRun(run, now + 400);
        }
      }
      run = advanceRebuildRun(run, now + 500);
    }

    expect(guard).toBeLessThan(2000);
    expect(run.status).toBe("victory");
    expect(run.wave).toBe(15);
    expect(run.bossSpawned).toBe(true);
  });
});
