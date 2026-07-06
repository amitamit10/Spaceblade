import { createInputParser } from "../input/inputParser";
import { createPlayerStateMachine } from "./playerStateMachine";
import { drawPlayer } from "./playerRenderer";
import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y } from "../constants";

export type Scene = {
  start(): void;
  stop(): void;
};

/**
 * Manual-verification scene: drive the player with Space only and watch every
 * action render on the canvas. Not used by the shipped app flow; it exists so
 * player timing/feel can be judged in isolation before enemies exist.
 */
export function createPlayerSandboxScene(canvas: HTMLCanvasElement): Scene {
  const ctx = canvas.getContext("2d");
  const parser = createInputParser();
  const player = createPlayerStateMachine(performance.now());

  let rafId = 0;
  let running = false;

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.code !== "Space") return;
    e.preventDefault();
    parser.keyDown(performance.now());
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    if (e.code !== "Space") return;
    e.preventDefault();
    const action = parser.keyUp(performance.now());
    if (action) player.applyAction(action, performance.now());
  };

  const frame = (): void => {
    if (!running) return;
    const now = performance.now();
    const held = parser.peekHeldAction(now);
    if (held) player.applyAction(held, now);
    player.update(now);

    if (ctx) {
      drawArena(ctx);
      drawPlayer(ctx, player.getSnapshot(), now);
    }
    rafId = requestAnimationFrame(frame);
  };

  return {
    start: () => {
      if (running) return;
      running = true;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      rafId = requestAnimationFrame(frame);
    },
    stop: () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}

function drawArena(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#050812";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.strokeStyle = "#1bbde3";
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 34);
  ctx.lineTo(GAME_WIDTH, GROUND_Y + 34);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
