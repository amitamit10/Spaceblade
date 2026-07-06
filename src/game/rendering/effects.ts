export type EffectKind =
  | "slashArc"
  | "shockwave"
  | "parryFlash"
  | "dashTrail"
  | "hitSpark"
  | "enemyTelegraph"
  | "ambientParticle"
  | "screenFlash";

/** Effects removed in reduced-effects mode: pure ambience, never combat-critical. */
const REDUCED_HIDDEN: ReadonlySet<EffectKind> = new Set<EffectKind>([
  "ambientParticle",
  "screenFlash",
]);

/**
 * Whether an effect should be drawn given the reduced-effects setting.
 * Combat-critical effects always render; only nonessential ambience is dropped.
 */
export function shouldRenderEffect(kind: EffectKind, reducedEffectsEnabled: boolean): boolean {
  if (!reducedEffectsEnabled) return true;
  return !REDUCED_HIDDEN.has(kind);
}

type Effect = {
  kind: EffectKind;
  x: number;
  y: number;
  bornAt: number;
  ttl: number;
  color: string;
  dir: number;
};

const COLORS = {
  player: "#57eaff",
  effect: "#39f6b0",
  feedback: "#ffe45c",
  enemy: "#ff3f62",
} as const;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export type EffectSystem = {
  spawn(kind: EffectKind, x: number, y: number, now: number, dir?: number): void;
  update(now: number): void;
  draw(ctx: CanvasRenderingContext2D, now: number, reducedEffectsEnabled: boolean): void;
  clear(): void;
  count(): number;
};

const TTL: Record<EffectKind, number> = {
  slashArc: 160,
  shockwave: 360,
  parryFlash: 240,
  dashTrail: 260,
  hitSpark: 220,
  enemyTelegraph: 180,
  ambientParticle: 1600,
  screenFlash: 140,
};

/** A tiny transient-effect pool driven by an explicit clock. */
export function createEffectSystem(): EffectSystem {
  let effects: Effect[] = [];

  const colorFor = (kind: EffectKind): string => {
    switch (kind) {
      case "shockwave":
      case "parryFlash":
        return COLORS.effect;
      case "hitSpark":
      case "screenFlash":
        return COLORS.feedback;
      case "enemyTelegraph":
        return COLORS.enemy;
      default:
        return COLORS.player;
    }
  };

  return {
    spawn: (kind, x, y, now, dir = 1) => {
      effects.push({ kind, x, y, bornAt: now, ttl: TTL[kind], color: colorFor(kind), dir });
    },
    update: (now) => {
      effects = effects.filter((e) => now - e.bornAt < e.ttl);
    },
    draw: (ctx, now, reduced) => {
      for (const e of effects) {
        if (!shouldRenderEffect(e.kind, reduced)) continue;
        const t = clamp01((now - e.bornAt) / e.ttl);
        drawEffect(ctx, e, t);
      }
    },
    clear: () => {
      effects = [];
    },
    count: () => effects.length,
  };
}

function drawEffect(ctx: CanvasRenderingContext2D, e: Effect, t: number): void {
  ctx.save();
  ctx.strokeStyle = e.color;
  ctx.fillStyle = e.color;
  switch (e.kind) {
    case "slashArc": {
      ctx.globalAlpha = 0.8 * (1 - t);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 20, 70, -0.5 + e.dir, 1.0 + e.dir);
      ctx.stroke();
      break;
    }
    case "shockwave": {
      ctx.globalAlpha = 0.6 * (1 - t);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 20, 20 + t * 160, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "parryFlash": {
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - 20);
        ctx.lineTo(e.x + Math.cos(a) * (14 + t * 30), e.y - 20 + Math.sin(a) * (14 + t * 30));
        ctx.stroke();
      }
      break;
    }
    case "dashTrail": {
      ctx.globalAlpha = 0.3 * (1 - t);
      for (let i = 1; i <= 3; i += 1) {
        ctx.fillRect(e.x - e.dir * i * 16, e.y - 40, 6, 44);
      }
      break;
    }
    case "hitSpark": {
      ctx.globalAlpha = 1 - t;
      const r = 6 + t * 14;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "ambientParticle": {
      ctx.globalAlpha = 0.25 * (1 - t);
      ctx.beginPath();
      ctx.arc(e.x, e.y - t * 40, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "screenFlash": {
      ctx.globalAlpha = 0.35 * (1 - t);
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      break;
    }
    case "enemyTelegraph":
      // Enemy telegraphs are drawn by enemyTelegraphs.ts against live actors.
      break;
    default:
      break;
  }
  ctx.restore();
}
