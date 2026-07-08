import type { EnemyType, Facing } from "../../app/types";
import { GROUND_Y, LEFT_SPAWN_X, RIGHT_SPAWN_X } from "../constants";
import { enemyStats } from "./enemyStats";

export type EnemyActor = {
  id: string;
  type: EnemyType;
  hp: number;
  x: number;
  y: number;
  side: "left" | "right";
  state:
    | "spawning"
    | "approaching"
    | "windup"
    | "attacking"
    | "recovering"
    | "stunned"
    | "dead";
  facing: Facing;
  shielded: boolean;
  stateChangedAt: number;
  nextImpactAt: number | null;
  stunnedUntil: number | null;
};

/** Builds a fresh enemy of `type` entering from the given side. */
export function createEnemy(
  id: string,
  type: EnemyType,
  side: "left" | "right",
): EnemyActor {
  return {
    id,
    type,
    hp: enemyStats[type].maxHp,
    x: side === "left" ? LEFT_SPAWN_X : RIGHT_SPAWN_X,
    y: GROUND_Y,
    side,
    state: "spawning",
    facing: side === "left" ? "right" : "left",
    shielded: type === "shield",
    stateChangedAt: 0,
    nextImpactAt: null,
    stunnedUntil: null,
  };
}
