import type { SettingsState } from "../../app/types";
import { STEP_MS, GAME_WIDTH, GROUND_Y } from "../constants";
import { createInputParser } from "../input/inputParser";
import { createPlayerStateMachine } from "../player/playerStateMachine";
import { drawPlayerPixel } from "../player/playerSprites";
import { drawEnemyTelegraph } from "../enemies/enemyTelegraphs";
import { drawEnemyPixel } from "../enemies/enemySprites";
import { createRunController } from "../run/runState";
import type { RunState } from "../run/runState";
import { createGameLoop, themeForWave } from "../run/gameLoop";
import { drawPixelBackground } from "../rendering/pixelBackground";
import { createCamera } from "../rendering/camera";
import { createEffectSystem } from "../rendering/effects";
import { primeSpriteSheet } from "../rendering/spriteSheetLoader";
import { createSoundBus } from "../audio/soundBus";
import type { Scene } from "./sceneRouter";
import { ALL_SPRITE_SHEETS } from "../assets/sprites";

const PAUSE_HOLD_MS = 900;

export type MainGameCallbacks = {
  onEnd?: (state: RunState) => void;
  onPauseRequest?: () => void;
};

export type MainGameScene = Scene & {
  getState(): RunState;
  pause(): void;
  resume(): void;
};

const hasRaf = (): boolean => typeof requestAnimationFrame === "function";

/**
 * The full playable run. Uses an internal clock (`performance.now()` minus
 * accumulated paused time) so every absolute timer — enemy impacts, i-frames —
 * stays consistent across pause/resume.
 */
export function createMainGameScene(
  canvas: HTMLCanvasElement,
  settings: SettingsState,
  callbacks: MainGameCallbacks = {},
): MainGameScene {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext("2d");
  } catch {
    ctx = null; // Canvas 2D unavailable (e.g. jsdom); scene runs headless.
  }
  const parser = createInputParser();
  const camera = createCamera();
  const effects = createEffectSystem();
  const sound = createSoundBus(() => settings.volume);

  let pausedOffset = 0;
  let pauseStartedAt: number | null = null;
  const sceneNow = (): number => performance.now() - pausedOffset;

  const startNow = sceneNow();
  const player = createPlayerStateMachine(startNow);
  const controller = createRunController(startNow);
  const loop = createGameLoop(controller, player, { effects, camera, sound, rng: Math.random });

  let running = false;
  let ended = false;
  let last = startNow;
  let rafId = 0;
  let downAt: number | null = null;
  let pauseArmed = false;

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.code !== "Space") return;
    e.preventDefault();
    const now = sceneNow();
    downAt = now;
    pauseArmed = false;
    parser.keyDown(now);
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    if (e.code !== "Space") return;
    e.preventDefault();
    const now = sceneNow();
    downAt = null;
    pauseArmed = false;
    const action = parser.keyUp(now);
    if (action) loop.processInput(action, now);
  };

  const addInput = (): void => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  };
  const removeInput = (): void => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };

  const frame = (nowPerf: number): void => {
    if (!running) return;
    const now = nowPerf - pausedOffset;
    const dt = Math.min(now - last, STEP_MS * 3);
    last = now;

    // Hold-to-pause: only an idle hold pauses; charging belongs to heavy slash.
    if (downAt !== null && !pauseArmed && now - downAt >= PAUSE_HOLD_MS) {
      const st = player.getSnapshot().state;
      if (st === "idle") {
        pauseArmed = true;
        callbacks.onPauseRequest?.();
        return;
      }
    }

    const held = parser.peekHeldAction(now);
    if (held) loop.processInput(held, now);

    loop.update(now, dt);
    player.update(now);
    effects.update(now);

    if (ctx) render(ctx, now);

    if (!ended && controller.state.status !== "running") {
      ended = true;
      sound.stopAmbient();
      callbacks.onEnd?.(controller.state);
      return;
    }

    if (hasRaf()) rafId = requestAnimationFrame(frame);
  };

  const render = (context: CanvasRenderingContext2D, now: number): void => {
    camera.apply(context, now, settings.screenShakeEnabled);
    drawPixelBackground(context, themeForWave(controller.state.wave), now);
    for (const enemy of controller.state.activeEnemies) {
      if (enemy.state === "dead") continue;
      drawEnemyTelegraph(context, enemy, now);
      drawEnemyPixel(context, enemy, now);
    }
    drawPlayerPixel(context, player.getSnapshot(), now);
    effects.draw(context, now, settings.reducedEffectsEnabled);
    camera.restore(context);
    drawCanvasHud(context, controller.state);
  };

  return {
    getState: () => controller.state,
    start: () => {
      if (running) return;
      running = true;
      last = sceneNow();
      for (const def of ALL_SPRITE_SHEETS) primeSpriteSheet(def);
      addInput();
      sound.play("ambient");
      if (hasRaf()) rafId = requestAnimationFrame(frame);
    },
    stop: () => {
      running = false;
      if (hasRaf()) cancelAnimationFrame(rafId);
      removeInput();
      sound.stopAmbient();
    },
    pause: () => {
      if (!running) return;
      running = false;
      if (hasRaf()) cancelAnimationFrame(rafId);
      removeInput();
      sound.stopAmbient();
      pauseStartedAt = performance.now();
    },
    resume: () => {
      if (pauseStartedAt === null) return;
      pausedOffset += performance.now() - pauseStartedAt;
      pauseStartedAt = null;
      parser.reset();
      downAt = null;
      pauseArmed = false;
      running = true;
      last = sceneNow();
      addInput();
      sound.play("ambient");
      if (hasRaf()) rafId = requestAnimationFrame(frame);
    },
  };
}

function drawCanvasHud(ctx: CanvasRenderingContext2D, state: RunState): void {
  ctx.save();
  ctx.fillStyle = "#ff3f62";
  ctx.font = "20px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("HP " + "♥".repeat(Math.max(state.hearts, 0)), 20, 34);

  ctx.fillStyle = "#f4fbff";
  ctx.textAlign = "center";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(`WAVE ${state.wave}`, GAME_WIDTH / 2, 34);

  if (state.combo >= 2) {
    ctx.fillStyle = "#ffe45c";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(`COMBO x${state.combo}`, GAME_WIDTH / 2, 58);
  }

  ctx.fillStyle = "#f4fbff";
  ctx.textAlign = "right";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(`SCORE ${state.score.toLocaleString()}`, GAME_WIDTH - 20, 34);

  if (state.status === "gameOver") drawCenterBanner(ctx, "DEPLOY FAILED", "#ff3f62");
  else if (state.status === "victory") drawCenterBanner(ctx, "SECTOR CLEARED", "#39f6b0");
  ctx.restore();
}

function drawCenterBanner(ctx: CanvasRenderingContext2D, text: string, color: string): void {
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.font = "bold 48px system-ui, sans-serif";
  ctx.fillText(text, GAME_WIDTH / 2, GROUND_Y - 120);
}
