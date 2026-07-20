# Sprite Guide Workflow

The inspection guides in `mockups/sprite-guides/` are generated from the
runtime sheets without changing the runtime assets.

```bash
bash scripts/generate-sprite-guides.sh
```

Guide colors:

- Cyan: compact idle/walk frame bounds.
- Magenta: expanded action bounds for sword, gun, dodge, parry, effects, and
  death poses.
- The thin blue grid is the original fixed-sheet cell layout.

Review the guides before extracting replacement frames. If an effect still
touches a guide border, edit the row padding in
`scripts/generate-sprite-guides.sh` or use `/sprite-cutter.html` in Manual mode
to save a larger custom rectangle. Never put guide lines or labels into a
runtime PNG.
