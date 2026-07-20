---
name: spaceblade-public-runtime-pipeline
description: Maintain Spaceblade's vendored public pixel-art runtime frames, including source mapping, grounded normalization, animation identity, hit readability, and cache-safe regeneration.
---

# Spaceblade Public Runtime Pipeline

Use this skill when a Spaceblade sprite is clipped, visually duplicated, mapped to the wrong action, or inconsistent with its hit behavior.

- Treat `public/assets/public/warped-city/` as the source of truth and keep its license file.
- Change `scripts/build-public-runtime-frames.sh`, regenerate standalone RGBA PNGs, and inspect the runtime preview before committing.
- Keep each actor's cell dimensions and south anchor stable. Give distinct gameplay roles distinct source silhouettes; do not recolor-copy a sprite when a staged public asset is available.
- Map the player's neutral state to the authored `run-*` sequence. Keep combat sequences separate from locomotion.
- Keep projectile collision in pure simulation. If a small visual target needs help, use a documented per-type hit radius and test it; do not make rendering coordinates determine gameplay hits.
- After any runtime frame change, bump `public-pack-*` in the manifest so installed service-worker clients fetch the new files.
- Run the sprite manifest tests and production build before deployment.
