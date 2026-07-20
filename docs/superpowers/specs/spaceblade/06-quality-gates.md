# Quality Gates

Each phase must finish before the next begins.

Phase gates:

- UI is complete when all screen transitions work with `Space`.
- Player is complete when actions feel consistent and readable in a sandbox.
- Enemies are complete when each enemy has clear telegraph and counterplay.
- Environment is complete when effects improve readability and preserve the 30 FPS target.
- Run structure is complete when a full 15-wave session is playable.
- Online systems are complete when leaderboard success, disabled state, and offline state all work.
- Integration is complete when the product works end to end with keyboard only.

Final acceptance:

- A player can complete a full run from title to restart using only `Space`.
- Combat interactions feel learnable and rewarding.
- All mockup flow screens exist in working form.
- Leaderboard works online when Firebase credentials are configured and fails gracefully offline.
- `npm install`, `npm run dev`, `npm test -- --run`, and `npm run build` work from a clean checkout.
- README explains controls, setup, leaderboard, and OneKey challenge fit.
