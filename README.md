# Crystal Depths — 2D Pixel-Art Platformer

A complete browser 2D platformer in SNES pixel-art style: explore crystal caverns,
collect gems, smash obstacles with your pickaxe, fight creepers, zombies, skeletons
and endermen, and escape through the portal.

**Play it instantly:** open `2d-game.html` in any modern browser — no build step,
no dependencies, no server needed. All sprites and audio are embedded in the single file.

## Features

- **3 hand-designed levels** with increasing difficulty, unique palettes, platforms,
  pits and destructible obstacles
- **5 enemy types** with distinct behaviors: crawler, creeper, zombie, skeleton, enderman
- **Progression system:** double jump, upgraded pickaxe and shield carry over between levels
- **Full game flow:** main menu, tutorial, pause, health, game over, restart, level transitions
- **Procedural audio (Web Audio API):** synthesized background music + SFX for jumping,
  gem pickup, pickaxe hits, damage, enemy defeats, portal and UI
- **Game feel:** particles, screen shake, hit-stop, impact flashes, smooth scene transitions
- **Controls:** keyboard (arrows/WASD + space) and touch controls for mobile
- **Sound toggle** button

## Tech stack

- HTML5 Canvas + vanilla JavaScript (single self-contained file)
- Web Audio API for all music and sound effects (100% procedural, zero audio files)
- Pixel-art sprites embedded as PNG data URIs
- No frameworks, no build tools, no external assets
  (only Google Fonts via CDN, with system-font fallback)

## Controls

| Action | Keyboard | Mobile |
|---|---|---|
| Move | ← → / A D | On-screen buttons |
| Jump / double jump | Space / W / ↑ | Jump button |
| Attack (pickaxe) | J / X | Attack button |
| Pause | Esc / P | Pause button |

## Development notes

Built with AI assistance (Muse): game design, code, pixel-art sprites and audio
were created iteratively in a conversational workflow, then refined through
playtesting-style iterations (sprite fixes, balance, game-feel polish).

## License

MIT — free to use, modify and share.

## Crystal Depths FX — physics rebuild

The `crystal-depths-fx` branch contains an independent rebuild of this game as a
modular Vite project: the same 3 levels, gems, pickaxe, mobs and portal, plus
four physics simulations layered on top of the 2D gameplay — Navier–Stokes
smoke/steam (Stable Fluids + vorticity confinement), SPH slime with cohesion and
wall adhesion (throw with **S**, slows enemies, enables slime wall-jumps),
Verlet soft-body slime enemies, and diffusion-based colored lighting + bloom.
Each simulation can be toggled in the in-game «ФИЗИКА» menu (F2), metrics on F3.
