import { describe, expect, it } from "vitest";
import {
  clampSpriteCenterX,
  enemyAnimationElapsed,
  enemyDeathAnimationElapsed,
  enemyDeathIsVisible,
  enemyDeathVisualAnimation,
  enemyHitIsVisible,
  enemyHitVisualAnimation,
  enemyVisualAnimation,
  parryTimingSignal,
  playerVisualAnimation,
} from "./spacebladeAnimation";

describe("spaceblade visual animation selection", () => {
  const available = new Set(["idle", "slash", "charging", "heavy", "dodge", "parry"]);

  it("keeps wide authored sprites inside the arena viewport", () => {
    expect(clampSpriteCenterX(-40, 64, 3, 1280)).toBe(96);
    expect(clampSpriteCenterX(1400, 64, 3, 1280)).toBe(1184);
    expect(clampSpriteCenterX(1400, 160, 3, 1280)).toBe(1040);
    expect(clampSpriteCenterX(1400, 160, 3, 200)).toBe(100);
  });

  it("uses the authored slash sequence for sword attacks", () => {
    expect(playerVisualAnimation("slash", available)).toBe("slash");
  });

  it("uses dedicated sequences for every authored player action", () => {
    expect(playerVisualAnimation("charging", available)).toBe("charging");
    expect(playerVisualAnimation("heavy", available)).toBe("heavy");
    expect(playerVisualAnimation("dodge", available)).toBe("dodge");
    expect(playerVisualAnimation("parry", available)).toBe("parry");
  });

  it("uses authored player reactions when the run is hurt or dead", () => {
    const reactions = new Set(["idle", "hurt", "dead"]);
    expect(playerVisualAnimation("hurt", reactions)).toBe("hurt");
    expect(playerVisualAnimation("dead", reactions)).toBe("dead");
  });

  it("falls back to slash only when a dedicated action is missing", () => {
    expect(playerVisualAnimation("heavy", new Set(["idle", "slash"]))).toBe("slash");
    expect(playerVisualAnimation("dodge", new Set(["idle", "slash"]))).toBe("slash");
  });

  it("falls back safely when a requested animation is missing", () => {
    expect(playerVisualAnimation("slash", new Set(["idle"]))).toBe("idle");
  });

  it("maps enemy states to authored windup, attack, and hurt sequences", () => {
    const enemyAnimations = new Set(["walk", "windup", "attack", "hurt"]);
    expect(enemyVisualAnimation("attacking", 300, enemyAnimations)).toBe("windup");
    expect(enemyVisualAnimation("attacking", 120, enemyAnimations)).toBe("attack");
    expect(enemyVisualAnimation("stunned", 0, enemyAnimations)).toBe("hurt");
  });

  it("shows recovery after impact and the boss special strike near impact", () => {
    const enemyAnimations = new Set(["walk", "windup", "attack", "recover", "specialAttack"]);
    expect(enemyVisualAnimation("attacking", 120, enemyAnimations, 80, false)).toBe("recover");
    expect(enemyVisualAnimation("attacking", 120, enemyAnimations, 260, false)).toBe("windup");
    expect(enemyVisualAnimation("attacking", 120, enemyAnimations, -1, true)).toBe("specialAttack");
  });

  it("keeps every authored recovery frame visible for its declared duration", () => {
    const enemyAnimations = new Set(["walk", "windup", "attack", "recover"]);

    expect(enemyVisualAnimation("attacking", 120, enemyAnimations, 299, false, 300)).toBe("recover");
    expect(enemyVisualAnimation("attacking", 120, enemyAnimations, 300, false, 300)).toBe("windup");
  });

  it("starts an enemy attack animation at the telegraph window", () => {
    expect(enemyAnimationElapsed("attacking", 1000, 0, 1180)).toBe(0);
    expect(enemyAnimationElapsed("attacking", 1160, 0, 1180)).toBe(160);
    expect(enemyAnimationElapsed("attacking", 1125, 0, 1180, 1000)).toBe(125);
  });

  it("uses the authored death sequence and never rewinds elapsed time", () => {
    expect(enemyDeathVisualAnimation(new Set(["walk", "dead"]))).toBe("dead");
    expect(enemyDeathVisualAnimation(new Set(["walk"]))).toBe("walk");
    expect(enemyDeathAnimationElapsed(900, 1000)).toBe(0);
    expect(enemyDeathAnimationElapsed(1125, 1000)).toBe(125);
  });

  it("shows a short authored hurt reaction when a heavy enemy takes damage", () => {
    expect(enemyHitVisualAnimation(new Set(["walk", "hurt"]))).toBe("hurt");
    expect(enemyHitVisualAnimation(new Set(["walk"]))).toBe("walk");
    expect(enemyHitIsVisible(0)).toBe(true);
    expect(enemyHitIsVisible(160)).toBe(true);
    expect(enemyHitIsVisible(161)).toBe(false);
  });

  it("maps the parry window to readable 30 FPS timing labels", () => {
    expect(parryTimingSignal(151)).toBe("tooEarly");
    expect(parryTimingSignal(150)).toBe("perfect");
    expect(parryTimingSignal(0)).toBe("perfect");
    expect(parryTimingSignal(-90)).toBe("perfect");
    expect(parryTimingSignal(-91)).toBe("tooLate");
  });

  it("retires an enemy only after its death presentation window", () => {
    expect(enemyDeathIsVisible(0)).toBe(true);
    expect(enemyDeathIsVisible(360)).toBe(true);
    expect(enemyDeathIsVisible(361)).toBe(false);
  });
});
