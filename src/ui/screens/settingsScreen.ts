import { el, actionButton } from "../renderShell";
import type { ScreenModel } from "../renderShell";

export const SETTINGS_ACTIONS = [
  "volume",
  "screenShake",
  "reducedEffects",
  "saveAndClose",
] as const;

export function renderSettingsScreen(model: ScreenModel): HTMLElement {
  const { settings } = model;

  const row = (id: string, label: string, valueText: string): HTMLElement => {
    const action = actionButton(id, label, model.focusedAction);
    action.classList.add("settings-row");
    action.append(el("span", { class: "settings-value", text: valueText }));
    return action;
  };

  return el("div", { class: "screen screen-settings", "data-screen": "settings" }, [
    el("div", { class: "panel" }, [
      el("h2", { class: "screen-heading", text: "Settings" }),
      el("div", { class: "menu-list" }, [
        row("volume", "Volume", `${Math.round(settings.volume * 100)}%`),
        row("screenShake", "Screen Shake", settings.screenShakeEnabled ? "On" : "Off"),
        row("reducedEffects", "Reduced Effects", settings.reducedEffectsEnabled ? "On" : "Off"),
        actionButton("saveAndClose", "Save And Close", model.focusedAction),
      ]),
      el("p", { class: "screen-hint", text: "Tap To Move · Hold To Toggle / Save" }),
    ]),
  ]);
}
