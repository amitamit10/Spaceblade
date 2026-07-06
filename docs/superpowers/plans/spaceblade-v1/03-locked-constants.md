# Locked Constants

Create `src/game/constants.ts` during Task 1:

```ts
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TARGET_FPS = 30;
export const STEP_MS = 1000 / TARGET_FPS;
export const PLAYER_X = 640;
export const GROUND_Y = 520;
export const LEFT_SPAWN_X = 70;
export const RIGHT_SPAWN_X = 1210;
export const LEFT_COMBAT_LIMIT = 180;
export const RIGHT_COMBAT_LIMIT = 1100;
export const MAX_ACTIVE_THREAT_WEIGHT = 6;
export const MAX_ACTIVE_TANKS = 2;
export const LEVEL_ID = "Neon-Sector 04";
export const TITLE_TAGLINE = "ONE KEY. ENDLESS FIGHT.";
```

Create `src/game/input/inputConfig.ts` during Task 3:

```ts
export const inputConfig = {
  tapMaxMs: 180,
  chargeStartMs: 220,
  heavyMinMs: 300,
  doubleTapWindowMs: 300,
  parryBeforeImpactMs: 120,
  parryAfterImpactMs: 60,
  dodgeIFrameMs: 350,
  menuHoldConfirmMs: 450,
} as const;
```

Create `src/game/player/playerConfig.ts` during Task 4:

```ts
export const playerConfig = {
  maxHearts: 3,
  quickSlashRange: 118,
  quickSlashActiveMs: 120,
  quickSlashRecoveryMs: 160,
  heavySlashRange: 285,
  heavySlashActiveMs: 180,
  heavySlashRecoveryMs: 280,
  dodgeDistance: 150,
  dodgeDurationMs: 260,
  hurtLockMs: 420,
  parryStunMs: 650,
} as const;
```

Create `src/game/enemies/enemyStats.ts` during Task 5:

```ts
export const enemyStats = {
  grunt: { maxHp: 1, speed: 72, attackRange: 44, windupMs: 380, recoveryMs: 360, score: 100, threatWeight: 1 },
  runner: { maxHp: 1, speed: 126, attackRange: 40, windupMs: 240, recoveryMs: 300, score: 125, threatWeight: 1 },
  shield: { maxHp: 1, speed: 54, attackRange: 46, windupMs: 460, recoveryMs: 420, score: 175, threatWeight: 1 },
  tank: { maxHp: 2, speed: 38, attackRange: 62, windupMs: 680, recoveryMs: 620, score: 275, threatWeight: 2 },
  glitch: { maxHp: 1, speed: 92, attackRange: 42, windupMs: 300, recoveryMs: 340, score: 300, threatWeight: 1 },
  boss: { maxHp: 12, speed: 34, attackRange: 82, windupMs: 720, recoveryMs: 580, score: 1500, threatWeight: 2 },
} as const;
```

Create `src/game/run/scoreSystem.ts` during Task 7:

```ts
export const scoreGradeThresholds = [
  { grade: "B", minScore: 500 },
  { grade: "C", minScore: 1000 },
  { grade: "A", minScore: 1500 },
  { grade: "S", minScore: 3000 },
  { grade: "SS", minScore: 5000 },
  { grade: "SSS", minScore: 7000 },
] as const;

export const parryStreakBonuses = [
  { streak: 10, bonus: 500 },
  { streak: 25, bonus: 1500 },
  { streak: 50, bonus: 3000 },
] as const;

export const cleanWaveBonusMultiplier = 1.5;
```

Create these CSS tokens during Task 2:

```css
:root {
  --color-bg-deep: #050812;
  --color-panel: #071322;
  --color-panel-border: #1bbde3;
  --color-player: #57eaff;
  --color-enemy: #ff3f62;
  --color-feedback: #ffe45c;
  --color-effect: #39f6b0;
  --color-ui-purple: #9b5cff;
  --color-text: #f4fbff;
  --color-muted: #8da7b5;
}
```
