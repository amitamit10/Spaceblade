# Task 3: Implement Space Input Parser

**Purpose:** Convert raw Space key down/up timestamps into deterministic actions.

**Read first:**

- `01-execution-rules.md`
- `02-global-constraints.md`
- `03-locked-constants.md`
- `04-shared-types.md`
- `task-02-ui-flow.md`

**Files:**

- Create `src/game/input/inputConfig.ts`.
- Create `src/game/input/inputParser.ts`.
- Create `src/game/input/inputParser.test.ts`.
- Re-export `InputAction` from `src/app/types.ts`.

**Exact behavior:**

- Ignore repeated `keydown` events while Space is already held.
- `keydown` starts a hold timer and returns `null`.
- `keyup` before `180ms` returns `tap`, unless it completes a double tap.
- Two taps whose `keyup` timestamps are within `300ms` return `doubleTap` on the second release.
- `keyup` after at least `300ms` returns `holdRelease`.
- The parser exposes `peekHeldAction(now)` and returns `holdStart` once after Space has been held for at least `220ms`.
- Parry is resolved by combat, not by raw input parsing. Combat resolution upgrades a valid `tap` to `parry` when an enemy impact is inside the parry window.

**Required tests:**

- Single quick press returns `tap`.
- Two quick presses inside `300ms` return `doubleTap` on the second release.
- Holding for `220ms` exposes one `holdStart`.
- Releasing after `300ms` returns `holdRelease`.
- Repeated browser keydown while held does not create extra actions.

**Verification command:**

```bash
npm test -- --run src/game/input/inputParser.test.ts
```

**Quality gate:**

- All tests pass.
- No UI or gameplay module interprets raw keyboard timing directly after this task.

**Commit:**

```bash
git add .
git commit -m "feat: implement one-key input parser"
```
