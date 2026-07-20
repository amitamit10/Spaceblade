# Building Floor Rush Design

## Goal

Turn Spaceblade into a fast-paced one-button building assault: the player
automatically runs through an occupied building, defeats every enemy on the
current floor, then automatically jumps, wall-climbs, and lands on the next
floor until the boss floor is cleared.

## User Experience

- Space is the only combat input: tap for sword, hold and release for the gun,
  double-tap for dodge, and precise tap timing for parry.
- The on-screen `PAUSE` button and name submission field remain UI-only
  exceptions; arena clicks never perform combat actions.
- Each wave is one building floor. The HUD and transition banner use `FLOOR N`
  as the primary progress language.
- The player goal is explicit: eliminate all threats on the current floor.
- When a floor is cleared, traversal is automatic: leap from the combat lane,
  catch the wall, climb through the shaft, and land on the next floor. No new
  movement button is introduced.
- The scene should read as an interior building, not an outdoor skyline: side
  walls, ceiling/shaft framing, floor slabs, windows or lit room panels, and a
  visible vertical route should surround the active combat lane.

## Pacing

Use a deterministic floor-based ramp so difficulty matches the building story:

- Floor 1 uses the current baseline enemy speeds and spawn interval.
- Each later floor increases enemy movement speed smoothly, capped at roughly
  50-55% above floor 1 by floor 15.
- Spawn intervals shrink with the same ramp but never go below a readable lower
  bound of 520ms.
- Attack windups shorten modestly on later floors, with a minimum of 160ms so
  telegraphs remain reactable.
- Existing threat-weight, active-enemy, tank, shield, glitch, and boss limits
  remain in force. The ramp increases pressure without removing counterplay.

## Architecture

Keep the pure simulation in `src/rebuild/rebuildGame.ts`. Add exported,
deterministic helpers for the floor pacing multiplier, scaled enemy speed,
scaled windup, and spawn interval. `advanceRebuildRun` consumes those helpers;
no rendering state is stored in the simulation.

Keep presentation in `src/engine/spacebladeScene.ts` and
`src/rebuild/renderScene.ts`:

- Draw the interior building shell with existing low-cost Phaser graphics and
  the vendored public background layers; do not add a server, physics engine,
  or remote runtime asset dependency.
- Extend the existing floor transition offset into recognizable vault, wall
  climb, shaft, and landing phases. Use the existing wall-climb, parkour, and
  landing sounds at those phase boundaries.
- Shift floor framing and labels when the wave changes, while enemies remain on
  the active combat floor and are cleared before the next transition begins.
- Expose `data-spaceblade-floor`, `data-spaceblade-parkour`, and transition
  phase markers for browser verification.

## Testing

- Unit-test pacing helpers: floor 1 baseline, later floors faster, floor 15 at
  the cap, and spawn interval never below 520ms.
- Unit-test the floor transition phases: vault, climb, descent, and completion.
- Preserve existing one-button input tests and confirm pointer clicks do not
  call combat actions.
- Run the focused simulation/scene suites, `npm run build`, and a production
  smoke check before commit.

## Out Of Scope

- No new gameplay buttons or player-controlled movement.
- No physics-based collision system or multiplayer.
- No new server-side gameplay state.
- No replacement of the current public sprite pack.
