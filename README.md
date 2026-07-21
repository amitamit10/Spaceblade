# Spaceblade

One key. Endless fight.

Built for Hack Club's **OneKey** challenge.

## What was hard

Honestly, the hardest part was that I changed direction on this a lot:

- **Art, three times over.** First tried drawing sprites procedurally in code. Switched to hand-authored sprite sheets. Then switched again to real licensed art packs (Warped City for the environment, Kenney's Robot Pack for enemies, a separate CC0 pack for the player) once I realized I'd rather spend my time on gameplay than pixel art. Each switch meant re-wiring how frames get loaded and sized.
- **Rebuilt the engine mid-project.** Started with a render loop and scene system I wrote myself. Partway through I ripped that out and switched to Phaser instead, then rebuilt the game on top of it. Old code (`src/game`, `src/app`) is still sitting in the repo — it's not what actually runs anymore.
- **Making everything work from one key.** Tap, hold, release, double-tap, and a perfectly-timed tap all had to mean something different, without ever feeling ambiguous. Getting the timing windows to feel fair took a lot of back-and-forth.
- **Balance.** Threat caps, spawn density, dodge timing, parry windows — tuned late and repeatedly, mostly against the boss wave, which kept spawning extra enemies alongside the boss until I fixed the wave-15 spawn logic. Enemies now also get tougher and faster the higher you climb.
- **Layering a parkour feel on top of the climb.** Added a continuous auto-vault/wall-climb obstacle course running in the background while you fight, on top of the once-per-floor climb — without ever touching the one-key combat input.

## Controls

| Input | Does |
| --- | --- |
| Tap | Sword slash |
| Hold, then release | Charged gun shot |
| Double tap | Dodge |
| Tap right as an enemy attacks | Parry |

Combat is Space-only. Menus are mouse-first, with Space also working. Pause is a click button.

Runs need a name typed in before they hit the leaderboard.

## Credits

- Environment/effects: [Warped City](https://opengameart.org/content/warped-city) by Luis Zuno / Ansimuz (public domain)
- Enemies: [Kenney Robot Pack](https://opengameart.org/content/robot-pack) (CC0)
- Player: [Space Soldier](https://opengameart.org/node/80877) (CC0)
- SFX: [Kenney Digital Audio](https://kenney.nl/assets/digital-audio) (CC0)
- Music: "Tense Future Loop" by gmason (CC0)


Live at [spaceblade.vercel.app](https://spaceblade.vercel.app).
