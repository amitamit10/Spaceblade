---
name: spaceblade-public-asset-integration
description: Use when replacing Spaceblade custom sprites with licensed public assets, studying an included demo, or adapting external pixel-art animations to the one-button runner.
---

# Spaceblade Public Asset Integration

Use a vendored, licensed asset pack as the source of truth. Keep the current
runtime pack as a fallback until the replacement passes visual and contract
checks.

## Demo Lessons

- Preserve integer pixel rendering: low-resolution world, nearest-neighbor
  scaling, rounded positions, and no smoothing.
- Treat animation names and frame order as data. The Warped City demo uses
  explicit `idle`, `run`, `run-shoot`, `jump`, `hurt`, `shoot`, `drone`,
  `turret`, `shot`, `shot-hit`, and `enemy-explosion` sequences.
- Keep visual and collision geometry separate. The demo centers sprites but
  uses smaller explicit body hitboxes.
- Keep shooting rate-limited. The source demo uses a `600 ms` shot cooldown;
  adapt it to Spaceblade's one-button tap/hold rules instead of firing every
  render frame.
- Use one-shot impact/death animations that destroy themselves on completion.

## Integration Rules

1. Verify the source license and keep its license file beside the vendored PNGs.
2. Stage assets under `public/assets/public/<pack>/`; do not overwrite runtime
   sprites during review.
3. Normalize each frame to the actor's declared canvas size with transparent
   padding and a documented anchor. Never resize with smoothing.
4. Map only animations that actually exist. Missing sword, parry, shield, or
   boss states must use the existing fallback, not duplicated still frames.
5. Add a source-to-runtime mapping document before promotion.
6. Run `npm run test:sprites` and `npm run build`; use the short browser motion
   check after a runtime swap. Do not run the long late-wave probe by default.

## Current Source

The staged Warped City files live in `public/assets/public/warped-city/` and
the source notes are in `docs/art/public-asset-sources.md`.
