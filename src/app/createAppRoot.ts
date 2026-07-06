import { createCanvasRoot } from "../game/rendering/canvasRoot";

export type AppRoot = {
  shell: HTMLDivElement;
  canvas: HTMLCanvasElement;
  overlayRoot: HTMLDivElement;
};

/**
 * Builds the static DOM shell: a canvas for gameplay rendering and an overlay
 * root that hosts all DOM screens. Later tasks render screens into overlayRoot.
 */
export function createAppRoot(root: HTMLElement): AppRoot {
  root.innerHTML = "";

  const shell = document.createElement("div");
  shell.className = "spaceblade-app";
  shell.setAttribute("data-app-shell", "");

  const canvas = createCanvasRoot(shell);

  const overlayRoot = document.createElement("div");
  overlayRoot.className = "overlay-root";
  overlayRoot.setAttribute("data-overlay-root", "");
  shell.appendChild(overlayRoot);

  root.appendChild(shell);

  return { shell, canvas, overlayRoot };
}
