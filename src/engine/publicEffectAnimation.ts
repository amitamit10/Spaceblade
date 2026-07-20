export const PUBLIC_SHOT_SOURCES = [
  "/assets/public/warped-city/effects/shot-1.png",
  "/assets/public/warped-city/effects/shot-2.png",
  "/assets/public/warped-city/effects/shot-3.png",
] as const;

export const PUBLIC_EXPLOSION_SOURCES = [
  "/assets/public/warped-city/effects/enemy-explosion-1.png",
  "/assets/public/warped-city/effects/enemy-explosion-2.png",
  "/assets/public/warped-city/effects/enemy-explosion-3.png",
  "/assets/public/warped-city/effects/enemy-explosion-4.png",
  "/assets/public/warped-city/effects/enemy-explosion-5.png",
  "/assets/public/warped-city/effects/enemy-explosion-6.png",
] as const;

export function publicShotSourceAt(elapsedMs: number, frameDurationMs = 70): string {
  const safeDuration = Math.max(1, frameDurationMs);
  const frameIndex = Math.floor(Math.max(0, elapsedMs) / safeDuration) % PUBLIC_SHOT_SOURCES.length;
  return PUBLIC_SHOT_SOURCES[frameIndex];
}

export function publicExplosionSourceAt(elapsedMs: number, frameDurationMs = 60): string {
  const safeDuration = Math.max(1, frameDurationMs);
  const frameIndex = Math.min(
    PUBLIC_EXPLOSION_SOURCES.length - 1,
    Math.floor(Math.max(0, elapsedMs) / safeDuration),
  );
  return PUBLIC_EXPLOSION_SOURCES[frameIndex];
}
