# Visual, Audio, And Online Direction

Visual direction:

- Dark cyberpunk arena.
- Neon cyan, magenta, purple, yellow, and teal accents.
- Readable character silhouettes.
- Bright sword arcs and clear impact effects.
- Clean futuristic UI panels.
- Layered backgrounds with restrained parallax.

Color language:

- Cyan means player.
- Red means enemy.
- Purple / blue means UI.
- Yellow means feedback.
- Teal / green means effects.

Feedback:

- Normal hit: small spark and damage number.
- Heavy hit: larger spark, bold damage number, stronger impact.
- Parry success: `STUNNED!`, burst, flash, and stun.
- Enemy telegraph: red warning marker, line, ring, or zone.
- Parry timing UI: `TOO EARLY`, `PERFECT`, `TOO LATE`.

Audio:

- Generate v1 sound cues with Web Audio.
- Required cues: slash, parry, hit, enemy alert, boss, ambient.
- No external audio files are required in v1.

Online scope:

- Online means leaderboard only.
- Use Firebase Firestore free tier.
- No realtime listeners, polling, accounts, multiplayer rooms, or server functions.
- Game remains playable if leaderboard is disabled or offline.
