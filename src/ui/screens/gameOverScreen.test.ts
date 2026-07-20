import { describe, expect, it } from "vitest";
import { renderGameOverScreen } from "./gameOverScreen";
import type { ScreenModel } from "../renderShell";

function makeModel(
  submitOutcome: ScreenModel["submitOutcome"],
): ScreenModel {
  return {
    screen: "gameOver",
    focusedAction: "restart",
    settings: {
      screenShakeEnabled: true,
      reducedEffectsEnabled: false,
      volume: 0.5,
    },
    bestScore: 1200,
    bestWave: 5,
    hud: { hearts: 0, maxHearts: 3, hpPct: 0, wave: 5, score: 1200, actionState: "Dead" },
    runStats: {
      score: 1200,
      wave: 5,
      hearts: 0,
      enemiesDefeated: 18,
      parries: 3,
      perfectParryStreak: 2,
      bestCombo: 6,
      grade: "B",
    },
    leaderboard: {
      state: "disabled",
      tab: "global",
      entries: [],
      you: null,
    },
    submitOutcome,
  };
}

describe("renderGameOverScreen", () => {
  it("explains that a disabled leaderboard is unconfigured rather than offline", () => {
    const screen = renderGameOverScreen(makeModel("disabled"));

    expect(screen.querySelector(".gameover-title")?.textContent).toBe("GAME OVER");
    expect(screen.querySelector("[data-submit='disabled']")?.textContent).toContain(
      "disabled",
    );
    expect(screen.textContent).not.toContain("Leaderboard offline");
  });
});
