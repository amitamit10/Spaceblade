# Task 1: Bootstrap Vite, Tests, Canvas Root, And App Shell

**Purpose:** Create a working Vite app with TypeScript, Vitest, jsdom, one canvas, and an initial title overlay.

**Read first:**

- `01-execution-rules.md`
- `02-global-constraints.md`
- `03-locked-constants.md`
- `04-shared-types.md`
- `05-target-file-map.md`

**Files:**

- Create every root and `src/app` file listed in the target file map for Task 1.
- Create `src/game/constants.ts`.
- Create `src/game/rendering/canvasRoot.ts`.
- Create `src/game/rendering/canvasRoot.test.ts`.

**Exact implementation requirements:**

- `package.json` scripts must be exactly:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

- Install runtime dependency: `firebase`.
- Install dev dependencies: `@types/node`, `jsdom`, `typescript`, `vite`, `vitest`.
- `index.html` must contain only one root element: `<div id="app"></div>`.
- `mountApp(root)` must clear `root` and render:
  - `<div class="spaceblade-app" data-app-shell>`
  - `<canvas class="game-canvas" data-game-canvas width="1280" height="720">`
  - `<div class="overlay-root" data-overlay-root>`
- Initial screen must be `title`.
- Canvas creation must be centralized in `createCanvasRoot(parent: HTMLElement): HTMLCanvasElement`.
- `createCanvasRoot` must set actual canvas width/height to `GAME_WIDTH` and `GAME_HEIGHT`.

**Required tests:**

- `src/app/appFlow.test.ts` verifies `mountApp` renders app shell, canvas, overlay root, and title screen.
- `src/game/rendering/canvasRoot.test.ts` verifies canvas internal size is exactly `1280 x 720`.

**Verification commands:**

```bash
npm install
npm test -- --run src/app/appFlow.test.ts src/game/rendering/canvasRoot.test.ts
npm run build
```

**Quality gate:**

- Browser opens with a title screen.
- Canvas exists behind overlays.
- No screen requires mouse or keyboard input besides `Space` after this point.

**Commit:**

```bash
git add .
git commit -m "feat: bootstrap spaceblade foundation"
```
