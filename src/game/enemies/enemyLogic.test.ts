import { describe, it, expect } from "vitest";
import { createEnemy } from "./enemyFactory";
import { resolveHit, isParryWindow, enterWindup, teleportGlitch } from "./enemyLogic";

describe("resolveHit", () => {
  it("kills a grunt with any single hit", () => {
    expect(resolveHit(createEnemy("g", "grunt", "left"), "quick", 0)).toBe("killed");
    expect(resolveHit(createEnemy("g", "grunt", "left"), "heavy", 0)).toBe("killed");
    expect(resolveHit(createEnemy("g", "grunt", "left"), "parry", 0)).toBe("killed");
  });

  it("kills a runner with a single hit", () => {
    expect(resolveHit(createEnemy("r", "runner", "left"), "quick", 0)).toBe("killed");
  });

  it("blocks a quick hit on a shield but breaks it on heavy", () => {
    const shield = createEnemy("s", "shield", "left");
    expect(resolveHit(shield, "quick", 0)).toBe("blocked");
    expect(shield.shielded).toBe(true);
    expect(resolveHit(shield, "heavy", 100)).toBe("shieldBroken");
    expect(shield.shielded).toBe(false);
    // Now unshielded, a quick hit finishes it.
    expect(resolveHit(shield, "quick", 200)).toBe("killed");
  });

  it("parries a shield into a stun without killing it", () => {
    const shield = createEnemy("s", "shield", "left");
    expect(resolveHit(shield, "parry", 0)).toBe("stunned");
    expect(shield.state).toBe("stunned");
    expect(shield.hp).toBeGreaterThan(0);
  });

  it("requires two damaging hits to kill a tank", () => {
    const tank = createEnemy("t", "tank", "left");
    expect(resolveHit(tank, "quick", 0)).toBe("damaged");
    expect(tank.hp).toBe(1);
    expect(resolveHit(tank, "heavy", 100)).toBe("killed");
  });

  it("stuns a tank on parry without damaging it", () => {
    const tank = createEnemy("t", "tank", "left");
    expect(resolveHit(tank, "parry", 0)).toBe("stunned");
    expect(tank.hp).toBe(2);
  });

  it("takes twelve damaging hits to kill the boss", () => {
    const boss = createEnemy("b", "boss", "left");
    let result = "";
    for (let i = 0; i < 11; i += 1) result = resolveHit(boss, "quick", i * 10);
    expect(result).toBe("damaged");
    expect(boss.hp).toBe(1);
    expect(resolveHit(boss, "heavy", 200)).toBe("killed");
  });

  it("returns missed for an already-dead enemy", () => {
    const grunt = createEnemy("g", "grunt", "left");
    resolveHit(grunt, "quick", 0);
    expect(resolveHit(grunt, "quick", 10)).toBe("missed");
  });
});

describe("isParryWindow", () => {
  it("is false with no telegraphed impact", () => {
    expect(isParryWindow(createEnemy("g", "grunt", "left"), 0)).toBe(false);
  });

  it("is true only inside [impact - 120, impact + 60]", () => {
    const grunt = createEnemy("g", "grunt", "left");
    enterWindup(grunt, 0); // impact at 0 + 380 = 380
    const impact = grunt.nextImpactAt as number;
    expect(isParryWindow(grunt, impact - 121)).toBe(false);
    expect(isParryWindow(grunt, impact - 120)).toBe(true);
    expect(isParryWindow(grunt, impact)).toBe(true);
    expect(isParryWindow(grunt, impact + 60)).toBe(true);
    expect(isParryWindow(grunt, impact + 61)).toBe(false);
  });
});

describe("teleportGlitch", () => {
  it("changes side and respects the cooldown", () => {
    const glitch = createEnemy("gl", "glitch", "left");
    const originalX = glitch.x;

    // Still on cooldown: no change, returns the same timestamp.
    expect(teleportGlitch(glitch, 1000, 0)).toBe(0);
    expect(glitch.side).toBe("left");

    // Cooldown elapsed: flips side and moves, returns the new timestamp.
    const at = teleportGlitch(glitch, 2200, 0);
    expect(at).toBe(2200);
    expect(glitch.side).toBe("right");
    expect(glitch.x).not.toBe(originalX);
  });
});
