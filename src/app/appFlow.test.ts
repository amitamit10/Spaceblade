import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mountApp } from "./App";
import type { AppHandle } from "./App";

describe("mountApp", () => {
  let host: HTMLElement;
  let app: AppHandle | null;

  beforeEach(() => {
    host = document.createElement("div");
    host.id = "app";
    document.body.appendChild(host);
    app = null;
  });

  afterEach(() => {
    app?.destroy();
    host.remove();
  });

  it("renders the app shell", () => {
    app = mountApp(host);
    expect(host.querySelector("[data-app-shell]")).not.toBeNull();
  });

  it("renders the game canvas", () => {
    app = mountApp(host);
    expect(host.querySelector("canvas[data-game-canvas]")).not.toBeNull();
  });

  it("renders the overlay root", () => {
    app = mountApp(host);
    expect(host.querySelector("[data-overlay-root]")).not.toBeNull();
  });

  it("starts on the title screen", () => {
    app = mountApp(host);
    expect(app.getScreen()).toBe("title");
    expect(host.querySelector('[data-screen="title"]')).not.toBeNull();
  });

  it("flows title -> tutorial -> playing with Space", () => {
    app = mountApp(host);
    // Title has a single action: a tap starts the run.
    app.tapSpace();
    expect(app.getScreen()).toBe("tutorial");
    expect(host.querySelector('[data-screen="tutorial"]')).not.toBeNull();

    // Tutorial continues on hold.
    app.holdConfirmSpace();
    expect(app.getScreen()).toBe("playing");
    expect(host.querySelector('[data-screen="playing"]')).not.toBeNull();
  });

  it("flows paused -> settings -> paused with Space", () => {
    app = mountApp(host);
    // Reach playing.
    app.tapSpace(); // title -> tutorial
    app.holdConfirmSpace(); // tutorial -> playing
    // Idle hold pauses.
    app.holdPauseSpace();
    expect(app.getScreen()).toBe("paused");

    // Focus "settings" (second action) and confirm.
    app.tapSpace();
    expect(app.getFocusedAction()).toBe("settings");
    app.holdConfirmSpace();
    expect(app.getScreen()).toBe("settings");

    // Move to "Save And Close" (4th action) and confirm back to paused.
    app.tapSpace();
    app.tapSpace();
    app.tapSpace();
    expect(app.getFocusedAction()).toBe("saveAndClose");
    app.holdConfirmSpace();
    expect(app.getScreen()).toBe("paused");
  });

  it("skips tutorial on the second run once seen", () => {
    app = mountApp(host);
    app.tapSpace(); // title -> tutorial
    app.holdConfirmSpace(); // tutorial -> playing (tutorialSeen = true)
    app.holdPauseSpace(); // playing -> paused
    // Quit to title (5th action).
    for (let i = 0; i < 4; i += 1) app.tapSpace();
    expect(app.getFocusedAction()).toBe("quitToTitle");
    app.holdConfirmSpace();
    expect(app.getScreen()).toBe("title");
    // Start again -> should go straight to playing.
    app.tapSpace();
    expect(app.getScreen()).toBe("playing");
  });
});
