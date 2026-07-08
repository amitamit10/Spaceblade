# Spaceblade Sprite Sheet Prompts

Use these prompts with ChatGPT image generation. Attach the matching SVG guide
from `docs/art/templates/` and, if useful, the current concept images from
`imeges/`.

## Global Prompt Rules

Always include these requirements:

- transparent background
- single sprite sheet, not separate images
- exact grid layout from the attached template
- pixel art, crisp nearest-neighbor look
- cyberpunk sci-fi style
- character faces right
- keep feet/base aligned across every row
- do not draw outside the assigned cells
- no text, no labels, no UI, no background scenery

## Base Prompt

```text
Create a transparent-background pixel art sprite sheet for the game Spaceblade.
Use the attached template exactly as the grid and row layout reference.
The character must face right in every frame.
Keep the feet/base aligned consistently across all rows.
Use crisp retro pixel art with strong silhouette readability at gameplay scale.
Do not add any background, text, labels, or effects outside the sprite cells.
Return one complete sprite sheet PNG only.
```

## Player Prompt

```text
Create a cyberpunk swordsman sprite sheet for Spaceblade.
White spiked hair, dark navy-black tactical clothing, glowing cyan circuitry lines,
masked lower face, bright cyan energy sword.
Mood: elite futuristic duelist, agile, sharp, disciplined.
Rows must read as: idle, walk, slash, charge, heavy, dodge, parry, hurt, dead.
Keep slash/heavy/parry frames especially readable from far away.
```

## Grunt Prompt

```text
Create a small aggressive red cyberpunk melee enemy sprite sheet.
Cheap mass-produced threat, red armor glow, simple but dangerous silhouette.
Rows: walk, windup, attack, recover, hurt, dead.
The attack should feel straightforward and brutal.
```

## Runner Prompt

```text
Create a lean fast striker sprite sheet for a cyberpunk enemy.
Dark armor with hot magenta highlights, lightweight assassin silhouette, very fast attack read.
Rows: walk, windup, attack, recover, hurt, dead.
The walk and attack should feel speed-focused and low to the ground.
```

## Shield Prompt

```text
Create a heavy defensive riot-shield enemy sprite sheet.
Bulky dark armor with cyan shield energy, clear protected front silhouette, slow powerful motion.
Rows: walk, windup, attack, recover, hurt, dead.
The shield must stay visually dominant and readable in every row.
```

## Tank Prompt

```text
Create a massive armored bruiser sprite sheet.
Dark red-black industrial armor, huge fists, heavy mechanical weight, intimidating bulk.
Rows: walk, windup, attack, recover, hurt, dead.
Every motion should feel slow, heavy, and forceful.
```

## Glitch Prompt

```text
Create an eerie unstable cyber-ninja sprite sheet.
Deep purple-black body, bright violet or magenta energy lines, distorted alien-tech silhouette.
Rows: walk, windup, attack, recover, hurt, dead.
The motion should feel unnatural, sharp, and slightly corrupted.
```

## Boss Prompt

```text
Create a dominant final boss sprite sheet for Spaceblade.
Large crimson-black cyber-samurai warlord, glowing red energy blades, powerful armor silhouette,
visually superior to every other enemy.
Rows: walk, windup, attack, recover, hurt, dead, specialAttack.
The special attack row should look unmistakably more threatening than the normal attack.
```
