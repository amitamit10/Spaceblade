import { describe, it, expect } from "vitest";
import {
  comboMultiplier,
  killScore,
  waveClearBonus,
  gradeForScore,
} from "./scoreSystem";
import { createRunController } from "./runState";
import { createEnemy } from "../enemies/enemyFactory";

describe("comboMultiplier", () => {
  it("steps up at the combo thresholds", () => {
    expect(comboMultiplier(0)).toBe(1.0);
    expect(comboMultiplier(9)).toBe(1.0);
    expect(comboMultiplier(10)).toBe(1.05);
    expect(comboMultiplier(25)).toBe(1.1);
    expect(comboMultiplier(50)).toBe(1.2);
    expect(comboMultiplier(75)).toBe(1.3);
    expect(comboMultiplier(100)).toBe(1.4);
  });
});

describe("gradeForScore", () => {
  it("returns the expected grade at each threshold", () => {
    expect(gradeForScore(499)).toBeNull();
    expect(gradeForScore(500)).toBe("B");
    expect(gradeForScore(1000)).toBe("C");
    expect(gradeForScore(1500)).toBe("A");
    expect(gradeForScore(3000)).toBe("S");
    expect(gradeForScore(5000)).toBe("SS");
    expect(gradeForScore(7000)).toBe("SSS");
  });
});

describe("waveClearBonus", () => {
  it("multiplies by 1.5 only for a clean wave", () => {
    expect(waveClearBonus(4, false)).toBe(1000);
    expect(waveClearBonus(4, true)).toBe(1500);
  });
});

describe("run scoring behavior", () => {
  it("applies the combo multiplier to kill score only", () => {
    const c = createRunController(0);
    // Push combo to 10 with parries (flat +100 each, no multiplier on parries).
    for (let i = 0; i < 10; i += 1) c.registerParry(0);
    expect(c.state.combo).toBe(10);
    expect(c.state.score).toBe(1500); // 10 * 100 flat + 500 streak bonus at 10

    const before = c.state.score;
    c.registerKill(createEnemy("g", "grunt", "left"), 0); // base 100 at combo 10
    expect(c.state.score - before).toBe(killScore(100, 10)); // 105, not 100
    expect(c.state.score - before).toBe(105);
  });

  it("resets combo (but not score) when the player takes damage", () => {
    const c = createRunController(0);
    c.registerKill(createEnemy("g", "grunt", "left"), 0);
    c.registerParry(0);
    expect(c.state.combo).toBe(2);
    const score = c.state.score;
    c.registerDamage(10);
    expect(c.state.combo).toBe(0);
    expect(c.state.score).toBe(score);
  });

  it("awards each parry-streak bonus exactly once", () => {
    const c = createRunController(0);
    for (let i = 0; i < 60; i += 1) c.registerParry(0);
    // 60 parries * 100 flat = 6000, plus streak bonuses 500 + 1500 + 3000.
    expect(c.state.score).toBe(6000 + 500 + 1500 + 3000);
  });

  it("applies the clean-wave bonus only when no damage was taken", () => {
    const clean = createRunController(0);
    // Defeat enough grunts to clear wave 1 (threshold 8).
    for (let i = 0; i < 8; i += 1) {
      const e = createEnemy(`g${i}`, "grunt", "left");
      clean.addEnemy(e);
      clean.registerKill(e, 0);
      clean.removeEnemy(e.id);
    }
    const scoreBefore = clean.state.score;
    const res = clean.tryAdvanceWave(0);
    expect(res).toEqual({ advanced: true, clean: true });
    expect(clean.state.score - scoreBefore).toBe(waveClearBonus(1, true)); // 375

    const dirty = createRunController(0);
    for (let i = 0; i < 8; i += 1) {
      const e = createEnemy(`g${i}`, "grunt", "left");
      dirty.addEnemy(e);
      dirty.registerKill(e, 0);
      dirty.removeEnemy(e.id);
    }
    dirty.registerDamage(5); // took a hit this wave
    const dirtyBefore = dirty.state.score;
    const dres = dirty.tryAdvanceWave(0);
    expect(dres.clean).toBe(false);
    expect(dirty.state.score - dirtyBefore).toBe(waveClearBonus(1, false)); // 250
  });

  it("sets status to victory when the boss dies", () => {
    const c = createRunController(0);
    c.state.wave = 15;
    const boss = createEnemy("boss", "boss", "left");
    c.addEnemy(boss);
    c.registerKill(boss, 1234);
    expect(c.state.status).toBe("victory");
    expect(c.state.endedAt).toBe(1234);
  });

  it("ends in game over when hearts reach zero", () => {
    const c = createRunController(0);
    c.registerDamage(0);
    c.registerDamage(0);
    c.registerDamage(0);
    expect(c.state.hearts).toBe(0);
    expect(c.state.status).toBe("gameOver");
  });
});
