# Final Acceptance Checklist

Before calling the project complete, verify every item in this file.

- [ ] `npm install` succeeds from a clean checkout.
- [ ] `npm test -- --run` passes.
- [ ] `npm run build` passes.
- [ ] `npm run dev` starts a playable local app.
- [ ] Every screen is reachable using only `Space`.
- [ ] A full run can end in game over.
- [ ] A skilled run can reach boss wave 15.
- [ ] Online leaderboard works when Firebase env vars are present.
- [ ] Highscores screen degrades gracefully when Firebase env vars are absent.
- [ ] Local best score persists after refresh.
- [ ] Settings persist after refresh.
- [ ] README explains setup, controls, leaderboard, and OneKey fit.

Self-review checklist:

- [ ] UI shell, player kit, enemy roster, environment, run structure, online leaderboard, and final integration are each implemented.
- [ ] No required gameplay input uses mouse, touch, arrows, WASD, Enter, or Escape.
- [ ] `GameScreen`, `InputAction`, `PlayerStateName`, `EnemyType`, `RunStats`, and `LeaderboardEntry` match `04-shared-types.md`.
- [ ] Firebase reads happen only on leaderboard/title entry.
- [ ] Firebase writes happen only after eligible run end.
- [ ] Each phase's tests and verification commands have been run fresh.
