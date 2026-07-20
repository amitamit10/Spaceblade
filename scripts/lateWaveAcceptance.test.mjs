import { describe, expect, it } from "vitest";
import { isLateWaveComplete, isUnexpectedLateWaveEnd, shouldDodgeTelegraph, shouldPrioritizeParry } from "./lateWaveAcceptance.mjs";

describe("late-wave acceptance", () => {
  it("requires a victory status after reaching the boss wave", () => {
    expect(isLateWaveComplete({ screen: "playing", runStatus: "playing", wave: 15 }, 15)).toBe(false);
    expect(isLateWaveComplete({ screen: "gameOver", runStatus: "victory", wave: 15 }, 15)).toBe(true);
  });

  it("accepts an active run once a non-boss target wave is reached", () => {
    expect(isLateWaveComplete({ screen: "playing", runStatus: "playing", wave: 8 }, 8)).toBe(true);
  });

  it("rejects game over before the requested target", () => {
    expect(isUnexpectedLateWaveEnd({ screen: "gameOver", runStatus: "gameOver", wave: 8 }, 15)).toBe(true);
    expect(isUnexpectedLateWaveEnd({ screen: "gameOver", runStatus: "victory", wave: 15 }, 15)).toBe(false);
  });

  it("prioritizes the parry response whenever a telegraph is active", () => {
    expect(shouldPrioritizeParry({ parryTiming: "tooEarly" })).toBe(true);
    expect(shouldPrioritizeParry({ parryTiming: "perfect" })).toBe(true);
    expect(shouldPrioritizeParry({ parryTiming: "tooLate" })).toBe(true);
    expect(shouldPrioritizeParry({ parryTiming: "none" })).toBe(false);
  });

  it("uses a dodge for an active telegraph outside the perfect parry window", () => {
    expect(shouldDodgeTelegraph({ parryTiming: "tooEarly" })).toBe(true);
    expect(shouldDodgeTelegraph({ parryTiming: "tooLate" })).toBe(true);
    expect(shouldDodgeTelegraph({ parryTiming: "perfect" })).toBe(false);
    expect(shouldDodgeTelegraph({ parryTiming: "none" })).toBe(false);
  });
});
