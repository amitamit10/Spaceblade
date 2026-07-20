---
name: spaceblade-one-button-balance
description: Balance Spaceblade one-button sword, gun, dodge, parry, enemy, and wave interactions without adding extra controls. Use when energy shots feel dominant, enemies need counterplay, or combat rules change.
---

# Spaceblade One-Button Balance

Preserve the one-button contract:

- tap: sword slash or context-sensitive parry
- hold and release: gun/energy shot
- close double tap: dodge

Prefer readable enemy counterplay over a global cooldown that makes the button feel unresponsive. Every strong action must have an intentional response window and visible feedback.

## Balance Workflow

1. Read `src/rebuild/rebuildGame.ts` and its tests before changing constants or enemy rules.
2. Add a focused model test first for the proposed counterplay.
3. Keep counterplay achievable with the existing tap/hold/double-tap input.
4. Add explicit HUD feedback for blocked, hit, parried, or missed actions.
5. Update the project report and acceptance plan when a durable combat rule changes.
6. Run the focused combat tests, build, and one short browser input test.

## Current Counterplay Rules

- Shielded enemies block gun/energy projectiles and remain at the same HP.
- A normal sword tap removes the raised shield without dealing body damage.
- Once the shield is down, gun and sword attacks can damage the enemy normally.
- A blocked projectile increments `projectilesBlocked` and shows `ENERGY BLOCKED · USE SWORD` in the Phaser HUD.
- Energy shots have a deterministic 900ms cooldown; an early release is consumed
  without firing and shows `ENERGY RECHARGING · USE SWORD`.
- Wave 15 is a single boss encounter; preserve that low-noise acceptance path.

Do not add a second key, server state, or per-frame network call to solve balance. Keep the model deterministic and cheap for 23–30 FPS targets.

## Verification

```bash
npx vitest --run src/rebuild/rebuildGame.test.ts src/engine/spacebladeAnimation.test.ts
npx playwright test tests/browser/spaceblade-motion.spec.cjs --grep "pointer hold as the same one-button" --reporter=line
npm run build
```

Do not run `verify:production:late-wave` by default; it is intentionally slow and should be reserved for an explicit acceptance pass.
