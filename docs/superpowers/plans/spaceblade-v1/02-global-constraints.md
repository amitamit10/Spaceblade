# Global Constraints

- Entire game must be controlled only with the `Space` key.
- No arrow keys, WASD, mouse, pointer, touch, or other gameplay inputs may be required.
- Use `Vite + TypeScript + HTML Canvas` for gameplay rendering.
- Use DOM overlays for menus, tutorial, settings, highscores, game over, and mobile warning.
- The game must run locally with `npm install` and `npm run dev`.
- The game must build with `npm run build`.
- The game must be deployable to Vercel as a static frontend.
- Store local best score, local best wave, settings, and tutorial-seen flag in `localStorage`.
- Online scope is leaderboard only.
- Backend target is Firebase Firestore free tier.
- Do not add realtime listeners, polling, multiplayer rooms, accounts, or server functions in v1.
- Performance target is a stable `30 FPS`.
- Use fixed internal game resolution `1280 x 720` and scale it responsively.
- V1 run structure is a 15-wave structured run in `Neon-Sector 04`, ending with the boss on wave 15.
- The title tagline is `ONE KEY. ENDLESS FIGHT.`
- The full v1 flow includes title, tutorial, gameplay, pause, settings, game over, highscores, and mobile warning.
- Each phase must be independently testable before moving to the next phase.
