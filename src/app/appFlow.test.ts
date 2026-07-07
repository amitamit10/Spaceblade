import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mountApp } from "./App";
import type { AppHandle } from "./App";
import { createRunController } from "../game/run/runState";

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

  it("goes from game over to highscores without Firebase configured", () => {
    app = mountApp(host);
    app.tapSpace(); // title -> tutorial
    app.holdConfirmSpace(); // tutorial -> playing

    const rc = createRunController(0);
    rc.state.score = 1200;
    rc.state.wave = 6;
    rc.state.status = "gameOver";
    app.finishRun(rc.state);
    expect(app.getScreen()).toBe("gameOver");

    app.tapSpace(); // focus highscores
    expect(app.getFocusedAction()).toBe("highscores");
    app.holdConfirmSpace();
    expect(app.getScreen()).toBe("highscores");
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
});
