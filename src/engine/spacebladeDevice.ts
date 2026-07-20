export type SpacebladeEntryScreen = "title" | "mobileWarning";

export function initialSpacebladeScreen(hasCoarsePointer: boolean): SpacebladeEntryScreen {
  return hasCoarsePointer ? "mobileWarning" : "title";
}
