export type SpacebladeScreen = "title" | "tutorial" | "playing" | "paused" | "settings" | "gameOver" | "highscores" | "mobileWarning";

export function shouldPauseForVisibility(hidden: boolean, screen: SpacebladeScreen): boolean {
  return hidden && screen === "playing";
}
