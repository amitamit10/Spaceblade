# Public Asset Sources

Spaceblade now has a staged public-asset pack under
`public/assets/public/warped-city/`. It is not connected to runtime yet; the
existing sprite pack remains the fallback while the replacement is reviewed.

## Warped City

- Source: https://opengameart.org/content/warped-city
- Author: Luis Zuno / Ansimuz
- License: the included `LICENSE.txt` states that the artwork is public domain
  and free for personal and commercial use.
- Staged content: player idle/walk/run/run-shoot/shoot/hurt frames, drone and
  turret enemies, projectile frames, hit frames, and enemy explosion frames.
- Local preview: `mockups/public-assets/warped-city-preview.png`
- Runtime conversion: `scripts/build-public-runtime-frames.sh`
- Runtime preview: `mockups/public-assets/runtime-public-frames.png`

This is intentionally vendored into the repository instead of loaded from a
remote URL. That keeps deployment deterministic, avoids runtime network
requests, and stays cheap on static hosting.

## Replacement Rules

1. Review the staged preview before changing runtime sprites.
2. Normalize frame dimensions and anchors with a small conversion script.
3. Map only animations that exist in the public pack; keep the current
   procedural fallback for missing sword, parry, shield, and boss animations.
4. Run the sprite contract tests and browser motion check before promotion.

The public pack now supplies the active standalone runtime frames. The game
still draws sword/parry and shield feedback as gameplay effects because those
states are not present in the source pack; no still frame is falsely labeled as
a sword animation.
