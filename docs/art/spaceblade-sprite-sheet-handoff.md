# Spaceblade Sprite Sheet Handoff

This pack is the exact art contract for the runtime sprite-sheet system already
wired into the game.

## Final Output Location

Put the finished exported PNG sheets here:

- `public/sprites/player.png`
- `public/sprites/grunt.png`
- `public/sprites/runner.png`
- `public/sprites/shield.png`
- `public/sprites/tank.png`
- `public/sprites/glitch.png`
- `public/sprites/boss.png`

The game already looks for those paths. If a file is missing, runtime falls back
to the built-in procedural art.

## Global Rules

- Transparent background PNG only.
- Every sheet must use a fixed grid.
- Frames go left to right.
- Rows go top to bottom.
- Art should naturally face `right`.
- Keep the character's feet/base aligned consistently across all rows.
- Do not crop tightly per frame; respect the full sheet cell size.
- Nearest-neighbor pixel art only. No blur, anti-alias smoothing, glow haze, or soft shadows.

## Sheet Specs

### Player

- File: `public/sprites/player.png`
- Template: `docs/art/templates/player-sheet-guide.svg`
- Canvas: `576 x 864`
- Frame size: `96 x 96`
- Columns: `6`
- Rows: `9`
- Row order:
  - `0 idle` - 4 frames
  - `1 walk` - 6 frames
  - `2 slash` - 5 frames
  - `3 charge` - 4 frames
  - `4 heavy` - 6 frames
  - `5 dodge` - 4 frames
  - `6 parry` - 4 frames
  - `7 hurt` - 2 frames
  - `8 dead` - 3 frames

### Grunt

- File: `public/sprites/grunt.png`
- Template: `docs/art/templates/grunt-sheet-guide.svg`
- Canvas: `256 x 384`
- Frame size: `64 x 64`
- Columns: `4`
- Rows: `6`
- Row order:
  - `0 walk` - 4 frames
  - `1 windup` - 3 frames
  - `2 attack` - 3 frames
  - `3 recover` - 2 frames
  - `4 hurt` - 2 frames
  - `5 dead` - 3 frames

### Runner

- File: `public/sprites/runner.png`
- Template: `docs/art/templates/runner-sheet-guide.svg`
- Canvas: `384 x 384`
- Frame size: `64 x 64`
- Columns: `6`
- Rows: `6`
- Row order:
  - `0 walk` - 6 frames
  - `1 windup` - 3 frames
  - `2 attack` - 4 frames
  - `3 recover` - 2 frames
  - `4 hurt` - 2 frames
  - `5 dead` - 3 frames

### Shield

- File: `public/sprites/shield.png`
- Template: `docs/art/templates/shield-sheet-guide.svg`
- Canvas: `320 x 480`
- Frame size: `80 x 80`
- Columns: `4`
- Rows: `6`
- Row order:
  - `0 walk` - 4 frames
  - `1 windup` - 3 frames
  - `2 attack` - 3 frames
  - `3 recover` - 2 frames
  - `4 hurt` - 2 frames
  - `5 dead` - 3 frames

### Tank

- File: `public/sprites/tank.png`
- Template: `docs/art/templates/tank-sheet-guide.svg`
- Canvas: `384 x 576`
- Frame size: `96 x 96`
- Columns: `4`
- Rows: `6`
- Row order:
  - `0 walk` - 4 frames
  - `1 windup` - 4 frames
  - `2 attack` - 4 frames
  - `3 recover` - 2 frames
  - `4 hurt` - 2 frames
  - `5 dead` - 3 frames

### Glitch

- File: `public/sprites/glitch.png`
- Template: `docs/art/templates/glitch-sheet-guide.svg`
- Canvas: `480 x 480`
- Frame size: `80 x 80`
- Columns: `6`
- Rows: `6`
- Row order:
  - `0 walk` - 6 frames
  - `1 windup` - 3 frames
  - `2 attack` - 4 frames
  - `3 recover` - 2 frames
  - `4 hurt` - 2 frames
  - `5 dead` - 3 frames

### Boss

- File: `public/sprites/boss.png`
- Template: `docs/art/templates/boss-sheet-guide.svg`
- Canvas: `800 x 1120`
- Frame size: `160 x 160`
- Columns: `5`
- Rows: `7`
- Row order:
  - `0 walk` - 4 frames
  - `1 windup` - 4 frames
  - `2 attack` - 4 frames
  - `3 recover` - 3 frames
  - `4 hurt` - 2 frames
  - `5 dead` - 4 frames
  - `6 specialAttack` - 5 frames

## Workflow

1. Open the matching SVG guide from `docs/art/templates/`.
2. Use the guide to lay out the exact row and frame structure.
3. Draw or generate the sprite sheet against that grid.
4. Remove labels/guides before final export if your tool bakes them into the PNG.
5. Export the final transparent PNG into `public/sprites/`.
6. Run the game and verify the fallback art disappears for that actor.

## ChatGPT Workflow

If you are using ChatGPT to make the sheets:

1. Use the prompts in `docs/art/spaceblade-sprite-sheet-prompts.md`.
2. Attach the current concept art from `imeges/` as style reference if helpful.
3. Attach the matching SVG template as the layout reference.
4. Ask for a single transparent-background sprite sheet, not separate renders.

## Visual Priorities

- Keep silhouettes readable at gameplay size.
- Motion should read clearly from a distance before it looks fancy up close.
- Player needs strong cyan readability.
- Enemies need threat clarity first:
  - grunt readable and aggressive
  - runner lean and fast
  - shield heavy front-facing defense
  - tank bulky and weighty
  - glitch unstable and eerie
  - boss dominant and unmistakable

## Current Status

- Runtime sprite-sheet support is already in the codebase.
- The runtime PNGs are now present in `public/sprites/` for:
  - player
  - grunt
  - runner
  - shield
  - tank
  - glitch
  - boss
- Each current sheet was generated against this contract, then resized to the
  exact runtime canvas and converted from chroma-key to alpha before promotion.
- If any sheet is replaced later, keep the same grid contract and re-run the
  full art verification command: `npm run verify:art`.
- The old `imeges/` folder remains reference-only concept art.
