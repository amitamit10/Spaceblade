import { el, actionButton } from "../renderShell";
import type { ScreenModel } from "../renderShell";

export const GAME_OVER_ACTIONS = ["restart", "highscores", "quitToTitle"] as const;

const LABELS: Record<string, string> = {
  restart: "Restart",
  highscores: "Highscores",
  quitToTitle: "Quit To Title",
};

export function renderGameOverScreen(model: ScreenModel): HTMLElement {
  const stats = model.runStats;
  const score = stats?.score ?? model.hud.score;
  const wave = stats?.wave ?? model.hud.wave;
  const defeated = stats?.enemiesDefeated ?? 0;
  const grade = stats?.grade ?? null;

  const stat = (label: string, value: string): HTMLElement =>
    el("div", { class: "stat" }, [
      el("span", { class: "stat-value", text: value }),
      el("span", { class: "stat-label", text: label }),
    ]);

  return el("div", { class: "screen screen-gameover", "data-screen": "gameOver" }, [
    el("div", { class: "panel" }, [
      el("h2", { class: "gameover-title", text: "DEPLOY FAILED" }),
      el("div", { class: "final-score" }, [
        el("span", { class: "stat-label", text: "FINAL SCORE" }),
        el("span", { class: "final-score-value", text: score.toLocaleString() }),
      ]),
      el("div", { class: "stat-row" }, [
        stat("Waves Reached", String(wave)),
        stat("Enemies Defeated", String(defeated)),
        stat("Grade", grade ?? "—"),
      ]),
      el("p", { class: "submit-status", "data-submit": model.submitOutcome ?? "", text: submitLabel(model.submitOutcome) }),
      el(
        "div",
        { class: "menu-list menu-horizontal" },
        GAME_OVER_ACTIONS.map((id) => actionButton(id, LABELS[id], model.focusedAction)),
      ),
    ]),
  ]);
}

function submitLabel(outcome: ScreenModel["submitOutcome"]): string {
  switch (outcome) {
    case "submitted":
      return "Score submitted to leaderboard";
    case "skipped":
      return "Score too low to rank";
    case "offline":
      return "Offline — score saved locally";
    case "disabled":
      return "Leaderboard offline";
    default:
      return "";
  }
}
