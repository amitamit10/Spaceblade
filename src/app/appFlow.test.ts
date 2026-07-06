import { describe, it, expect, beforeEach } from "vitest";
import { mountApp } from "./App";

describe("mountApp", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    host.id = "app";
    document.body.appendChild(host);
    host.innerHTML = "";
  });

  it("renders the app shell", () => {
    mountApp(host);
    expect(host.querySelector("[data-app-shell]")).not.toBeNull();
  });

  it("renders the game canvas", () => {
    mountApp(host);
    expect(host.querySelector("canvas[data-game-canvas]")).not.toBeNull();
  });

  it("renders the overlay root", () => {
    mountApp(host);
    expect(host.querySelector("[data-overlay-root]")).not.toBeNull();
  });

  it("starts on the title screen", () => {
    const app = mountApp(host);
    expect(app.getScreen()).toBe("title");
    expect(host.querySelector('[data-screen="title"]')).not.toBeNull();
  });
});
