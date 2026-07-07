import type { GameScreen, SettingsState, RunStats, LeaderboardEntry } from "../app/types";
import type { SubmitOutcome } from "../state/leaderboard/leaderboardService";
import { renderTitleScreen } from "./screens/titleScreen";
import { renderTutorialScreen } from "./screens/tutorialScreen";
import { renderPauseScreen } from "./screens/pauseScreen";
import { renderSettingsScreen } from "./screens/settingsScreen";
import { renderGameOverScreen } from "./screens/gameOverScreen";
import { renderHighscoresScreen } from "./screens/highscoresScreen";
import { renderMobileWarningScreen } from "./screens/mobileWarningScreen";

export type LeaderboardView = {
  state: "online" | "offline" | "disabled";
  tab: "global" | "friends";
  entries: LeaderboardEntry[];
  you: LeaderboardEntry | null;
};

export type HudView = {
  hearts: number;
  maxHearts: number;
  hpPct: number;
  wave: number;
  score: number;
  actionState: string;
};

/** Everything a screen needs to render. Populated by App with live or sample data. */
export type ScreenModel = {
  screen: GameScreen;
  focusedAction: string | null;
  settings: SettingsState;
  bestScore: number;
  bestWave: number;
  hud: HudView;
  runStats: RunStats | null;
  leaderboard: LeaderboardView;
  /** Outcome of the run-end leaderboard submission, shown on game over. */
  submitOutcome: SubmitOutcome | null;
};

type ElProps = Record<string, string> & { text?: string };

/** Tiny declarative DOM builder — avoids innerHTML and keeps screens readable. */
export function el(
  tag: string,
  props: ElProps = {},
  children: Array<Node | string> = [],
): HTMLElement {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (key === "text") {
      node.textContent = value;
    } else if (key === "class") {
      node.className = value;
    } else {
      node.setAttribute(key, value);
    }
  }
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

/** Renders a focusable menu action with the required data hooks. */
export function actionButton(id: string, label: string, focusedAction: string | null): HTMLElement {
  return el("div", {
    class: "menu-action",
    "data-action": id,
    "data-focused": String(focusedAction === id),
    text: label,
  });
}

/**
 * In-game HUD overlay. The playing screen has no dedicated file in the target
 * map because it renders on top of the canvas; it lives here with the shell.
 */
function renderPlayingScreen(model: ScreenModel): HTMLElement {
  const { hud } = model;
  const hearts = el("div", { class: "hud-hearts" });
  for (let i = 0; i < hud.maxHearts; i += 1) {
    hearts.append(
      el("span", { class: i < hud.hearts ? "heart heart-full" : "heart heart-empty", text: "♥" }),
    );
  }

  const hpBar = el("div", { class: "hud-hpbar" }, [
    el("div", { class: "hud-hpbar-fill", style: `width:${Math.round(hud.hpPct * 100)}%` }),
  ]);

  const parryStrip = el("div", { class: "parry-strip", "data-parry-strip": "" }, [
    el("span", { class: "parry-zone parry-early", text: "TOO EARLY" }),
    el("span", { class: "parry-zone parry-perfect", text: "PERFECT" }),
    el("span", { class: "parry-zone parry-late", text: "TOO LATE" }),
  ]);

  return el("div", { class: "screen screen-playing", "data-screen": "playing" }, [
    el("div", { class: "hud" }, [
      el("div", { class: "hud-left" }, [
        hearts,
        el("div", { class: "hud-hp" }, [el("span", { class: "hud-label", text: "HP" }), hpBar]),
      ]),
      el("div", { class: "hud-center" }, [
        el("div", { class: "hud-label", text: "WAVE" }),
        el("div", { class: "hud-value", "data-hud": "wave", text: String(hud.wave) }),
      ]),
      el("div", { class: "hud-right" }, [
        el("div", { class: "hud-label", text: "SCORE" }),
        el("div", { class: "hud-value", "data-hud": "score", text: String(hud.score) }),
      ]),
    ]),
    el("div", { class: "hud-action-state", "data-hud": "action", text: hud.actionState }),
    el("div", { class: "damage-layer", "data-damage-layer": "" }),
    parryStrip,
  ]);
}

const RENDERERS: Record<GameScreen, (model: ScreenModel) => HTMLElement> = {
  title: renderTitleScreen,
  tutorial: renderTutorialScreen,
  playing: renderPlayingScreen,
  paused: renderPauseScreen,
  settings: renderSettingsScreen,
  gameOver: renderGameOverScreen,
  highscores: renderHighscoresScreen,
  mobileWarning: renderMobileWarningScreen,
};

/** Replaces the overlay contents with the current screen. */
export function renderShell(overlayRoot: HTMLElement, model: ScreenModel): void {
  overlayRoot.replaceChildren(RENDERERS[model.screen](model));
}
