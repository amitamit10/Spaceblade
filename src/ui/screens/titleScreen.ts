import { el, actionButton } from "../renderShell";
import type { ScreenModel } from "../renderShell";
import { TITLE_TAGLINE } from "../../game/constants";

export function renderTitleScreen(model: ScreenModel): HTMLElement {
  return el("div", { class: "screen screen-title", "data-screen": "title" }, [
    el("h1", { class: "title-logo", text: "Spaceblade" }),
    el("p", { class: "title-tagline", text: TITLE_TAGLINE }),
    el("p", { class: "title-teaser", text: `BEST  ${model.bestScore.toLocaleString()}  ·  WAVE ${model.bestWave}` }),
    el("div", { class: "menu-list" }, [
      actionButton("start", "Press Space To Start", model.focusedAction),
    ]),
  ]);
}
