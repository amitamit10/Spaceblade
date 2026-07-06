export const enemyStats = {
  grunt: { maxHp: 1, speed: 72, attackRange: 44, windupMs: 380, recoveryMs: 360, score: 100, threatWeight: 1 },
  runner: { maxHp: 1, speed: 126, attackRange: 40, windupMs: 240, recoveryMs: 300, score: 125, threatWeight: 1 },
  shield: { maxHp: 1, speed: 54, attackRange: 46, windupMs: 460, recoveryMs: 420, score: 175, threatWeight: 1 },
  tank: { maxHp: 2, speed: 38, attackRange: 62, windupMs: 680, recoveryMs: 620, score: 275, threatWeight: 2 },
  glitch: { maxHp: 1, speed: 92, attackRange: 42, windupMs: 300, recoveryMs: 340, score: 300, threatWeight: 1 },
  boss: { maxHp: 12, speed: 34, attackRange: 82, windupMs: 720, recoveryMs: 580, score: 1500, threatWeight: 2 },
} as const;
