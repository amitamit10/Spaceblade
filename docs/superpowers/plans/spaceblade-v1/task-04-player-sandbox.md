# Task 4: Implement Player State Machine And Sandbox Scene

**Purpose:** Make the player kit feel consistent before enemy behavior exists.

**Read first:**

- `01-execution-rules.md`
- `02-global-constraints.md`
- `03-locked-constants.md`
- `04-shared-types.md`
- `task-03-input-parser.md`

**Files:**

- Create all `src/game/player` files from the target file map.
- Create `src/game/scenes/sceneRouter.ts` with a `playerSandbox` route used only during this phase's manual verification.

**Exact player state rules:**

- Initial state is `idle`, hearts are `3`, facing is `right`.
- `tap` in `idle` starts `slashing` for `120ms`, then recovery for `160ms`, then `idle`.
- `holdStart` in `idle` starts `charging`.
- `holdRelease` in `charging` starts `heavySlashing` for `180ms`, then recovery for `280ms`, then `idle`.
- `doubleTap` in `idle` starts `dodging` for `260ms` with `350ms` invulnerability.
- `parry` in `idle` starts `parrying` for `180ms` and applies nearby enemy stun through combat resolution.
- `hurt` locks player action for `420ms`.
- `dead` is terminal until the run restarts.

**Exact public API:**

```ts
export type PlayerSnapshot = {
  state: PlayerStateName;
  hearts: number;
  facing: Facing;
  x: number;
  y: number;
  invulnerableUntil: number;
  actionStartedAt: number;
};

export function createPlayerStateMachine(now: number): {
  applyAction(action: InputAction, now: number): PlayerSnapshot;
  applyDamage(now: number): PlayerSnapshot;
  update(now: number): PlayerSnapshot;
  getSnapshot(): PlayerSnapshot;
};
```

**Required tests:**

- `tap` moves `idle -> slashing -> idle` after active plus recovery time.
- `holdStart` then `holdRelease` moves `idle -> charging -> heavySlashing -> idle`.
- `doubleTap` sets invulnerability until at least `now + 350`.
- `applyDamage` reduces hearts by one unless invulnerable.
- Third damage event moves state to `dead`.

**Rendering requirements:**

- `playerRenderer.ts` draws readable vector player shapes, sword arcs, charge glow, dodge trail, and parry ring using Canvas primitives.
- Vector visuals must be polished enough for development verification; do not block on sprite assets.

**Verification commands:**

```bash
npm test -- --run src/game/player src/game/input
npm run build
```

**Quality gate:**

- Player actions can be tested in isolation.
- Every action has visible feedback on canvas.
- No enemy or wave code is required to judge player action timing.

**Commit:**

```bash
git add .
git commit -m "feat: build player action sandbox"
```
