# Bordered Sprite Workflow

The bordered plates in `mockups/bordered-sprites/` are review assets. They do
not replace the runtime sheets. The deployed overview is available at
`/sprite-guides/bordered/overview.png`.

Generate them with:

```bash
bash scripts/build-bordered-sprite-plates.sh
```

Each card contains one proposed frame, a large transparent safety margin, and
a bright magenta border outside the artwork. The matching JSON file records
the frame labels and card size. The border is the crop contract: a cutter must
detect the border rectangle and remove the border before exporting the PNG.

To test the automatic border cutter locally:

```bash
bash scripts/cut-bordered-sprite-plates.sh \
  mockups/bordered-sprites/player-bordered.png \
  /tmp/spaceblade-player-frames
```

The script detects the closed magenta rectangles with connected components,
sorts them by screen position, matches them to the JSON labels, and removes
only the border. It fails closed if a border is missing or an unexpected extra
rectangle is present.

This workflow avoids alpha-bound guessing. Wide sword arcs, gun trails, parry
effects, and death poses receive the same safety card size as compact poses, so
their visible pixels cannot be clipped by a standing-frame box.

Do not copy a bordered plate into `public/sprites/`. After the plates are
approved, the source art can be regenerated into the same card contract and
the exporter can create clean transparent runtime frames.
