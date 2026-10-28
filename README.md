# Pip's Leap

An original side-scrolling platformer that runs entirely in the browser: two levels, chiptune music and no dependencies.

## Play

Open `index.html` in any modern browser by double-clicking it. You don't need a server or an internet connection.

| Key | Action |
| --- | --- |
| ← → or A D | Move |
| Space, ↑ or W | Jump (hold to jump higher) |
| Shift | Run |
| P or Esc | Pause |
| M | Mute or unmute |
| Enter | Start |

## Levels

1. **Meadow**: grassy hills, pillars, brick platforms and walking grumps.
2. **Crystal Caverns**: moving platforms, spikes and hopping slimes.

Grab a sun berry from a `?` block to grow big. Big Pip can break bricks and survives one hit.

## Code

- `js/levels.js`: level layouts, built from a tile grid
- `js/entities.js`: Pip, enemies, power-ups and moving platforms
- `js/physics.js`: tile collision
- `js/render.js`: all drawing, done in code with no image files
- `js/audio.js`: Web Audio chiptune sequencer with original songs and sound effects
- `js/main.js`: game states and the main loop
