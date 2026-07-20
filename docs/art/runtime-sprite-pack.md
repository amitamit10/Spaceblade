# Runtime Sprite Pack

This file records the current runtime sprite pack that ships with the game.

## Runtime Assets

These are the legacy PNG sheets retained for the static sheet contract and
fallback tooling:

| Actor | Path | Runtime Size |
| --- | --- | --- |
| Player | `public/sprites/player.png` | `576 x 864` |
| Grunt | `public/sprites/grunt.png` | `256 x 384` |
| Runner | `public/sprites/runner.png` | `384 x 384` |
| Shield | `public/sprites/shield.png` | `320 x 480` |
| Tank | `public/sprites/tank.png` | `384 x 576` |
| Glitch | `public/sprites/glitch.png` | `480 x 480` |
| Boss | `public/sprites/boss.png` | `800 x 1120` |

## Current Workflow

The active rebuild runtime now uses standalone frames generated from the
licensed Warped City public pack:

```bash
bash scripts/build-public-runtime-frames.sh
```

The converter preserves the required actor canvas sizes with transparent
padding and nearest-neighbor scaling, and emits 8-bit RGBA PNGs accepted by the
runtime metadata reader. Public movement and shooting frames are used where
they exist; the one-button sword/parry feedback remains drawn by the game so
the public pack is not misrepresented as having sword animations. The script
also removes stale generated action names before rebuilding the set.

The legacy sheet workflow remains available for fallback and tooling:

1. Generate a full sprite sheet against the contract in
   `docs/art/spaceblade-sprite-sheet-handoff.md`.
2. Save the raw generated sheet under `tmp/imagegen/<actor>-source.png`.
3. Resize it to the exact runtime canvas as
   `tmp/imagegen/<actor>-source-resized.png`.
4. Convert the chroma-key background to alpha as
   `tmp/imagegen/<actor>-alpha.png`.
5. Promote that alpha PNG into `public/sprites/<actor>.png`.

The checked-in runtime frame assets are the files under
`public/sprites/frames/`. The files under `tmp/imagegen/` are local working
artifacts that document the older custom-art promotion path.

## Verification

After replacing any sheet, the most complete art verification path is:

```bash
npm run verify:art
```

That command runs the focused sprite-pack suite, the browser motion check, and
then a production build.

If you only want the static sprite-pack verification path, use:

```bash
npm run verify:sprites
```

`src/game/rendering/runtimeSpritePack.test.ts` reads the shipped PNGs from
`public/sprites/`, extracts their real dimensions and occupancy data, and
validates them against the sprite manifests. The current automated checks cover:

- sprite manifest ids are unique
- manifest-backed runtime sheet paths match the actual PNG files in `public/sprites/`
- sprite manifest `src` paths are unique
- PNG dimensions match the runtime contract
- sheet geometry matches the manifest rows/frame counts
- alpha support is preserved
- sheet corners stay transparent
- each sheet contains visible opaque sprite content
- manifest-unused cells are empty
- manifest-declared frame cells are not blank

The `verify:sprites` command runs `test:sprites` first, then `npm run build`.
If you only want the focused sprite suite without a production build, use:

```bash
npm run test:sprites
```

## Motion Verification Note

Static sprite-contract verification is complete in this workspace, and there is
now a committed browser motion check:

`npm run verify:motion` remains available when you only want the browser pass
and a build without re-running the sprite suite.

That command runs the Playwright one-key flow under `tests/browser/` and then
rebuilds the app. The current browser check validates:

- title screen loads without fallback-art regressions
- player slash, heavy, dodge, and parry rows read clearly in motion
- each enemy attack/windup row reads correctly during combat
- boss special attack reads distinctly from normal attack

Artifacts from the browser run are written under `test-results/`.
