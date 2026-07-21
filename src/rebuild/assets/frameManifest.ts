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
    `/sprites/frames/${folder}/${action}-${String(index).padStart(2, "0")}.png?v=unique-enemies-1`,
  );

export const REBUILD_PLAYER: RebuildSprite = {
  id: "player",
  width: 96,
  height: 96,
  scale: 3,
  anchorX: 48,
  anchorY: 95,
  animations: {
    idle: { frames: authoredFramePaths("player", "idle", 4), frameDurationMs: 110, loop: true },
    run: { frames: authoredFramePaths("player", "run", 8), frameDurationMs: 78, loop: true },
    walk: { frames: authoredFramePaths("player", "walk", 6), frameDurationMs: 90, loop: true },
    slash: { frames: authoredFramePaths("player", "slash", 4), frameDurationMs: 70, loop: false },
    charging: { frames: authoredFramePaths("player", "charge", 3), frameDurationMs: 90, loop: true },
    heavy: { frames: authoredFramePaths("player", "heavy", 6), frameDurationMs: 70, loop: false },
    dodge: { frames: authoredFramePaths("player", "dodge", 3), frameDurationMs: 70, loop: false },
    parry: { frames: authoredFramePaths("player", "parry", 2), frameDurationMs: 90, loop: false },
    hurt: { frames: authoredFramePaths("player", "hurt", 2), frameDurationMs: 90, loop: false },
    dead: { frames: authoredFramePaths("player", "dead", 2), frameDurationMs: 120, loop: false },
  },
};

export const REBUILD_ENEMIES: readonly RebuildSprite[] = [
  { id: "grunt", width: 64, height: 64, scale: 3, anchorX: 32, anchorY: 63, animations: { walk: { frames: authoredFramePaths("grunt", "walk", 4), frameDurationMs: 110, loop: true }, windup: { frames: authoredFramePaths("grunt", "windup", 2), frameDurationMs: 100, loop: true }, attack: { frames: authoredFramePaths("grunt", "attack", 3), frameDurationMs: 60, loop: false }, hurt: { frames: authoredFramePaths("grunt", "hurt", 2), frameDurationMs: 80, loop: false }, recover: { frames: authoredFramePaths("grunt", "recover", 2), frameDurationMs: 90, loop: false }, dead: { frames: authoredFramePaths("grunt", "dead", 3), frameDurationMs: 80, loop: false } } },
  { id: "runner", width: 64, height: 64, scale: 3, anchorX: 32, anchorY: 63, animations: { walk: { frames: authoredFramePaths("runner", "walk", 4), frameDurationMs: 72, loop: true }, windup: { frames: authoredFramePaths("runner", "windup", 3), frameDurationMs: 72, loop: true }, attack: { frames: authoredFramePaths("runner", "attack", 4), frameDurationMs: 52, loop: false }, hurt: { frames: authoredFramePaths("runner", "hurt", 2), frameDurationMs: 72, loop: false }, recover: { frames: authoredFramePaths("runner", "recover", 2), frameDurationMs: 82, loop: false }, dead: { frames: authoredFramePaths("runner", "dead", 3), frameDurationMs: 72, loop: false } } },
  { id: "shield", width: 80, height: 80, scale: 3, anchorX: 40, anchorY: 79, animations: { walk: { frames: authoredFramePaths("shield", "walk", 4), frameDurationMs: 110, loop: true }, windup: { frames: authoredFramePaths("shield", "windup", 3), frameDurationMs: 100, loop: true }, attack: { frames: authoredFramePaths("shield", "attack", 3), frameDurationMs: 65, loop: false }, hurt: { frames: authoredFramePaths("shield", "hurt", 2), frameDurationMs: 80, loop: false }, recover: { frames: authoredFramePaths("shield", "recover", 2), frameDurationMs: 90, loop: false }, dead: { frames: authoredFramePaths("shield", "dead", 3), frameDurationMs: 80, loop: false } } },
  { id: "tank", width: 96, height: 96, scale: 3, anchorX: 48, anchorY: 95, animations: { walk: { frames: authoredFramePaths("tank", "walk", 4), frameDurationMs: 120, loop: true }, windup: { frames: authoredFramePaths("tank", "windup", 4), frameDurationMs: 110, loop: true }, attack: { frames: authoredFramePaths("tank", "attack", 4), frameDurationMs: 70, loop: false }, hurt: { frames: authoredFramePaths("tank", "hurt", 2), frameDurationMs: 90, loop: false }, recover: { frames: authoredFramePaths("tank", "recover", 2), frameDurationMs: 90, loop: false }, dead: { frames: authoredFramePaths("tank", "dead", 3), frameDurationMs: 80, loop: false } } },
  { id: "glitch", width: 80, height: 80, scale: 3, anchorX: 40, anchorY: 79, animations: { walk: { frames: authoredFramePaths("glitch", "walk", 6), frameDurationMs: 75, loop: true }, windup: { frames: authoredFramePaths("glitch", "windup", 3), frameDurationMs: 80, loop: true }, attack: { frames: authoredFramePaths("glitch", "attack", 4), frameDurationMs: 55, loop: false }, hurt: { frames: authoredFramePaths("glitch", "hurt", 2), frameDurationMs: 80, loop: false }, recover: { frames: authoredFramePaths("glitch", "recover", 2), frameDurationMs: 90, loop: false }, dead: { frames: authoredFramePaths("glitch", "dead", 3), frameDurationMs: 80, loop: false } } },
  { id: "boss", width: 160, height: 160, scale: 2, anchorX: 80, anchorY: 159, animations: { walk: { frames: authoredFramePaths("boss", "walk", 4), frameDurationMs: 130, loop: true }, windup: { frames: authoredFramePaths("boss", "windup", 4), frameDurationMs: 120, loop: true }, attack: { frames: authoredFramePaths("boss", "attack", 4), frameDurationMs: 80, loop: false }, specialAttack: { frames: authoredFramePaths("boss", "specialAttack", 5), frameDurationMs: 75, loop: false }, hurt: { frames: authoredFramePaths("boss", "hurt", 2), frameDurationMs: 100, loop: false }, recover: { frames: authoredFramePaths("boss", "recover", 3), frameDurationMs: 100, loop: false }, dead: { frames: authoredFramePaths("boss", "dead", 4), frameDurationMs: 80, loop: false } } },
];

export const REBUILD_SPRITES = [REBUILD_PLAYER, ...REBUILD_ENEMIES] as const;
