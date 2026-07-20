import type { FrameAnimation } from "./assets/frameManifest";

export function frameIndexAt(animation: FrameAnimation, elapsedMs: number): number {
  if (animation.frames.length === 0) return 0;
  const raw = Math.floor(Math.max(0, elapsedMs) / animation.frameDurationMs);
  return animation.loop ? raw % animation.frames.length : Math.min(raw, animation.frames.length - 1);
}
