import { el } from "../renderShell";
import type { ScreenModel } from "../renderShell";

const CONTROL_ROWS: Array<[string, string, string]> = [
  ["Tap", "Quick Slash", "Fast attack in front of you."],
  ["Hold", "Charge", "Hold to charge a heavy attack."],
  ["Release", "Heavy Slash", "Release after charging to unleash a shockwave."],
  ["Double Tap", "Dodge", "Dash backwards to avoid danger."],
  ["Perfect Timing", "Parry", "Press right before getting hit to parry and stun enemies."],
];

export function renderTutorialScreen(_model: ScreenModel): HTMLElement {
  const rows = CONTROL_ROWS.map(([input, name, desc]) =>
    el("div", { class: "control-row", "data-control": name }, [
      el("span", { class: "control-input", text: input }),
      el("div", { class: "control-body" }, [
        el("span", { class: "control-name", text: name }),
        el("span", { class: "control-desc", text: desc }),
      ]),
    ]),
  );

  return el("div", { class: "screen screen-tutorial", "data-screen": "tutorial" }, [
    el("h2", { class: "screen-heading", text: "How To Play" }),
    el("div", { class: "control-list" }, rows),
    el("p", { class: "screen-hint", text: "Hold Space To Continue" }),
  ]);
}
