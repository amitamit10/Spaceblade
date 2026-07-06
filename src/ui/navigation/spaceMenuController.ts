export type SpaceMenuController = {
  getFocusedAction(): string | null;
  onTap(): void;
  onHoldConfirm(): void;
  reset(): void;
};

/**
 * Drives Space-only menu navigation for a single screen.
 *
 * - A tap advances focus to the next action, wrapping around.
 * - A hold-confirm invokes `onConfirm` with the currently focused action.
 *
 * Screens with a single action never move focus on tap; the tap-vs-confirm
 * distinction for those screens is decided by the caller.
 */
export function createSpaceMenuController(
  actions: readonly string[],
  onConfirm: (action: string) => void,
): SpaceMenuController {
  let focusIndex = 0;

  return {
    getFocusedAction: () => actions[focusIndex] ?? null,
    onTap: () => {
      if (actions.length > 1) {
        focusIndex = (focusIndex + 1) % actions.length;
      }
    },
    onHoldConfirm: () => {
      const action = actions[focusIndex];
      if (action !== undefined) onConfirm(action);
    },
    reset: () => {
      focusIndex = 0;
    },
  };
}
