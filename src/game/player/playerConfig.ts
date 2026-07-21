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
  // Keep the hit reaction readable without taking the one-button combat loop
  // away from the player for an entire enemy cycle.
  hurtLockMs: 220,
  parryStunMs: 650,
} as const;
