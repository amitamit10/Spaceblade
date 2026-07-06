# What Claude Absorbed — Spaceblade Mockups

Study notes from the 5 mockup sheets in `mockups/`, cross-referenced with `plan`.
This is my working understanding to build from once the plan docs are finalized.

---

## Core concept
- One-key, 2D side-view browser action game. Tagline: **"ONE KEY. ENDLESS FIGHT."**
- Player is **locked to screen center** — X-axis movement is visual only.
- **Single input** (Space / Primary Action) drives every interaction.
- Built for Hack Club OneKey challenge.

## One-key control scheme
| Input | Action | Effect |
|---|---|---|
| **Tap** | Quick Slash | Fast, low-damage front attack, short range |
| **Hold** | Charge | Movement locked while charging a heavy attack |
| **Release** | Heavy Slash | Arc shockwave, high damage, hits multiple enemies |
| **Double Tap** | Dodge | Dash backward, brief i-frames (~0.25–0.35s window) |
| **Perfect Timing** | Parry | Press ~6–10 frames before impact → blocks + stuns |

## Enemies (5 + boss)
- **Grunt** — weak melee frontliner, dies in one slash. Telegraph: raise & swing. Good for score/meter.
- **Runner** — light/fast striker, low HP. Telegraph: crouch → dash stab. Punish after it passes.
- **Shield** — defender/blocker, blocks front attacks. Need heavy slash or parry. Stun window after shield bash.
- **Tank** — heavy bruiser, high HP, slow. Telegraph: long windup → wide power swing. Hit after the swing. Max 2 active.
- **Glitch** — elite, teleports unpredictably. Flicker → disappear → strike. Parry/dodge on reappearance. Enters after wave 8.
- **Boss** — appears wave 15.

## Run structure & pacing
- **15 waves** (Level: Neon-Sector 04), difficulty Easy → Normal → Hard → Very Hard → Insane → Boss. ~12–15 min.
  (Also framed as "endless" in title art — v1 targets the 15-wave structured run.)
- Arena layout: **20% left spawn / 60% combat / 20% right spawn**. Floor platform + 3 parallax bg layers (foreground tech / city mid / distant skyline).
- **Max 6 active enemies** (Normal). Tank/Boss count as 2. No more than 2 Tanks active. Runners prioritized when player is far.
- Spawn spacing tightens: waves 1–3 = 2.2s, 4–6 = 1.8s, 7–10 = 1.4s, 11–13 = 1.1s, 14–15 = 0.8s. Intensity curve ramps up.

### Enemy mix by phase
- **Early (1–5):** Grunt 60%, Runner 30%, Shield 10%. Learn movement/basic attacks, use parry on Shields.
- **Mid (6–12):** Grunt 30%, Runner 25%, Shield 20%, Tank 15%, Glitch 10%. Punish openings, watch teleports/heavy hits.
- **Late (13+):** Grunt 15%, Runner 20%, Shield 15%, Tank 25%, Glitch 25%. Combinations, perfect timing critical.

## Combat rules
- **Health:** 3 hearts, full HP each wave. Most enemies deal 1 dmg/hit; boss/elite may deal more. HP 0 → run ends.
- **Stun:** certain attacks / successful parry stun enemies briefly, opening a follow-up window.
- **Knockback:** heavier attacks apply knockback to control space / interrupt.
- **I-frames:** Dodge and Parry grant brief invincibility windows.

## Scoring & progression
- **Score milestones:** B 500, C 1,000?, A 1,500, S 3,000, SS 5,000, SSS 7,000 (grade tiers).
- **Combo bonus:** 10+ → +5%, 25+ → +10%, 50+ → +20%, 75+ → +30%, 100+ → +40%. Resets if hit.
- **Perfect parry:** +100 pts each. Streak thresholds: 10 → +500, 25 → +1,500, 50 → +3,000.
- **Wave clear bonus:** clear a wave without taking damage → score + meter bonus (x1.5).
- Damage numbers shown on hit. Global rank / leaderboards per difficulty (best score example: 128,450, Top 2%).

## Visual feedback & juice
- **Hit feedback:** normal hit = small spark + damage number; heavy hit = bigger spark, bold number, strong impact; parry success = "STUNNED!" burst, shield break.
- **Particle effects:** blue slash arc follows blade; radial shockwave w/ energy particles + screen glow; dodge afterimage/speed lines; red enemy telegraph circle/indicator.
- **Camera feedback:** normal hit = subtle shake; heavy slash = stronger shake + slight zoom; parry = quick screen flash + impact.
- **Enemy telegraphs:** melee = red flash + `!`; charge = red line on ground; area = large red zone. Evade or parry.
- **Parry timing UI:** TOO EARLY / PERFECT / TOO LATE indicator bar.

## Color language
- Cyan = player · Red = enemy · Purple/blue = UI · Yellow = feedback · Teal/green = effects.

## Screens & UX flow
1. **Title** — logo, "PRESS SPACE TO START".
2. **Tutorial overlay** (first-time play) — How to Play card, hold to continue.
3. **In-game HUD** — HP hearts + bar (top-left), Wave counter (top-center), Score (top-right), Pause button. Keep UI in 16:9 safe area.
4. **Pause menu** — Resume / Settings / How to Play / Restart Run / Quit to Title. Hold to select.
5. **Game Over** — "DEPLOY FAILED", final score, waves reached, enemies defeated. Restart / View Highscores / Quit to Title.
6. **Highscores / Leaderboard** — Global / Friends tabs; rank, player, waves, score; highlights "YOU" row.
7. **Mobile warning** — "KEYBOARD RECOMMENDED", tap to continue.
- **Settings:** master audio volume, screen shake toggle, reduced effects toggle.

## Tech direction (from `plan`)
- Vite + TypeScript + HTML Canvas + DOM overlays.
- Firebase free-tier backend, scope limited to low-cost online leaderboard.
- Performance target: **stable 30 FPS** (mockup dev notes say 60 FPS target — reconcile in plan).
- Quality-first phased build: UI → player → enemies → environment → run structure → online leaderboard → integration.

## Dev/implementation notes (from mockups)
- Player locked to screen center (X movement only visual).
- One input (Primary Action) for all interactions.
- Hitboxes for: slash, shockwave, enemy attacks, parry window.
- Parry window ~6–10 frames around impact. Double-tap window ~0.25–0.35s.
- UI clean and minimal for readability in fast action. 16:9 aspect, pixel art scale 4x recommended.

## Asset checklist (from spec sheet)
- **Player:** idle, run, jump, slash, dash, parry.
- **Enemies:** grunt, runner, shield, tank, glitch, boss.
- **VFX:** slash arc, dash trail, parry spark, hit impact, teleport, death burst.
- **UI:** HP bar, wave, score, damage num, parry prompt, pause.
- **Backgrounds:** neon city, industrial sector, corrupted core.
- **Sounds:** slash, parry, hit, enemy alert, boss, ambient.

## Open questions to resolve in the plan
- 30 FPS (plan) vs 60 FPS (mockup dev notes) — pick one target.
- Structured 15-wave run vs true "endless" — v1 appears to be the 15-wave run with boss.
- Exact grade thresholds (C tier value) and score milestone mapping.
