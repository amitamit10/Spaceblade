# Task 6: Implement Arena, Camera, Background Layers, Effects, And Audio Cues

**Purpose:** Make the game look and sound like the mockups while preserving readability and the 30 FPS target.

**Read first:**

- `01-execution-rules.md`
- `02-global-constraints.md`
- `03-locked-constants.md`
- `04-shared-types.md`
- `task-05-enemy-roster.md`

**Files:**

- Create all `src/game/rendering` files from the target file map.
- Create all `src/game/audio` files from the target file map.
- Modify `src/styles.css` for responsive canvas framing.

**Exact rendering rules:**

- Canvas internal resolution remains `1280 x 720`.
- CSS scales `.game-canvas` to `min(100vw, calc(100vh * 16 / 9))` width while preserving `aspect-ratio: 16 / 9`.
- Draw order:
  1. background gradient and distant skyline for the active sector
  2. parallax building silhouettes using three layers: foreground tech, city mid, distant skyline
  3. floor platform
  4. spawn gate glow
  5. enemy telegraphs
  6. enemies
  7. player
  8. slash, shockwave, parry, hit, and dash effects
  9. screen flash and camera shake
- Reduced effects mode keeps combat-critical effects and removes ambient particles, extra glow passes, and nonessential screen flash.
- Implement three background themes as Canvas drawing modes: `neonCity`, `industrialSector`, and `corruptedCore`.
- Damage numbers render in yellow for normal hits, larger yellow text for heavy hits, and `STUNNED!` for parry success.
- Camera feedback is subtle shake for normal hit, stronger shake plus slight zoom for heavy slash, and quick flash for parry success.
- Parry timing UI renders `TOO EARLY`, `PERFECT`, or `TOO LATE` based on the nearest incoming enemy impact.
- Web Audio cues are generated in code for `slash`, `parry`, `hit`, `enemyAlert`, `boss`, and `ambient`; no external audio files are required in v1.

**Exact effect API:**

```ts
export type EffectKind =
  | "slashArc"
  | "shockwave"
  | "parryFlash"
  | "dashTrail"
  | "hitSpark"
  | "enemyTelegraph"
  | "ambientParticle"
  | "screenFlash";

export function shouldRenderEffect(
  kind: EffectKind,
  reducedEffectsEnabled: boolean,
): boolean;
```

**Exact audio API:**

```ts
export type SoundCue = "slash" | "parry" | "hit" | "enemyAlert" | "boss" | "ambient";

export function createSoundBus(getVolume: () => number): {
  play(cue: SoundCue): void;
  stopAmbient(): void;
};
```

**Required tests:**

- Reduced effects keeps `slashArc`, `shockwave`, `parryFlash`, `hitSpark`, and `enemyTelegraph`.
- Reduced effects removes `ambientParticle` and `screenFlash`.
- Canvas scaling helper returns 16:9 dimensions for common viewport sizes.
- `soundBus.test.ts` verifies volume is clamped between `0` and `1` before sound playback commands are created.

**Manual verification:**

- Start `npm run dev`.
- Confirm title screen, gameplay sample scene, HUD, and overlays do not overlap at desktop width.
- Confirm the arena reads as cyberpunk even with generated Canvas shapes.
- Confirm all six sound cues can be triggered from a desktop browser after the first Space input unlocks audio.

**Quality gate:**

- Effects improve combat readability.
- UI text and HUD remain readable over the background.
- The game does not rely on imported bitmap sprites to be playable.

**Commit:**

```bash
git add .
git commit -m "feat: add arena rendering and visual effects"
```
