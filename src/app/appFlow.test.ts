import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mountApp } from "./App";
import type { AppHandle } from "./App";
import { createRunController } from "../game/run/runState";

async function waitFor(check: () => void, timeoutMs = 2000, intervalMs = 20): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      check();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  if (lastError) throw lastError;
  throw new Error("waitFor timed out");
}

describe("mountApp", () => {
  let host: HTMLElement;
  let app: AppHandle | null;

  beforeEach(() => {
    localStorage.clear();
    host = document.createElement("div");
    host.id = "app";
    document.body.appendChild(host);
    app = null;
  });

  afterEach(() => {
    app?.destroy();
    host.remove();
  });

  it("renders shell, canvas, and overlay root", () => {
    app = mountApp(host);
    expect(host.querySelector("[data-app-shell]")).not.toBeNull();
    expect(host.querySelector("canvas[data-game-canvas]")).not.toBeNull();
    expect(host.querySelector("[data-overlay-root]")).not.toBeNull();
  });

  it("boots to the title screen on a normal desktop", () => {
    app = mountApp(host);
    expect(app.getScreen()).toBe("title");
    expect(host.querySelector('[data-screen="title"]')).not.toBeNull();
  });

  it("continues from the mobile warning to the title screen with Space only", () => {
    app = mountApp(host, "mobileWarning");
    expect(app.getScreen()).toBe("mobileWarning");

    app.tapSpace();

    expect(app.getScreen()).toBe("title");
    expect(host.querySelector('[data-screen="title"]')).not.toBeNull();
  });

  it("flows title -> tutorial -> playing with Space", () => {
    app = mountApp(host);
    app.tapSpace();
    expect(app.getScreen()).toBe("tutorial");
    app.holdConfirmSpace();
    expect(app.getScreen()).toBe("playing");
  });

  it("flows paused -> settings -> paused with Space", () => {
    app = mountApp(host);
    app.tapSpace(); // title -> tutorial
    app.holdConfirmSpace(); // tutorial -> playing
    app.holdPauseSpace(); // playing -> paused
    expect(app.getScreen()).toBe("paused");

    app.tapSpace(); // focus settings
    expect(app.getFocusedAction()).toBe("settings");
    app.holdConfirmSpace();
    expect(app.getScreen()).toBe("settings");

    app.tapSpace();
    app.tapSpace();
    app.tapSpace(); // focus saveAndClose
    expect(app.getFocusedAction()).toBe("saveAndClose");
    app.holdConfirmSpace();
    expect(app.getScreen()).toBe("paused");
  });

  it("goes from game over to highscores without Firebase configured", async () => {
    app = mountApp(host);
    app.tapSpace(); // title -> tutorial
    app.holdConfirmSpace(); // tutorial -> playing

    const rc = createRunController(0);
    rc.state.score = 1200;
    rc.state.wave = 6;
    rc.state.status = "gameOver";
    app.finishRun(rc.state);
    expect(app.getScreen()).toBe("gameOver");
    await waitFor(() => {
      expect(host.querySelector("[data-submit='disabled']")?.textContent).toBe(
        "Leaderboard disabled — no backend configured",
      );
    });

    app.tapSpace(); // focus highscores
    expect(app.getFocusedAction()).toBe("highscores");
    app.holdConfirmSpace();
    expect(app.getScreen()).toBe("highscores");
    await waitFor(() => {
      expect(host.querySelector("[data-hs-status='disabled']")?.textContent).toBe(
        "Leaderboard disabled · no backend configured",
      );
    });
  });

  it("lets highscores switch to the local Friends tab with Space", async () => {
    localStorage.setItem("spaceblade.bestScore", "900");
    localStorage.setItem("spaceblade.bestWave", "4");
    localStorage.setItem("spaceblade.playerName", "Amit");
    app = mountApp(host);
    app.tapSpace(); // title -> tutorial
    app.holdConfirmSpace(); // tutorial -> playing
    const rc = createRunController(0);
    rc.state.score = 900;
    rc.state.wave = 4;
    rc.state.status = "gameOver";
    app.finishRun(rc.state);
    app.tapSpace(); // focus highscores from game over
    app.holdConfirmSpace();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(host.querySelector(".hs-tab-active")?.textContent).toBe("Global");

    app.tapSpace(); // focus friends
    expect(app.getFocusedAction()).toBe("friends");
    app.holdConfirmSpace();

    expect(host.querySelector(".hs-tab-active")?.textContent).toBe("Friends");
    expect(host.querySelector("[data-you='true']")?.textContent).toContain("Amit");
    expect(host.querySelectorAll("[data-you='true']")).toHaveLength(1);
  });

  it("restarts from game over using only Space", () => {
    app = mountApp(host);
    app.tapSpace(); // title -> tutorial
    app.holdConfirmSpace(); // tutorial -> playing

    const rc = createRunController(0);
    rc.state.score = 300;
    rc.state.wave = 2;
    rc.state.status = "gameOver";
    app.finishRun(rc.state);

    expect(app.getScreen()).toBe("gameOver");
    expect(app.getFocusedAction()).toBe("restart");

    app.holdConfirmSpace();

    expect(app.getScreen()).toBe("playing");
  });

  it("returns from highscores back to game over with Space only", async () => {
    app = mountApp(host);
    app.tapSpace(); // title -> tutorial
    app.holdConfirmSpace(); // tutorial -> playing

    const rc = createRunController(0);
    rc.state.score = 700;
    rc.state.wave = 4;
    rc.state.status = "gameOver";
    app.finishRun(rc.state);

    app.tapSpace(); // focus highscores
    app.holdConfirmSpace();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(app.getScreen()).toBe("highscores");

    app.tapSpace(); // focus friends
    app.tapSpace(); // focus return
    expect(app.getFocusedAction()).toBe("return");
    app.holdConfirmSpace();

    expect(app.getScreen()).toBe("gameOver");
  });

  it("skips the tutorial on the second run once seen", () => {
    app = mountApp(host);
    app.tapSpace(); // title -> tutorial
    app.holdConfirmSpace(); // tutorial -> playing (sets tutorialSeen)
    app.holdPauseSpace(); // playing -> paused
    for (let i = 0; i < 4; i += 1) app.tapSpace(); // focus quitToTitle
    expect(app.getFocusedAction()).toBe("quitToTitle");
    app.holdConfirmSpace(); // -> title
    expect(app.getScreen()).toBe("title");

    app.tapSpace(); // start again -> straight to playing
    expect(app.getScreen()).toBe("playing");
  });

  it("persists best score after a run", () => {
    app = mountApp(host);
    app.tapSpace();
    app.holdConfirmSpace();
    const rc = createRunController(0);
    rc.state.score = 4321;
    rc.state.wave = 9;
    rc.state.status = "gameOver";
    app.finishRun(rc.state);
    expect(localStorage.getItem("spaceblade.bestScore")).toBe("4321");
  });

  it("persists settings across a destroy and remount cycle", () => {
    app = mountApp(host, "settings");

    expect(host.querySelector('[data-action="screenShake"] .settings-value')?.textContent).toBe("On");
    expect(host.querySelector('[data-action="reducedEffects"] .settings-value')?.textContent).toBe("Off");

    app.tapSpace(); // focus screenShake
    expect(app.getFocusedAction()).toBe("screenShake");
    app.holdConfirmSpace(); // toggle off

    app.tapSpace(); // focus reducedEffects
    expect(app.getFocusedAction()).toBe("reducedEffects");
    app.holdConfirmSpace(); // toggle on

    app.tapSpace(); // focus saveAndClose
    expect(app.getFocusedAction()).toBe("saveAndClose");
    app.holdConfirmSpace();
    expect(app.getScreen()).toBe("title");

    app.destroy();
    app = mountApp(host, "settings");

    expect(host.querySelector('[data-action="screenShake"] .settings-value')?.textContent).toBe("Off");
    expect(host.querySelector('[data-action="reducedEffects"] .settings-value')?.textContent).toBe("On");
  });
});
