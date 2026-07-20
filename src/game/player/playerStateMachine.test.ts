import { describe, it, expect } from "vitest";
import { createPlayerStateMachine } from "./playerStateMachine";

describe("createPlayerStateMachine", () => {
  it("starts idle with 3 hearts facing right", () => {
    const p = createPlayerStateMachine(0);
    const s = p.getSnapshot();
    expect(s.state).toBe("idle");
    expect(s.hearts).toBe(3);
    expect(s.facing).toBe("right");
  });

  it("can update facing without changing the current action", () => {
    const p = createPlayerStateMachine(0);
    p.applyAction("holdStart", 100);
    const s = p.face("left");
    expect(s.state).toBe("charging");
    expect(s.facing).toBe("left");
  });

  it("moves idle -> slashing -> idle after active plus recovery", () => {
    const p = createPlayerStateMachine(0);
    expect(p.applyAction("tap", 0).state).toBe("slashing");
    expect(p.update(279).state).toBe("slashing"); // 120 + 160 = 280
    expect(p.update(280).state).toBe("idle");
  });

  it("moves idle -> charging -> heavySlashing -> idle", () => {
    const p = createPlayerStateMachine(0);
    expect(p.applyAction("holdStart", 0).state).toBe("charging");
    expect(p.update(1000).state).toBe("charging"); // charging holds indefinitely
    expect(p.applyAction("holdRelease", 1000).state).toBe("heavySlashing");
    expect(p.update(1000 + 459).state).toBe("heavySlashing"); // 180 + 280 = 460
    expect(p.update(1000 + 460).state).toBe("idle");
  });

  it("doubleTap grants invulnerability until at least now + 500", () => {
    const p = createPlayerStateMachine(0);
    const s = p.applyAction("doubleTap", 100);
    expect(s.state).toBe("dodging");
    expect(s.invulnerableUntil).toBeGreaterThanOrEqual(100 + 500);
  });

  it("parry from idle enters parrying", () => {
    const p = createPlayerStateMachine(0);
    expect(p.applyAction("parry", 0).state).toBe("parrying");
  });

  it("ignores actions while busy", () => {
    const p = createPlayerStateMachine(0);
    p.applyAction("tap", 0);
    // Still slashing at 50ms; a second tap does not restart or change state.
    expect(p.applyAction("tap", 50).state).toBe("slashing");
  });

  it("applyDamage reduces hearts by one when vulnerable", () => {
    const p = createPlayerStateMachine(0);
    expect(p.applyDamage(0).hearts).toBe(2);
  });

  it("does not take damage while invulnerable", () => {
    const p = createPlayerStateMachine(0);
    p.applyAction("doubleTap", 0); // invulnerable until 500
    expect(p.applyDamage(100).hearts).toBe(3);
  });

  it("becomes temporarily invulnerable during hurt recovery after taking a hit", () => {
    const p = createPlayerStateMachine(0);
    expect(p.applyDamage(0).hearts).toBe(2);
    expect(p.applyDamage(200).hearts).toBe(2);
    expect(p.applyDamage(420).hearts).toBe(1);
  });

  it("dies on the third damage event", () => {
    const p = createPlayerStateMachine(0);
    p.applyDamage(0); // 2
    p.applyDamage(500); // 1 (after hurt lock)
    const s = p.applyDamage(1000); // 0
    expect(s.hearts).toBe(0);
    expect(s.state).toBe("dead");
  });

  it("stays dead permanently", () => {
    const p = createPlayerStateMachine(0);
    p.applyDamage(0);
    p.applyDamage(500);
    p.applyDamage(1000);
    expect(p.applyAction("tap", 2000).state).toBe("dead");
    expect(p.update(5000).state).toBe("dead");
  });
});
