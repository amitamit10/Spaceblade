import type { PixelSprite } from "../rendering/pixelSprite";
import { drawSprite } from "../rendering/pixelSprite";
import { frameForTime, frameForProgress } from "../rendering/animation";
import { frameIndexForLoop, frameIndexForOneShot, progressFromTimes } from "../rendering/spriteAnimator";
import { drawSheetFrame } from "../rendering/spriteSheetRenderer";
import { getSpriteSheet } from "../rendering/spriteSheetLoader";
import type { PlayerSnapshot } from "./playerStateMachine";
import { playerConfig } from "./playerConfig";
import { PLAYER_X, GROUND_Y } from "../constants";
import { PLAYER_SHEET } from "../assets/sprites/player";

const PLAYER_SCALE = 4;

// Shared palette for every player frame ('.' is transparent).
const P: Record<string, string> = {
  d: "#0b1b2e", // dark suit
  c: "#57eaff", // cyan trim
  s: "#ffd9b3", // skin
  b: "#d6f7ff", // blade
  h: "#eaffff", // hair highlight
  g: "#ffe45c", // charge glow
  r: "#ff3f62", // hurt red
};

const make = (id: string, rows: string[]): PixelSprite => ({ id, w: 12, h: 16, palette: P, rows });

const idle0 = make("player-idle-0", [
  "....hh......",
  "...hsssh....",
  "...hsssh....",
  "....cc......",
  "...cdddc....",
  "..cddddc..bb",
  "..cddddc.bb.",
  "..dddddd.bb.",
  "...dddd.bb..",
  "...d..d.....",
  "...d..d.....",
  "..dd..dd....",
  "..d....d....",
  "..d....d....",
  ".dd....dd...",
  "............",
]);

const idle1 = make("player-idle-1", [
  "............",
  "....hh......",
  "...hsssh....",
  "...hsssh....",
  "....cc......",
  "...cdddc..bb",
  "..cddddc.bb.",
  "..cddddc.bb.",
  "..ddddddbb..",
  "...dddd.....",
  "...d..d.....",
  "..dd..dd....",
  "..d....d....",
  "..d....d....",
  ".dd....dd...",
  "............",
]);

const slash0 = make("player-slash-0", [
  "....hh......",
  "...hsssh.b..",
  "...hsssh.b..",
  "....cc...b..",
  "...cdddcb...",
  "..cddddc....",
  "..cddddc....",
  "..dddddd....",
  "...dddd.....",
  "...d..d.....",
  "...d..d.....",
  "..dd..dd....",
  "..d....d....",
  "..d....d....",
  ".dd....dd...",
  "............",
]);

const slash1 = make("player-slash-1", [
  "....hh......",
  "...hsssh....",
  "...hsssh....",
  "....cc......",
  "...cdddc....",
  "..cddddcbbbb",
  "..cddddc.bb.",
  "..dddddd....",
  "...dddd.....",
  "...d..d.....",
  "...d..d.....",
  "..dd..dd....",
  "..d....d....",
  "..d....d....",
  ".dd....dd...",
  "............",
]);

const charge = make("player-charge", [
  "....hh..b...",
  "...hsssh.b..",
  "...hsssh.b..",
  "....cc...b..",
  "g..cdddc...g",
  "..cddddc....",
  "g.cddddc...g",
  "..dddddd....",
  "g..dddd....g",
  "...d..d.....",
  "...d..d.....",
  "..dd..dd....",
  "..d....d....",
  "..d....d....",
  ".dd....dd...",
  "............",
]);

const heavy0 = make("player-heavy-0", [
  "....hh.bb...",
  "...hssshbb..",
  "...hssshb...",
  "....ccb.....",
  "...cdddc....",
  "..cddddc....",
  "..cddddc....",
  "..dddddd....",
  "...dddd.....",
  "...d..d.....",
  "...d..d.....",
  "..dd..dd....",
  "..d....d....",
  "..d....d....",
  ".dd....dd...",
  "............",
]);

const heavy1 = make("player-heavy-1", [
  "....hh......",
  "...hsssh....",
  "...hsssh....",
  "....cc..bbbb",
  "...cdddcbbbb",
  "..cddddcbbb.",
  "..cddddcbb..",
  "..dddddd....",
  "...dddd.....",
  "...d..d.....",
  "...d..d.....",
  "..dd..dd....",
  "..d....d....",
  "..d....d....",
  ".dd....dd...",
  "............",
]);

const dodge = make("player-dodge", [
  "............",
  "............",
  "....hh......",
  "...hsssh....",
  "...hsssh....",
  "....cc......",
  "..ccdddc....",
  ".ccddddc....",
  ".ccddddc....",
  "..dddddd....",
  "..dddd.d....",
  ".dd...dd....",
  ".d....d.....",
  "dd...dd.....",
  "............",
  "............",
]);

const parry = make("player-parry", [
  "....hh..b...",
  "...hsssh.b..",
  "...hsssh.b..",
  "....cc...b..",
  "...cdddc.b..",
  "..cddddc.b..",
  "..cddddc.b..",
  "..dddddd.b..",
  "...dddd.....",
  "...d..d.....",
  "...d..d.....",
  "..dd..dd....",
  "..d....d....",
  "..d....d....",
  ".dd....dd...",
  "............",
]);

const hurt = make("player-hurt", [
  "....hh......",
  "..hsssh.....",
  "..hsssh.....",
  "...rr.......",
  "..rrrrr.....",
  ".rrrrrr.....",
  ".rrrrrr.....",
  ".rrrrrr.....",
  "..rrrr......",
  "..r..r......",
  "..r..r......",
  ".rr..rr.....",
  ".r....r.....",
  ".r....r.....",
  "rr....rr....",
  "............",
]);

const dead = make("player-dead", [
  "............",
  "............",
  "............",
  "............",
  "............",
  "............",
  "............",
  "............",
  "............",
  "...hh.......",
  "..dsssd.....",
  ".dddddddd...",
  "ddddddddddd.",
  "bb..........",
  "............",
  "............",
]);

export const PLAYER_SPRITES: PixelSprite[] = [
  idle0,
  idle1,
  slash0,
  slash1,
  charge,
  heavy0,
  heavy1,
  dodge,
  parry,
  hurt,
  dead,
];

const IDLE = [idle0, idle1];

function byId(id: string): PixelSprite {
  return PLAYER_SPRITES.find((s) => s.id === id) ?? PLAYER_SPRITES[0];
}

function pickProgress(prefix: string, progress: number): PixelSprite {
  const frames = PLAYER_SPRITES.filter((s) => s.id.startsWith(`player-${prefix}`));
  if (frames.length === 0) return PLAYER_SPRITES[0];
  return frames[frameForProgress(progress, frames.length)];
}

/** Draws the player as a pixel-art sprite for its current action state. */
export function drawPlayerPixel(
  ctx: CanvasRenderingContext2D,
  snapshot: PlayerSnapshot,
  now: number,
): void {
  const sheet = getSpriteSheet(PLAYER_SHEET);
  if (sheet) {
    const animKey =
      snapshot.state === "slashing"
        ? "slash"
        : snapshot.state === "charging"
          ? "charge"
          : snapshot.state === "heavySlashing"
            ? "heavy"
            : snapshot.state === "dodging"
              ? "dodge"
              : snapshot.state === "parrying"
                ? "parry"
                : snapshot.state === "hurt"
                  ? "hurt"
                  : snapshot.state === "dead"
                    ? "dead"
                    : "idle";
    const anim = PLAYER_SHEET.animations[animKey];
    const frameIndex = anim.loop
      ? frameIndexForLoop(now, anim)
      : frameIndexForOneShot(
          progressFromTimes(now, snapshot.actionStartedAt, anim.frames * anim.frameDurationMs),
          anim,
        );
    drawSheetFrame(ctx, sheet, PLAYER_SHEET, anim, frameIndex, PLAYER_X, GROUND_Y + 30, snapshot.facing);
    return;
  }

  const flip = snapshot.facing === "left";
  const elapsed = now - snapshot.actionStartedAt;
  let sprite: PixelSprite;

  switch (snapshot.state) {
    case "slashing":
      sprite = pickProgress("slash", elapsed / playerConfig.quickSlashActiveMs);
      break;
    case "heavySlashing":
      sprite = pickProgress("heavy", elapsed / playerConfig.heavySlashActiveMs);
      break;
    case "charging":
      sprite = byId("player-charge");
      break;
    case "dodging":
      sprite = byId("player-dodge");
      break;
    case "parrying":
      sprite = byId("player-parry");
      break;
    case "hurt":
      sprite = byId("player-hurt");
      break;
    case "dead":
      sprite = byId("player-dead");
      break;
    default:
      sprite = IDLE[frameForTime(now, 380, IDLE.length)];
      break;
  }

  drawSprite(ctx, sprite, PLAYER_SCALE, PLAYER_X, GROUND_Y + 30, flip);
}
