---
name: spaceblade-release-wrapup
description: Finish and publish the Spaceblade one-button browser game with a narrow release scope, deterministic verification, cache-safe assets, and low-cost static deployment.
---

# Spaceblade Release Wrap-up

Use this skill when the game is close to publish and the user asks for final fixes.

1. Freeze architecture, networking, controls, and new gameplay systems unless the user explicitly reopens scope.
2. Inspect `git status`, the current production branch, and `README.md` before editing.
3. Prefer small, independently testable fixes. Add a regression test before changing pure simulation or asset contracts.
4. Run focused Vitest checks first, then `npm run build`. Avoid long late-wave/browser probes unless a release blocker needs them.
5. If a PNG or runtime frame changes, bump the frame revision in `src/rebuild/assets/frameManifest.ts` and update its contract test.
6. Deploy with `npx vercel --prod --yes`, verify the production URL returns `200`, and report the commit, tests, build, and deployment plainly.
7. Never stage unrelated user files such as `changes.md`; keep the commit limited to the release slice.
