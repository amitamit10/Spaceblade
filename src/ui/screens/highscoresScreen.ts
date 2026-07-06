import { el, actionButton } from "../renderShell";
import type { ScreenModel } from "../renderShell";
import type { LeaderboardEntry } from "../../app/types";

export const HIGHSCORES_ACTIONS = ["return"] as const;

const STATUS_TEXT: Record<string, string> = {
  online: "Online · global leaderboard",
  offline: "Offline · showing local results",
  disabled: "Leaderboard disabled · no backend configured",
};

function entryRow(rank: string, entry: LeaderboardEntry, isYou: boolean): HTMLElement {
  return el("div", { class: isYou ? "score-row score-you" : "score-row", "data-you": String(isYou) }, [
    el("span", { class: "score-rank", text: rank }),
    el("span", { class: "score-player", text: entry.playerName }),
    el("span", { class: "score-waves", text: String(entry.wave) }),
    el("span", { class: "score-score", text: entry.score.toLocaleString() }),
  ]);
}

export function renderHighscoresScreen(model: ScreenModel): HTMLElement {
  const { leaderboard } = model;
  const tabs = (["global", "friends"] as const).map((tab) =>
    el("span", {
      class: leaderboard.tab === tab ? "hs-tab hs-tab-active" : "hs-tab",
      "data-tab": tab,
      text: tab === "global" ? "Global" : "Friends",
    }),
  );

  const header = el("div", { class: "score-row score-header" }, [
    el("span", { class: "score-rank", text: "RANK" }),
    el("span", { class: "score-player", text: "PLAYER" }),
    el("span", { class: "score-waves", text: "WAVES" }),
    el("span", { class: "score-score", text: "SCORE" }),
  ]);

  const rows = leaderboard.entries.map((entry, i) =>
    entryRow(String(i + 1), entry, model.leaderboard.you === entry),
  );

  const list = el("div", { class: "score-list" }, [header, ...rows]);
  if (leaderboard.you) {
    list.append(entryRow("—", leaderboard.you, true));
  }

  return el("div", { class: "screen screen-highscores", "data-screen": "highscores" }, [
    el("div", { class: "panel" }, [
      el("h2", { class: "screen-heading", text: "Highscores" }),
      el("div", { class: "hs-tabs" }, tabs),
      el("p", { class: "hs-status", "data-hs-status": leaderboard.state, text: STATUS_TEXT[leaderboard.state] }),
      list,
      el("div", { class: "menu-list" }, [actionButton("return", "Return", model.focusedAction)]),
    ]),
  ]);
}
