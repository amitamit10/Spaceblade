import { describe, expect, it, vi } from "vitest";
import { PLAYER_X } from "../constants";
import { createEnemy } from "../enemies/enemyFactory";
import { enemyStats } from "../enemies/enemyStats";
import { createPlayerStateMachine } from "../player/playerStateMachine";
import type { EffectSystem } from "../rendering/effects";
import { createCamera } from "../rendering/camera";
import type { SoundBus } from "../audio/soundBus";
import { createRunController } from "./runState";
import { createGameLoop } from "./gameLoop";

function createLoopFixture() {
  const controller = createRunController(0);
  controller.state.nextSpawnAt = Number.POSITIVE_INFINITY;
  const player = createPlayerStateMachine(0);
  const sound: SoundBus = { play: vi.fn(), stopAmbient: vi.fn() };
  const effects: EffectSystem = {
    spawn: vi.fn(),
    update: vi.fn(),
    draw: vi.fn(),
    clear: vi.fn(),
    count: vi.fn(() => 0),
  };
  const loop = createGameLoop(controller, player, {
    effects,
    camera: createCamera(),
    sound,
    rng: () => 0,
  });
  return { controller, effects, player, loop, sound };
}

describe("createGameLoop combat integration", () => {
  it("only applies one heart of damage when multiple enemy impacts land on the same frame", () => {
    const { controller, loop, player } = createLoopFixture();
    const left = createEnemy("left", "grunt", "left");
    left.state = "windup";
    left.x = PLAYER_X - 36;
    left.nextImpactAt = 1000;

    const right = createEnemy("right", "grunt", "right");
    right.state = "windup";
    right.x = PLAYER_X + 36;
    right.nextImpactAt = 1000;

    controller.addEnemy(left);
    controller.addEnemy(right);

    loop.update(1000, 16);

    expect(player.getSnapshot().hearts).toBe(2);
    expect(controller.state.hearts).toBe(2);
    expect(controller.state.damageTakenThisWave).toBe(1);
  });

  it("returns a damaged durable enemy to approach after its recovery timer", () => {
    const { controller, loop } = createLoopFixture();
    const tank = createEnemy("tank", "tank", "right");
    tank.state = "approaching";
    tank.x = PLAYER_X + 60;
    controller.addEnemy(tank);

    loop.processInput("tap", 0);

    expect(tank.state).toBe("recovering");
    expect(tank.stunnedUntil).toBe(enemyStats.tank.recoveryMs);

    loop.update(enemyStats.tank.recoveryMs, 16);

    expect(tank.state).toBe("approaching");
    expect(tank.stunnedUntil).toBeNull();
  });

  it("auto-faces the nearest target before quick slash so hit and arc direction match", () => {
    const { controller, effects, loop, player } = createLoopFixture();
    const behind = createEnemy("behind", "grunt", "left");
    behind.state = "approaching";
    behind.x = PLAYER_X - 24;
    const ahead = createEnemy("ahead", "grunt", "right");
    ahead.state = "approaching";
    ahead.x = PLAYER_X + 80;
    controller.addEnemy(behind);
    controller.addEnemy(ahead);

    loop.processInput("tap", 0);

    expect(controller.state.activeEnemies.map((enemy) => enemy.id)).toEqual(["ahead"]);
    expect(player.getSnapshot().facing).toBe("left");
    expect(effects.spawn).toHaveBeenCalledWith("slashArc", PLAYER_X, expect.any(Number), 0, -1);
  });

  it("spawns the boss once wave 15 begins", () => {
    const { controller, loop, sound } = createLoopFixture();
    controller.state.wave = 15;
    controller.state.nextSpawnAt = 1000;
    controller.state.activeEnemies = [];

    loop.update(1000, 16);

    expect(controller.state.activeEnemies).toHaveLength(1);
    expect(controller.state.activeEnemies[0].type).toBe("boss");
    expect(sound.play).toHaveBeenCalledWith("boss");
  });
});
