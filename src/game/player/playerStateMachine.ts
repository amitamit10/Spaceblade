import type { InputAction, PlayerStateName, Facing } from "../../app/types";
import { PLAYER_X, GROUND_Y } from "../constants";
import { playerConfig } from "./playerConfig";
import { inputConfig } from "../input/inputConfig";

const PARRY_ACTIVE_MS = 180;

export type PlayerSnapshot = {
  state: PlayerStateName;
  hearts: number;
  facing: Facing;
  x: number;
  y: number;
  invulnerableUntil: number;
  actionStartedAt: number;
};

export type PlayerStateMachine = {
  applyAction(action: InputAction, now: number): PlayerSnapshot;
  applyDamage(now: number): PlayerSnapshot;
  update(now: number): PlayerSnapshot;
  getSnapshot(): PlayerSnapshot;
};

/**
 * Deterministic player kit. All timing is driven by an explicit `now` so the
 * machine is fully testable without a canvas or animation frame.
 *
 * "Recovery" windows are folded into each action's total duration: the player
 * stays in the action state (busy, cannot act) until active + recovery elapse,
 * then returns to idle on the next `update`/`applyAction`.
 */
export function createPlayerStateMachine(now: number): PlayerStateMachine {
  let state: PlayerStateName = "idle";
  let hearts: number = playerConfig.maxHearts;
  let facing: Facing = "right";
  let invulnerableUntil = 0;
  let actionStartedAt = now;
  // Time at which a busy action returns the player to idle. Infinity = charging.
  let busyUntil = 0;

  const snapshot = (): PlayerSnapshot => ({
    state,
    hearts,
    facing,
    x: PLAYER_X,
    y: GROUND_Y,
    invulnerableUntil,
    actionStartedAt,
  });

  const begin = (next: PlayerStateName, startedAt: number, durationMs: number): void => {
    state = next;
    actionStartedAt = startedAt;
    busyUntil = durationMs === Infinity ? Infinity : startedAt + durationMs;
  };

  const settle = (time: number): void => {
    if (state === "dead" || state === "idle" || state === "charging") return;
    if (time >= busyUntil) {
      state = "idle";
      busyUntil = 0;
    }
  };

  const applyAction = (action: InputAction, time: number): PlayerSnapshot => {
    settle(time);
    if (state === "dead") return snapshot();

    if (action === "holdRelease") {
      if (state === "charging") {
        begin(
          "heavySlashing",
          time,
          playerConfig.heavySlashActiveMs + playerConfig.heavySlashRecoveryMs,
        );
      }
      return snapshot();
    }

    // All remaining actions are only accepted from idle.
    if (state !== "idle") return snapshot();

    switch (action) {
      case "tap":
        begin("slashing", time, playerConfig.quickSlashActiveMs + playerConfig.quickSlashRecoveryMs);
        break;
      case "holdStart":
        begin("charging", time, Infinity);
        break;
      case "doubleTap":
        begin("dodging", time, playerConfig.dodgeDurationMs);
        invulnerableUntil = time + inputConfig.dodgeIFrameMs;
        break;
      case "parry":
        begin("parrying", time, PARRY_ACTIVE_MS);
        break;
      default:
        break;
    }
    return snapshot();
  };

  const applyDamage = (time: number): PlayerSnapshot => {
    settle(time);
    if (state === "dead") return snapshot();
    if (time < invulnerableUntil) return snapshot();

    hearts -= 1;
    if (hearts <= 0) {
      hearts = 0;
      state = "dead";
      busyUntil = Infinity;
    } else {
      begin("hurt", time, playerConfig.hurtLockMs);
    }
    return snapshot();
  };

  const update = (time: number): PlayerSnapshot => {
    settle(time);
    return snapshot();
  };

  return { applyAction, applyDamage, update, getSnapshot: snapshot };
}
