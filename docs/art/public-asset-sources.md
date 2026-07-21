# Public Asset Sources

Spaceblade uses vendored public-asset packs under
`public/assets/public/` for the player, environment, effects, audio, and enemy
frames. Enemy classes are built from the Kenney Robot Pack instead of the old
authored Spaceblade sheets.

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

## Kenney Robot Pack

- Source: https://opengameart.org/content/robot-pack
- Author: Kenney
- License: CC0, included locally at
  `public/assets/public/kenney-robot-pack/License.txt`
- Staged content: four side-view robot color variants with body, drive, jump,
  damage, and hurt poses.
- Runtime conversion: `scripts/build-public-runtime-frames.sh`
- Runtime mapping: grunt blue, runner red, shield green, tank yellow, glitch
  blue special pose, and boss red special pose. The larger classes use larger
  normalized canvases and scales, so their hit geometry remains readable.

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

The public packs supply the player, environment, effects, and active enemy
frames. The game still draws
sword/parry and shield feedback as gameplay effects because those states are
not present in the source pack; no still frame is falsely labeled as a sword
animation. Active frame URLs use a revision query (`v=public-robot-pack-1`) so
installed clients cannot reuse the retired authored enemy cache.

## Pixel Style Contract

The active scene keeps the pack visually unified by using nearest-neighbor
rendering, integer world positions, integer sprite scales, and one shared
amber/cyan/magenta palette for the building shell, combat feedback, and HUD.
Tutorial previews use integer scales as well, so their enlarged pixels do not
become uneven while comparing enemy classes.
