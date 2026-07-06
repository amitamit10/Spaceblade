import { el, actionButton } from "../renderShell";
import type { ScreenModel } from "../renderShell";

export const PAUSE_ACTIONS = [
  "resume",
  "settings",
  "howToPlay",
  "restartRun",
  "quitToTitle",
] as const;

const LABELS: Record<string, string> = {
  resume: "Resume",
  settings: "Settings",
  howToPlay: "How To Play",
  restartRun: "Restart Run",
  quitToTitle: "Quit To Title",
};

export function renderPauseScreen(model: ScreenModel): HTMLElement {
  return el("div", { class: "screen screen-paused", "data-screen": "paused" }, [
    el("div", { class: "panel" }, [
      el("h2", { class: "screen-heading", text: "Paused" }),
      el(
        "div",
        { class: "menu-list" },
        PAUSE_ACTIONS.map((id) => actionButton(id, LABELS[id], model.focusedAction)),
      ),
      el("p", { class: "screen-hint", text: "Tap To Move · Hold To Select" }),
    ]),
  ]);
}
