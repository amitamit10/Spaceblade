import { describe, expect, it } from "vitest";
import { createRunController } from "./runState";
import { getWaveEntry } from "./waveTable";
import { createEnemy } from "../enemies/enemyFactory";

describe("createRunController", () => {
  it("gives the opening wave a short spawn grace period", () => {
    const controller = createRunController(1000);
    expect(controller.state.nextSpawnAt).toBeGreaterThan(1000);
    expect(controller.state.nextSpawnAt).toBeLessThan(1000 + getWaveEntry(1).spawnEveryMs);
  });

  it("re-arms a short grace period after advancing to the next wave", () => {
    const controller = createRunController(500);
    controller.state.activeEnemies = [];
    controller.registerKill({ id: "e1", type: "grunt" } as never, 1000);
    controller.registerKill({ id: "e2", type: "grunt" } as never, 1000);
    controller.registerKill({ id: "e3", type: "grunt" } as never, 1000);
    controller.registerKill({ id: "e4", type: "grunt" } as never, 1000);
    controller.registerKill({ id: "e5", type: "grunt" } as never, 1000);
    controller.registerKill({ id: "e6", type: "grunt" } as never, 1000);
    controller.registerKill({ id: "e7", type: "grunt" } as never, 1000);
    controller.registerKill({ id: "e8", type: "grunt" } as never, 1000);

    const result = controller.tryAdvanceWave(4000);
    expect(result.advanced).toBe(true);
    expect(controller.state.nextSpawnAt).toBeGreaterThan(4000);
    expect(controller.state.nextSpawnAt).toBeLessThan(4000 + getWaveEntry(2).spawnEveryMs);
  });

  it("can advance from wave 14 into the boss wave 15 when the clear threshold is met", () => {
    const controller = createRunController(0);
    controller.state.wave = 14;
    controller.state.activeEnemies = [];

    for (let i = 0; i < 34; i += 1) {
      controller.registerKill(createEnemy(`g${i}`, "grunt", "left"), 0);
    }

    const result = controller.tryAdvanceWave(9000);

    expect(result.advanced).toBe(true);
    expect(controller.state.wave).toBe(15);
    expect(getWaveEntry(controller.state.wave).includesBoss).toBe(true);
    expect(controller.state.hearts).toBe(3);
  });

  it("can traverse every combat wave and finish by defeating the boss", () => {
    const controller = createRunController(0);

    for (let wave = 1; wave <= 14; wave += 1) {
      controller.state.activeEnemies = [];
      const requiredKills = 6 + wave * 2;

      for (let kill = 0; kill < requiredKills; kill += 1) {
        controller.registerKill(createEnemy(`wave-${wave}-${kill}`, "grunt", "left"), wave);
      }

      const advance = controller.tryAdvanceWave(wave * 1000);
      expect(advance.advanced).toBe(true);
      expect(controller.state.wave).toBe(wave + 1);
      expect(controller.state.status).toBe("running");
    }

    controller.registerKill(createEnemy("final-boss", "boss", "left"), 15_000);

    expect(controller.state.wave).toBe(15);
    expect(controller.state.status).toBe("victory");
    expect(controller.state.endedAt).toBe(15_000);
  });

  it("ends a run in game over after the player loses all hearts", () => {
    const controller = createRunController(0);

    controller.registerDamage(100);
    controller.registerDamage(200);
    controller.registerDamage(300);

    expect(controller.state.hearts).toBe(0);
    expect(controller.state.status).toBe("gameOver");
    expect(controller.state.endedAt).toBe(300);
  });
});
