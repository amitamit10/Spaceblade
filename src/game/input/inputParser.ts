import type { InputAction } from "../../app/types";
import { inputConfig } from "./inputConfig";

export type { InputAction };

export type InputParser = {
  /** Space pressed. Starts a hold; returns null. Auto-repeat is ignored. */
  keyDown(now: number): null;
  /** Space released. Resolves the press into a discrete action, or null. */
  keyUp(now: number): InputAction | null;
  /** Emits `holdStart` exactly once after the charge threshold while held. */
  peekHeldAction(now: number): InputAction | null;
  /** True while Space is physically held. */
  isHeld(): boolean;
  reset(): void;
};

/**
 * Converts raw Space keydown/up timestamps into deterministic actions:
 *
 * - `keyup` before `tapMaxMs` -> `tap` (or `doubleTap` if it completes a pair).
 * - `keyup` at or after `heavyMinMs` -> `holdRelease`.
 * - a `keyup` between the two thresholds is an aborted charge -> `null`.
 * - `peekHeldAction` yields `holdStart` once past `chargeStartMs`.
 *
 * Parry is NOT produced here — combat upgrades a valid `tap` to `parry` when an
 * enemy impact lands inside the parry window.
 */
export function createInputParser(): InputParser {
  const { tapMaxMs, chargeStartMs, heavyMinMs, doubleTapWindowMs } = inputConfig;

  let heldSince: number | null = null;
  let holdStartEmitted = false;
  let lastTapUpAt: number | null = null;

  return {
    keyDown: (now: number): null => {
      if (heldSince !== null) return null; // ignore browser auto-repeat
      heldSince = now;
      holdStartEmitted = false;
      return null;
    },

    keyUp: (now: number): InputAction | null => {
      if (heldSince === null) return null;
      const heldMs = now - heldSince;
      heldSince = null;
      holdStartEmitted = false;

      if (heldMs < tapMaxMs) {
        if (lastTapUpAt !== null && now - lastTapUpAt <= doubleTapWindowMs) {
          lastTapUpAt = null;
          return "doubleTap";
        }
        lastTapUpAt = now;
        return "tap";
      }

      if (heldMs >= heavyMinMs) {
        return "holdRelease";
      }

      // Aborted charge: held past a tap but released before a heavy commits.
      return null;
    },

    peekHeldAction: (now: number): InputAction | null => {
      if (heldSince === null || holdStartEmitted) return null;
      if (now - heldSince >= chargeStartMs) {
        holdStartEmitted = true;
        return "holdStart";
      }
      return null;
    },

    isHeld: () => heldSince !== null,

    reset: () => {
      heldSince = null;
      holdStartEmitted = false;
      lastTapUpAt = null;
    },
  };
}
