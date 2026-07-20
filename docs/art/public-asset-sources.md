# Public Asset Sources

Spaceblade now uses a vendored public-asset pack under
`public/assets/public/warped-city/` for its active standalone runtime frames.
The legacy sheets remain available for tooling and rollback.

## Warped City

- Source: https://opengameart.org/content/warped-city
- Author: Luis Zuno / Ansimuz
- License: the included `LICENSE.txt` states that the artwork is public domain
  and free for personal and commercial use.
- Staged content: player idle/walk/run/run-shoot/shoot/hurt frames, drone and
  turret enemies, projectile frames, hit frames, enemy explosion frames, and
  a derived tiled ground strip from the same licensed skyline source.
- Local preview: `mockups/public-assets/warped-city-preview.png`
- Runtime asset plate: `mockups/public-assets/public-runtime-asset-preview.png`
- Deployed asset plate: `/public-asset-previews/public-runtime-asset-preview.png`
- Runtime conversion: `scripts/build-public-runtime-frames.sh`
- Runtime asset preview: `scripts/build-public-asset-preview.sh`
- Runtime preview: `mockups/public-assets/runtime-public-frames.png`

This is intentionally vendored into the repository instead of loaded from a
remote URL. That keeps deployment deterministic, avoids runtime network
requests, and stays cheap on static hosting.

## Kenney Digital Audio

- Source: https://kenney.nl/assets/digital-audio
- License: CC0 1.0, as provided by the pack
- Local files: `public/audio/kenney/`
- Runtime mapping: `src/game/audio/soundBus.ts`
- Included cues: slash, energy shot, parry, hit, enemy alert, boss,
  parkour jump, wall climb, and landing.

The selected OGG files are copied into the repository so production does not
depend on an external audio host. The sound bus treats audio as optional and
swallows autoplay failures without affecting gameplay.

## Replacement Rules

1. Review the staged preview before changing runtime sprites.
2. Normalize frame dimensions and anchors with a small conversion script.
   The converter emits 8-bit RGBA PNGs and removes obsolete generated action
   names before writing the active frame set.
3. Map only animations that exist in the public pack; keep the current
   procedural fallback for missing sword, parry, shield, and boss animations.
4. Run the sprite contract tests and browser motion check before promotion.

The public pack now supplies the active standalone runtime frames. The game
still draws sword/parry and shield feedback as gameplay effects because those
states are not present in the source pack; no still frame is falsely labeled as
a sword animation. Active frame URLs use a revision query (`v=public-pack-3`)
so installed clients cannot reuse the retired custom frame cache.
