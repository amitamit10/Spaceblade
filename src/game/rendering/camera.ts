import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

export type Camera = {
  /** Trigger a screen shake. `intensity` is peak pixel offset. */
  shake(intensity: number, durationMs: number, now: number): void;
  /** Trigger a brief zoom-in pulse (heavy slash feel). */
  zoomPulse(amount: number, durationMs: number, now: number): void;
  /** Apply the current transform to the context. Call before world drawing. */
  apply(ctx: CanvasRenderingContext2D, now: number, screenShakeEnabled: boolean): void;
  /** Restore the transform. Call after world drawing. */
  restore(ctx: CanvasRenderingContext2D): void;
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Camera feedback: shake and a slight zoom pulse. Deterministic pseudo-noise
 * (no Math.random) keyed on time so shake is stable and testable.
 */
export function createCamera(): Camera {
  let shakeIntensity = 0;
  let shakeStart = 0;
  let shakeDuration = 0;

  let zoomAmount = 0;
  let zoomStart = 0;
  let zoomDuration = 0;

  const noise = (seed: number): number => {
    const s = Math.sin(seed * 12.9898) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };

  return {
    shake: (intensity, durationMs, now) => {
      shakeIntensity = intensity;
      shakeDuration = durationMs;
      shakeStart = now;
    },
    zoomPulse: (amount, durationMs, now) => {
      zoomAmount = amount;
      zoomDuration = durationMs;
      zoomStart = now;
    },
    apply: (ctx, now, screenShakeEnabled) => {
      ctx.save();

      const zt = zoomDuration > 0 ? clamp01((now - zoomStart) / zoomDuration) : 1;
      const zoom = 1 + zoomAmount * (1 - zt);

      let dx = 0;
      let dy = 0;
      if (screenShakeEnabled && shakeDuration > 0) {
        const st = clamp01((now - shakeStart) / shakeDuration);
        const falloff = 1 - st;
        dx = noise(now) * shakeIntensity * falloff;
        dy = noise(now + 100) * shakeIntensity * falloff;
      }

      ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-GAME_WIDTH / 2 + dx, -GAME_HEIGHT / 2 + dy);
    },
    restore: (ctx) => {
      ctx.restore();
    },
  };
}
