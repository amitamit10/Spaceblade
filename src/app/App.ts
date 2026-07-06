import { createAppRoot } from "./createAppRoot";
import type { AppRoot } from "./createAppRoot";
import type { GameScreen } from "./types";
import { TITLE_TAGLINE } from "../game/constants";

export type AppHandle = {
  root: AppRoot;
  getScreen(): GameScreen;
};

/**
 * Mounts the Spaceblade app into the given host element.
 *
 * Task 1 scope: build the DOM shell (canvas + overlay root) and show a minimal
 * title screen. Task 2 replaces the placeholder overlay with the full screen
 * flow rendered via renderShell.
 */
export function mountApp(host: HTMLElement): AppHandle {
  const root = createAppRoot(host);
  let screen: GameScreen = "title";

  renderTitlePlaceholder(root);

  return {
    root,
    getScreen: () => screen,
  };
}

function renderTitlePlaceholder(root: AppRoot): void {
  const screenEl = document.createElement("div");
  screenEl.className = "screen screen-title";
  screenEl.setAttribute("data-screen", "title");

  const heading = document.createElement("h1");
  heading.className = "title-logo";
  heading.textContent = "Spaceblade";

  const tagline = document.createElement("p");
  tagline.className = "title-tagline";
  tagline.textContent = TITLE_TAGLINE;

  screenEl.append(heading, tagline);
  root.overlayRoot.appendChild(screenEl);
}
