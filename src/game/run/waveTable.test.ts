import { describe, it, expect } from "vitest";
import { waveTable, getWaveEntry, waveClearThreshold, threatWeightOf } from "./waveTable";
import { activeThreatWeight, canSpawnMore } from "./spawnScheduler";
import { createEnemy } from "../enemies/enemyFactory";

describe("waveTable", () => {
  it("has exactly 15 waves", () => {
    expect(waveTable).toHaveLength(15);
  });

  it("only includes the boss on wave 15", () => {
    expect(waveTable[14].wave).toBe(15);
    expect(waveTable[14].includesBoss).toBe(true);
    for (let i = 0; i < 14; i += 1) {
      expect(waveTable[i].includesBoss).toBe(false);
    }
  });

  it("clamps out-of-range wave lookups", () => {
    expect(getWaveEntry(0).wave).toBe(1);
    expect(getWaveEntry(99).wave).toBe(15);
  });

  it("computes the wave clear threshold as 6 + wave * 2", () => {
    expect(waveClearThreshold(1)).toBe(8);
    expect(waveClearThreshold(14)).toBe(34);
  });
});

describe("threat weights", () => {
  it("counts tank and boss as weight 2 and others as 1", () => {
    expect(threatWeightOf("tank")).toBe(2);
    expect(threatWeightOf("boss")).toBe(2);
    expect(threatWeightOf("grunt")).toBe(1);
    expect(threatWeightOf("runner")).toBe(1);
    expect(threatWeightOf("shield")).toBe(1);
    expect(threatWeightOf("glitch")).toBe(1);
  });

  it("sums active threat weight ignoring dead enemies", () => {
    const enemies = [
      createEnemy("t", "tank", "left"), // 2
      createEnemy("g", "grunt", "right"), // 1
    ];
    expect(activeThreatWeight(enemies)).toBe(3);
    enemies[0].state = "dead";
    expect(activeThreatWeight(enemies)).toBe(1);
  });

  it("respects the active threat weight cap", () => {
    const enemies = [
      createEnemy("t1", "tank", "left"), // 2
      createEnemy("t2", "tank", "right"), // 2
      createEnemy("g", "grunt", "left"), // 1
    ]; // total 5
    expect(canSpawnMore(enemies, 6)).toBe(true); // room for 1 more weight
    enemies.push(createEnemy("g2", "grunt", "right")); // total 6
    expect(canSpawnMore(enemies, 6)).toBe(false);
  });
});
