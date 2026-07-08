import type { SpriteAnimationDef } from "./spriteManifest";

export function frameIndexForLoop(now: number, anim: SpriteAnimationDef): number {
  if (anim.frames <= 1 || anim.frameDurationMs <= 0) return 0;
  const idx = Math.floor(now / anim.frameDurationMs) % anim.frames;
  return idx < 0 ? idx + anim.frames : idx;
}

export function frameIndexForOneShot(progress: number, anim: SpriteAnimationDef): number {
  if (anim.frames <= 1) return 0;
  const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return Math.min(anim.frames - 1, Math.floor(clamped * anim.frames));
}

export function progressFromTimes(now: number, startedAt: number, totalDurationMs: number): number {
  if (totalDurationMs <= 0) return 1;
  if (now <= startedAt) return 0;
  const raw = (now - startedAt) / totalDurationMs;
  return raw < 0 ? 0 : raw > 1 ? 1 : raw;
}
