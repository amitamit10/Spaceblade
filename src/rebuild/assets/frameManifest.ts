export type FrameAnimation = {
  readonly frames: readonly string[];
  readonly frameDurationMs: number;
  readonly loop: boolean;
};

export type RebuildSprite = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly animations: Readonly<Record<string, FrameAnimation>>;
};

const authoredFramePaths = (folder: string, action: string, count: number): string[] =>
  Array.from({ length: count }, (_, index) =>
    `/sprites/frames/${folder}/${action}-${String(index).padStart(2, "0")}.png?v=public-robot-pack-1`,
  );

const soldierPose = (pose: string): string =>
  `/assets/public/kenney-platformer-characters/PNG/Soldier/Poses/soldier_${pose}.png?v=kenney-soldier-1`;

export const REBUILD_PLAYER: RebuildSprite = {
  id: "player",
  width: 80,
  height: 110,
  scale: 1.9,
  anchorX: 40,
  anchorY: 109,
  animations: {
    idle: { frames: [soldierPose("idle")], frameDurationMs: 110, loop: true },
    run: { frames: [soldierPose("walk1"), soldierPose("walk2")], frameDurationMs: 90, loop: true },
    walk: { frames: [soldierPose("walk1"), soldierPose("walk2")], frameDurationMs: 110, loop: true },
    climb: { frames: [soldierPose("climb1"), soldierPose("climb2")], frameDurationMs: 180, loop: true },
    hang: { frames: [soldierPose("hang")], frameDurationMs: 180, loop: true },
    jump: { frames: [soldierPose("jump")], frameDurationMs: 180, loop: false },
    fall: { frames: [soldierPose("fall")], frameDurationMs: 180, loop: false },
    slash: { frames: [soldierPose("action1"), soldierPose("action2")], frameDurationMs: 90, loop: false },
    charging: { frames: [soldierPose("hold1"), soldierPose("hold2")], frameDurationMs: 120, loop: true },
    heavy: { frames: [soldierPose("action2"), soldierPose("action1")], frameDurationMs: 90, loop: false },
    dodge: { frames: [soldierPose("kick"), soldierPose("jump")], frameDurationMs: 90, loop: false },
    parry: { frames: [soldierPose("hold1"), soldierPose("hold2")], frameDurationMs: 90, loop: false },
    hurt: { frames: [soldierPose("hurt")], frameDurationMs: 120, loop: false },
    dead: { frames: [soldierPose("fall")], frameDurationMs: 180, loop: false },
  },
};

export const REBUILD_ENEMIES: readonly RebuildSprite[] = [
  { id: "grunt", width: 64, height: 64, scale: 1.45, anchorX: 32, anchorY: 63, animations: { walk: { frames: authoredFramePaths("grunt", "walk", 4), frameDurationMs: 110, loop: true }, windup: { frames: authoredFramePaths("grunt", "windup", 2), frameDurationMs: 100, loop: true }, attack: { frames: authoredFramePaths("grunt", "attack", 3), frameDurationMs: 60, loop: false }, hurt: { frames: authoredFramePaths("grunt", "hurt", 2), frameDurationMs: 80, loop: false }, recover: { frames: authoredFramePaths("grunt", "recover", 2), frameDurationMs: 90, loop: false }, dead: { frames: authoredFramePaths("grunt", "dead", 3), frameDurationMs: 80, loop: false } } },
  { id: "runner", width: 64, height: 64, scale: 1.25, anchorX: 32, anchorY: 63, animations: { walk: { frames: authoredFramePaths("runner", "walk", 4), frameDurationMs: 72, loop: true }, windup: { frames: authoredFramePaths("runner", "windup", 3), frameDurationMs: 72, loop: true }, attack: { frames: authoredFramePaths("runner", "attack", 4), frameDurationMs: 52, loop: false }, hurt: { frames: authoredFramePaths("runner", "hurt", 2), frameDurationMs: 72, loop: false }, recover: { frames: authoredFramePaths("runner", "recover", 2), frameDurationMs: 82, loop: false }, dead: { frames: authoredFramePaths("runner", "dead", 3), frameDurationMs: 72, loop: false } } },
  { id: "shield", width: 80, height: 80, scale: 1.7, anchorX: 40, anchorY: 79, animations: { walk: { frames: authoredFramePaths("shield", "walk", 4), frameDurationMs: 110, loop: true }, windup: { frames: authoredFramePaths("shield", "windup", 3), frameDurationMs: 100, loop: true }, attack: { frames: authoredFramePaths("shield", "attack", 3), frameDurationMs: 65, loop: false }, hurt: { frames: authoredFramePaths("shield", "hurt", 2), frameDurationMs: 80, loop: false }, recover: { frames: authoredFramePaths("shield", "recover", 2), frameDurationMs: 90, loop: false }, dead: { frames: authoredFramePaths("shield", "dead", 3), frameDurationMs: 80, loop: false } } },
  { id: "tank", width: 96, height: 96, scale: 2.05, anchorX: 48, anchorY: 95, animations: { walk: { frames: authoredFramePaths("tank", "walk", 4), frameDurationMs: 120, loop: true }, windup: { frames: authoredFramePaths("tank", "windup", 4), frameDurationMs: 110, loop: true }, attack: { frames: authoredFramePaths("tank", "attack", 4), frameDurationMs: 70, loop: false }, hurt: { frames: authoredFramePaths("tank", "hurt", 2), frameDurationMs: 90, loop: false }, recover: { frames: authoredFramePaths("tank", "recover", 2), frameDurationMs: 90, loop: false }, dead: { frames: authoredFramePaths("tank", "dead", 3), frameDurationMs: 80, loop: false } } },
  { id: "glitch", width: 80, height: 80, scale: 1.55, anchorX: 40, anchorY: 79, animations: { walk: { frames: authoredFramePaths("glitch", "walk", 6), frameDurationMs: 75, loop: true }, windup: { frames: authoredFramePaths("glitch", "windup", 3), frameDurationMs: 80, loop: true }, attack: { frames: authoredFramePaths("glitch", "attack", 4), frameDurationMs: 55, loop: false }, hurt: { frames: authoredFramePaths("glitch", "hurt", 2), frameDurationMs: 80, loop: false }, recover: { frames: authoredFramePaths("glitch", "recover", 2), frameDurationMs: 90, loop: false }, dead: { frames: authoredFramePaths("glitch", "dead", 3), frameDurationMs: 80, loop: false } } },
  { id: "boss", width: 160, height: 160, scale: 2.6, anchorX: 80, anchorY: 159, animations: { walk: { frames: authoredFramePaths("boss", "walk", 4), frameDurationMs: 130, loop: true }, windup: { frames: authoredFramePaths("boss", "windup", 4), frameDurationMs: 120, loop: true }, attack: { frames: authoredFramePaths("boss", "attack", 4), frameDurationMs: 80, loop: false }, specialAttack: { frames: authoredFramePaths("boss", "specialAttack", 5), frameDurationMs: 75, loop: false }, hurt: { frames: authoredFramePaths("boss", "hurt", 2), frameDurationMs: 100, loop: false }, recover: { frames: authoredFramePaths("boss", "recover", 3), frameDurationMs: 100, loop: false }, dead: { frames: authoredFramePaths("boss", "dead", 4), frameDurationMs: 80, loop: false } } },
];

export const REBUILD_SPRITES = [REBUILD_PLAYER, ...REBUILD_ENEMIES] as const;
