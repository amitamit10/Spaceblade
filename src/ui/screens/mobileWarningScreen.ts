import { el, actionButton } from "../renderShell";
import type { ScreenModel } from "../renderShell";

export const MOBILE_WARNING_ACTIONS = ["continue"] as const;

export function renderMobileWarningScreen(model: ScreenModel): HTMLElement {
  return el("div", { class: "screen screen-mobilewarning", "data-screen": "mobileWarning" }, [
    el("div", { class: "panel" }, [
      el("div", { class: "warning-icon", text: "⚠" }),
      el("h2", { class: "screen-heading", text: "Keyboard Recommended" }),
      el("p", {
        class: "warning-body",
        text: "Spaceblade is designed for keyboard play. For the best experience, please use a keyboard.",
      }),
      el("div", { class: "menu-list" }, [actionButton("continue", "Continue", model.focusedAction)]),
    ]),
  ]);
}
