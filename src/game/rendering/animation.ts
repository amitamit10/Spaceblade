/** Which frame of a looping animation to show at time `now`. */
export function frameForTime(now: number, frameMs: number, frameCount: number): number {
  if (frameCount <= 1 || frameMs <= 0) return 0;
  const idx = Math.floor(now / frameMs) % frameCount;
  return idx < 0 ? idx + frameCount : idx;
}

/** Which frame of a one-shot animation to show for progress in [0, 1]. */
export function frameForProgress(progress: number, frameCount: number): number {
  if (frameCount <= 1) return 0;
  const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return Math.min(frameCount - 1, Math.floor(clamped * frameCount));
}
