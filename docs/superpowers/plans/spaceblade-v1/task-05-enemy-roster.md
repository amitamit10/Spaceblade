# Task 5: Implement Enemy Actors, Telegraphs, And Hit Rules

**Purpose:** Add all enemy types with explicit counterplay and readable attack timing.

**Read first:**

- `01-execution-rules.md`
- `02-global-constraints.md`
- `03-locked-constants.md`
- `04-shared-types.md`
- `task-04-player-sandbox.md`

**Files:**

- Create all `src/game/enemies` files from the target file map.

**Exact enemy model:**

```ts
export type EnemyActor = {
  id: string;
  type: EnemyType;
  hp: number;
  x: number;
  y: number;
  side: "left" | "right";
  state: "spawning" | "approaching" | "windup" | "attacking" | "recovering" | "stunned" | "dead";
  facing: Facing;
  shielded: boolean;
  nextImpactAt: number | null;
  stunnedUntil: number | null;
};

export type AttackKind = "quick" | "heavy" | "parry";

export type EnemyHitResult =
  | "missed"
  | "blocked"
  | "damaged"
  | "shieldBroken"
  | "killed"
  | "stunned";
```

**Exact counterplay rules:**

- `Grunt`: dies from one quick, heavy, or parry hit.
- `Runner`: dies from one quick, heavy, or parry hit, has shorter windup, dash stabs through the player position during attack, then enters `recovering`; a quick slash or heavy slash during recovery kills it.
- `Shield`: raised shield blocks energy shots; a quick sword hit returns
  `shieldBroken` and removes the shield without dealing body damage; parry
  returns `stunned`; after a shield bash, it remains in `recovering` for
  `420ms`.
- `Tank`: has 2 hp; quick and heavy each deal 1 damage; parry stuns but does not damage; spawn scheduler allows no more than 2 active tanks.
- `Glitch`: teleports once every `2200ms` after wave 8; parry, quick, or heavy hit can kill it during visible frames.
- `Boss`: has 12 hp; alternates heavy swing and summon pause; parry stuns for `450ms` but does not damage.

**Exact telegraph rules:**

- Every enemy entering `windup` sets `nextImpactAt = now + windupMs`.
- Draw red exclamation marker above the enemy during windup.
- Draw red floor danger ring during the final `180ms` before impact.
- Runner dash telegraph is a red horizontal ground line.
- Area attack telegraph is a larger red floor zone.
- A parry is valid when `now` is between `nextImpactAt - 120` and `nextImpactAt + 60`.

**Required tests:**

- Shield blocks quick and breaks on heavy.
- Tank requires two damaging hits.
- Parry stuns shield but does not kill tank.
- Glitch teleport changes side or offset and respects cooldown.
- `isParryWindow(enemy, now)` returns true only inside the specified window.

**Verification commands:**

```bash
npm test -- --run src/game/enemies src/game/player src/game/input
npm run build
```

**Quality gate:**

- Each enemy has a distinct role and visible telegraph.
- Every enemy can be defeated or survived using only Space-driven actions.

**Commit:**

```bash
git add .
git commit -m "feat: implement enemy roster and counterplay"
```
