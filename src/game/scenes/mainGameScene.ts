import type { SettingsState } from "../../app/types";
import { STEP_MS, GAME_WIDTH, GROUND_Y } from "../constants";
import { createInputParser } from "../input/inputParser";
import { createPlayerStateMachine } from "../player/playerStateMachine";
import { drawPlayerPixel } from "../player/playerSprites";
import type { EnemyActor } from "../enemies/enemyFactory";
import { drawEnemyTelegraph } from "../enemies/enemyTelegraphs";
import { createRunController } from "../run/runState";
import type { RunState } from "../run/runState";
import { createGameLoop, themeForWave } from "../run/gameLoop";
import { drawBackground } from "../rendering/backgroundLayers";
import { createCamera } from "../rendering/camera";
import { createEffectSystem } from "../rendering/effects";
import { createSoundBus } from "../audio/soundBus";
import type { Scene } from "./sceneRouter";

const PAUSE_HOLD_MS = 900;

const ENEMY_COLORS: Record<EnemyActor["type"], string> = {
  grunt: "#ff6a6a",
  runner: "#ff3f62",
  shield: "#8fb7ff",
  tank: "#c0473d",
  glitch: "#9b5cff",
  boss: "#ff2d55",
};

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

    // Hold-to-pause: a sustained hold while idle/charging requests a pause.
    if (downAt !== null && !pauseArmed && now - downAt >= PAUSE_HOLD_MS) {
      const st = player.getSnapshot().state;
      if (st === "idle" || st === "charging") {
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
    drawBackground(context, themeForWave(controller.state.wave), now);
    for (const enemy of controller.state.activeEnemies) {
      if (enemy.state === "dead") continue;
      drawEnemyTelegraph(context, enemy, now);
      drawEnemyBody(context, enemy);
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

function drawEnemyBody(ctx: CanvasRenderingContext2D, enemy: EnemyActor): void {
  const color = ENEMY_COLORS[enemy.type];
  const scale = enemy.type === "boss" ? 1.7 : enemy.type === "tank" ? 1.35 : 1;
  const w = 18 * scale;
  const h = 56 * scale;
  ctx.save();
  ctx.globalAlpha = enemy.state === "stunned" ? 0.5 : 1;

  ctx.fillStyle = "#02040a";
  ctx.globalAlpha *= 0.35;
  ctx.beginPath();
  ctx.ellipse(enemy.x, enemy.y + 30, w, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = enemy.state === "stunned" ? 0.5 : 1;

  ctx.fillStyle = color;
  ctx.fillRect(enemy.x - w / 2, enemy.y - h + 30, w, h);
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y - h + 26, w * 0.5, 0, Math.PI * 2);
  ctx.fill();

  if (enemy.shielded) {
    const dir = enemy.facing === "right" ? 1 : -1;
    ctx.fillStyle = "#bcd4ff";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(enemy.x + dir * (w / 2 + 2), enemy.y - h + 34, 6, h - 8);
  }
  ctx.restore();
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
