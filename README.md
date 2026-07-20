# Spaceblade

**One key. Endless fight.** A 2D side-view cyberpunk action game controlled entirely with the `Space` key. Survive 15 escalating waves in Neon-Sector 04 and defeat the boss.

## What It Is

Spaceblade is a browser action game built for the Hack Club **OneKey** challenge: gameplay combat is driven entirely by a single key. The player auto-runs inside a neon building, clears every enemy on the current floor, then automatically vaults, wall-climbs, and lands on the next floor. Enemy speed and spawn pressure increase as the building rises; combat uses sword slashes, energy shots, dodges, and perfectly-timed parries. Menus support mouse clicks and Space.

- Fixed internal resolution `1280 x 720`, scaled responsively to any 16:9 viewport.
- Rendered on one HTML Canvas with verified standalone pixel frames and tiled backgrounds.
- Pure-TypeScript simulation, fully unit tested; menus are DOM overlays.
- Optional online leaderboard on Firebase Firestore (free tier). The game is fully playable with no backend configured.

## Controls

Gameplay uses `Space`; menus also accept mouse clicks:

| Input | Action | Effect |
| --- | --- | --- |
| **Tap** | Sword Slash | Fast close-range attack in front of you |
| **Hold** | Charge | Charge an energy shot |
| **Release** | Energy Shot | Launch a long-range projectile down the runner lane |
| **Double Tap** | Dodge | Dash backward with brief invincibility |
| **Tap at the moment of impact** | Parry | Blocks and stuns the attacker |
| **Hold ~450ms in menus** | Confirm | Select the focused menu action |
| **Click PAUSE** | Pause | Open the pause menu without interrupting Space combat |

Enemies: **Grunt** (one hit), **Runner** (fast, punish after its dash), **Shield** (heavy or parry only), **Tank** (2 HP, hit after its big swing), **Glitch** (teleports), and the **Boss** on wave 15.

The game targets a steady 20-30 FPS on low-cost hardware. Each wave is presented as a new building floor; the floor transition is automatic, so the player still controls only combat timing. The interior shell shows walls, windows, floor slabs, and a climb rail; floor 15 is the boss floor. Floor pacing ramps deterministically to a capped 1.55x multiplier, with spawn intervals never below 520ms and attack windups never below 160ms. The arena, floor scroll, hit effects, and enemy movement are client-side; the optional leaderboard is contacted only when a score is submitted or the highscores screen is opened.

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
npm run verify:production # live production smoke check for gameplay and cost guards
npm run verify:firebase-rules # reject malformed public leaderboard writes
npm run verify:sprites # sprite suite + production build verification
npm run build    # type-check and build the production bundle to dist/
npm run preview  # preview the production build
```

## Online Leaderboard

The leaderboard is **optional** and read-mostly:

- After every run, the player enters a name and the complete run is submitted to the leaderboard, including zero-score runs.
- The leaderboard is read only on the highscores/title screens — there are no realtime listeners or polling.
- Local best score, best wave, settings, tutorial-seen flag, and player name are stored in `localStorage`.
- The settings callsign selector remains available for local records, but each completed run asks for the name that will be published.
- With no Firebase configuration the highscores screen shows a **disabled** state; on a network error it shows **offline**. Gameplay is never blocked by the network.
- When online records are unavailable, Highscores shows the local best only; there is no account system in v1.
- The exact Firebase and Vercel handoff is documented in [`docs/FIREBASE-VERCEL-SETUP.md`](docs/FIREBASE-VERCEL-SETUP.md).

## Runtime Art

The clean runtime uses authored standalone frames under `public/sprites/frames/`:

- Every declared animation frame is its own PNG URL; the runtime never samples a sprite sheet cell.
- The frame manifest defines dimensions, anchors, scale, and animation timing explicitly.
- `src/rebuild/assets/frameManifest.test.ts` verifies that every declared frame exists and that no runtime frame points back to a sheet.

## Runtime Audio

Ready-made sound effects from Kenney's CC0 Digital Audio pack are vendored in
`public/audio/kenney/` and mapped by `src/game/audio/soundBus.ts`. The game uses
local files for slash, energy shot, parry, hits, enemy alerts, boss cues,
parkour jump, wall climb, and landing. Audio is optional and fails safely when
a browser blocks autoplay.

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

4. Apply the security rules in [`firestore.rules`](firestore.rules) to the `leaderboardScores` collection. They allow public reads and validated public writes only (correct shape, `score` 0–999999, `wave` 1–15, no updates or deletes).
5. Restart `npm run dev`. The highscores screen will switch from "disabled" to live results.
6. For a non-destructive production rules check, run `node --env-file=.env.production.local scripts/verify-firebase-rules.mjs` after pulling the production env file.

## Vercel Deployment

Spaceblade is a static frontend and deploys to Vercel with zero config:

1. Import the GitHub repository in Vercel (framework preset: **Vite**).
2. Build command `npm run build`, output directory `dist`.
3. Add the four `VITE_FIREBASE_*` environment variables in the Vercel project settings (optional — omit them to ship without a leaderboard).
4. Deploy. Every push to the default branch publishes a new production build.

## Hack Club OneKey Fit

Spaceblade is designed around the OneKey constraint from the ground up:

- **No** arrow keys, WASD, touch, or extra gameplay buttons are required.
- One input primitive (tap / hold / release / double-tap / perfect-timing) expresses the entire move set.
- Menus can be navigated with `Space` or mouse clicks without changing the one-button gameplay.
- The parser converts raw `Space` down/up timestamps into deterministic actions, and combat upgrades a well-timed tap into a parry.
- A keyboard-recommended warning greets touch-only devices, but the whole flow still resolves to the single key.
