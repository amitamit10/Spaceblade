import type { SettingsState } from "../../app/types";
import { STEP_MS, GAME_WIDTH, GROUND_Y } from "../constants";
import { createInputParser } from "../input/inputParser";
import { createPlayerStateMachine } from "../player/playerStateMachine";
import { drawPlayer } from "../player/playerRenderer";
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

const ENEMY_COLORS: Record<EnemyActor["type"], string> = {
  grunt: "#ff6a6a",
  runner: "#ff3f62",
  shield: "#8fb7ff",
  tank: "#c0473d",
  glitch: "#9b5cff",
  boss: "#ff2d55",
};

export type MainGameScene = Scene & {
  getState(): RunState;
};

/**
 * The full playable run: input -> player -> enemies -> waves -> render. Runs
 * its own animation loop and reports the final state through `onEnd`.
 */
export function createMainGameScene(
  canvas: HTMLCanvasElement,
  settings: SettingsState,
  onEnd?: (state: RunState) => void,
): MainGameScene {
  const ctx = canvas.getContext("2d");
  const parser = createInputParser();
  const startNow = performance.now();
  const player = createPlayerStateMachine(startNow);
  const controller = createRunController(startNow);
  const camera = createCamera();
  const effects = createEffectSystem();
  const sound = createSoundBus(() => settings.volume);
  const loop = createGameLoop(controller, player, {
    effects,
    camera,
    sound,
    rng: Math.random,
  });

  let running = false;
  let ended = false;
  let last = startNow;
  let rafId = 0;

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.code !== "Space") return;
    e.preventDefault();
    parser.keyDown(performance.now());
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    if (e.code !== "Space") return;
    e.preventDefault();
    const action = parser.keyUp(performance.now());
    if (action) loop.processInput(action, performance.now());
  };

  const frame = (nowPerf: number): void => {
    if (!running) return;
    const now = nowPerf;
    const dt = Math.min(now - last, STEP_MS * 3);
    last = now;

    const held = parser.peekHeldAction(now);
    if (held) loop.processInput(held, now);

    loop.update(now, dt);
    player.update(now);
    effects.update(now);

    if (ctx) render(ctx, now);

    if (!ended && controller.state.status !== "running") {
      ended = true;
      sound.stopAmbient();
      onEnd?.(controller.state);
    }

    rafId = requestAnimationFrame(frame);
  };

  const render = (context: CanvasRenderingContext2D, now: number): void => {
    camera.apply(context, now, settings.screenShakeEnabled);
    drawBackground(context, themeForWave(controller.state.wave), now);
    for (const enemy of controller.state.activeEnemies) {
      if (enemy.state === "dead") continue;
      drawEnemyTelegraph(context, enemy, now);
      drawEnemyBody(context, enemy);
    }
    drawPlayer(context, player.getSnapshot(), now);
    effects.draw(context, now, settings.reducedEffectsEnabled);
    camera.restore(context);
    drawCanvasHud(context, controller.state);
  };

  return {
    getState: () => controller.state,
    start: () => {
      if (running) return;
      running = true;
      last = performance.now();
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      sound.play("ambient");
      rafId = requestAnimationFrame(frame);
    },
    stop: () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      sound.stopAmbient();
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

  // Shadow.
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
  ctx.fillText("HP " + "♥".repeat(state.hearts), 20, 34);

  ctx.fillStyle = "#f4fbff";
  ctx.textAlign = "center";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(`WAVE ${state.wave}`, GAME_WIDTH / 2, 34);

  ctx.textAlign = "right";
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
