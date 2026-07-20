---
name: spaceblade-sprite-pipeline
description: Inspect, guide, crop, and verify Spaceblade pixel-art sprite sheets with fixed and dynamic frame boxes. Use when sprites are clipped, action effects cross cells, new art is being generated, or runtime frames must be replaced.
---

# Spaceblade Sprite Pipeline

Use this skill before changing any runtime sprite frame. The required order is:

1. Inspect the source PNG dimensions and alpha bounds.
2. Generate or open an inspection guide before extraction.
3. Use dynamic boxes for poses whose sword, gun trail, shield, hair, or legs cross a normal cell.
4. Get user approval of the guide before replacing `public/sprites/frames`.
5. Extract transparent PNGs with complete margins and update the manifest only after dimensions are verified.
6. Run focused sprite tests, build, and a short browser motion check. Do not start the long late-wave probe unless explicitly requested.

## Source Contract

- Runtime sheets live in `public/sprites/<actor>.png`.
- Runtime frame paths live in `public/sprites/frames/<actor>/`.
- The current fixed-sheet contract is documented in `docs/art/spaceblade-sprite-sheet-handoff.md`.
- The current cutter is `/sprite-cutter.html` and runs locally in the browser; it must not upload images.
- Generate all-actor inspection guides with `scripts/generate-sprite-guides.sh`; review the resulting `mockups/sprite-guides/*-guide.png` files before extraction.
- Use `scripts/split-sprite-sheets.sh` only for regular fixed cells. Do not force an oversized action into a smaller standing cell.

## Dynamic Box Rules

- Keep regular grid boxes for idle, walk, hurt, and other compact poses.
- Give slash arcs, gun trails, parry shields, dodge streaks, and death poses their own larger rectangles.
- Keep at least 12 pixels of transparent margin around every visible pixel when possible.
- Boxes may overlap the regular guide grid; that is expected and is the reason the dynamic guide exists.
- Never bake guide lines, labels, or borders into the final runtime PNG.
- Every extracted runtime frame must have a complete body and effect; never repair clipping by removing the top or bottom of a frame.

## Verification

Run:

```bash
npx vitest --run src/rebuild/assets/frameManifest.test.ts src/game/rendering/runtimeSpritePack.test.ts
npm run build
```

The frame manifest test must verify that every declared standalone frame has the actor's full expected dimensions. Use the cutter manually for questionable frames and export coordinates before implementation.

## References

- Read `docs/art/spaceblade-sprite-sheet-handoff.md` for row/action counts.
- Read `docs/art/runtime-sprite-pack.md` for the shipped asset contract.
- Read `scripts/split-sprite-sheets.sh` before changing extraction behavior.
