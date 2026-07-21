# Changes

Major changes in direction since starting the project, in order.

## 1. Assets: scratch → ready-made sprite sheets
Dropped procedural (code-drawn) art in favor of real, hand-authored PNG sprite sheets per actor, with the procedural engine kept only as a fallback.

## 2. Switch to a real engine (Phaser)
Was running on a hand-rolled canvas render loop/scene system built from scratch (`src/game`, `src/app`). Switched to the Phaser game engine as the runtime instead, and rebuilt the game on top of it (`src/engine`, `src/rebuild`). The old hand-rolled system stuck around for a while but stopped being what actually runs the game.

## 3. Assets: hand-authored → licensed public asset pack
Moved again from the hand-authored sprite sheets to a licensed public art pack ("Warped City"), with proper license/attribution docs, as the source for sprites and effects.

Result: player and enemies now use the licensed pack's sprites against a layered neon-city backdrop, with wave/score/threat HUD and the tap-sword / hold-gun-shot / double-tap-dodge control legend shown on screen.

## 4. Gameplay: wave-clear floor climb → continuous auto-parkour
Added a scrolling obstacle course (auto-vault, wall-climb, land) that runs continuously during combat, on top of the original once-per-wave floor transition. It's presentation-only — always resolves the same regardless of what the player does — and never touches the one-key combat input.
