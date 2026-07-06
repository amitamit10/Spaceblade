import { createPlayerSandboxScene } from "../player/playerSandboxScene";
import type { Scene } from "../player/playerSandboxScene";

export type SceneName = "playerSandbox";

export type { Scene };

/**
 * Maps a scene name to a runnable scene bound to the given canvas.
 *
 * Task 4 registers only `playerSandbox` for manual verification. Later tasks
 * add the main game scene and route between them from the app flow.
 */
export function createScene(name: SceneName, canvas: HTMLCanvasElement): Scene {
  switch (name) {
    case "playerSandbox":
      return createPlayerSandboxScene(canvas);
    default:
      throw new Error(`Unknown scene: ${name as string}`);
  }
}
