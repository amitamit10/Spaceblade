# Spaceblade V1 Plan Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Build a release-quality one-key browser action game with phased quality gates, online leaderboard support, and the full mockup-inspired UX flow.

**Architecture:** Vite + TypeScript static frontend. Gameplay renders on one HTML Canvas at `1280 x 720`; menus and modal UI render as DOM overlays. Core simulation is pure TypeScript and testable without canvas.

**Tech Stack:** Vite, TypeScript, Vitest, jsdom, HTML Canvas, DOM overlays, Firebase Firestore free tier, localStorage, Vercel static deployment

Read order:

1. `01-execution-rules.md`
2. `02-global-constraints.md`
3. `03-locked-constants.md`
4. `04-shared-types.md`
5. `05-target-file-map.md`
6. `task-01-bootstrap-foundation.md`
7. `task-02-ui-flow.md`
8. `task-03-input-parser.md`
9. `task-04-player-sandbox.md`
10. `task-05-enemy-roster.md`
11. `task-06-rendering-audio.md`
12. `task-07-run-structure.md`
13. `task-08-online-leaderboard.md`
14. `task-09-final-integration.md`
15. `99-final-acceptance.md`

Do not skip the shared files. They define the constants, public types, and file layout used by every task.
