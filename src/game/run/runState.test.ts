import { describe, expect, it } from "vitest";
import { createRunController } from "./runState";
import { getWaveEntry } from "./waveTable";

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
});
