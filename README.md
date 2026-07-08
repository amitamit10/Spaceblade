# Spaceblade

**One key. Endless fight.** A 2D side-view cyberpunk action game controlled entirely with the `Space` key. Survive 15 escalating waves in Neon-Sector 04 and defeat the boss.

## What It Is

Spaceblade is a browser action game built for the Hack Club **OneKey** challenge: every interaction — menus, combat, pause, settings — is driven by a single key. You are locked to the center of the arena while enemies pour in from both sides; you read their red attack telegraphs and answer with slashes, heavy shockwaves, dodges, and perfectly-timed parries.

- Fixed internal resolution `1280 x 720`, scaled responsively to any 16:9 viewport.
- Rendered on one HTML Canvas with code-authored pixel sprites and tiled backgrounds.
- Pure-TypeScript simulation, fully unit tested; menus are DOM overlays.
- Optional online leaderboard on Firebase Firestore (free tier). The game is fully playable with no backend configured.

## One-Key Controls

Everything uses `Space`:

| Input | Action | Effect |
| --- | --- | --- |
| **Tap** | Quick Slash | Fast attack in front of you |
| **Hold** | Charge | Charge a heavy attack (movement locked) |
| **Release** | Heavy Slash | Shockwave that can hit multiple enemies |
| **Double Tap** | Dodge | Dash backward with brief invincibility |
| **Tap at the moment of impact** | Parry | Blocks and stuns the attacker |
| **Hold ~450ms in menus** | Confirm | Select the focused menu action |
| **Hold ~900ms while idle in a run** | Pause | Open the pause menu |

Enemies: **Grunt** (one hit), **Runner** (fast, punish after its dash), **Shield** (heavy or parry only), **Tank** (2 HP, hit after its big swing), **Glitch** (teleports), and the **Boss** on wave 15.

## Local Development

Requirements: Node 18+ and npm.

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm test         # run the unit + integration tests (vitest)
npm run test:art       # run sprite verification plus the browser motion test
npm run test:motion    # run the browser title -> tutorial -> playing motion check
npm run test:sprites   # run the focused shipped-sprite verification suite
npm run verify:art     # full art verification + production build
npm run verify:motion  # browser motion check + production build verification
npm run verify:sprites # sprite suite + production build verification
npm run build    # type-check and build the production bundle to dist/
npm run preview  # preview the production build
```

## Online Leaderboard

The leaderboard is **optional** and read-mostly:

- Scores are submitted only when a run ends with a score of at least `100`.
- The leaderboard is read only on the highscores/title screens — there are no realtime listeners or polling.
- Local best score, best wave, settings, tutorial-seen flag, and player name are stored in `localStorage`.
- With no Firebase configuration the highscores screen shows a **disabled** state; on a network error it shows **offline**. Gameplay is never blocked by the network.
- The **Friends** tab shows your local best only (there is no account system in v1).

## Character Sprite Sheets

Runtime character art is prepared to load from sprite sheets using one explicit contract per actor:

- Each actor uses one PNG sheet plus one TypeScript manifest under `src/game/assets/sprites/`.
- The manifest defines frame size, anchor point, draw scale, facing, and animation rows explicitly.
- If a sheet is missing or fails to load, the game falls back to the built-in procedural renderer.
- The current runtime sheets for the player, all five standard enemies, and the boss already live in `public/sprites/`.
- `src/game/rendering/runtimeSpritePack.test.ts` verifies manifest uniqueness, runtime sheet/file sync, shipped sprite-sheet dimensions, alpha preservation, and used/unused cell occupancy against the manifests.
- The current `imeges/` folder is reference art only and is not used as the runtime asset source.

## Firebase Setup

1. Create a Firebase project and a **Cloud Firestore** database (free "Spark" tier is enough).
2. Add a Web App and copy its config values.
3. Create a `.env` (or `.env.local`) file in the project root:

   ```bash
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. Apply the security rules in [`firestore.rules`](firestore.rules) to the `leaderboardScores` collection. They allow public reads and validated public writes only (correct shape, `score` 100–999999, `wave` 1–15, no updates or deletes).
5. Restart `npm run dev`. The highscores screen will switch from "disabled" to live results.

## Vercel Deployment

Spaceblade is a static frontend and deploys to Vercel with zero config:

1. Import the GitHub repository in Vercel (framework preset: **Vite**).
2. Build command `npm run build`, output directory `dist`.
3. Add the four `VITE_FIREBASE_*` environment variables in the Vercel project settings (optional — omit them to ship without a leaderboard).
4. Deploy. Every push to the default branch publishes a new production build.

## Hack Club OneKey Fit

Spaceblade is designed around the OneKey constraint from the ground up:

- **No** arrow keys, WASD, mouse, pointer, or touch input is ever required.
- One input primitive (tap / hold / release / double-tap / perfect-timing) expresses the entire move set and all menu navigation.
- The parser converts raw `Space` down/up timestamps into deterministic actions, and combat upgrades a well-timed tap into a parry.
- A keyboard-recommended warning greets touch-only devices, but the whole flow still resolves to the single key.
