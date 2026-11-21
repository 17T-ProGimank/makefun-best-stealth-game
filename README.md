# Midnight Archive — a stealth heist in three nights

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/17T-ProGimank/makefun-best-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/17T-ProGimank/makefun-best-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A top-down 2D stealth game for the [make.fun bounty "Make the best stealth game"](https://make.fun/bounty/best-stealth-game-20261121-1759). You are a thief infiltrating a night archive across three wings: collect the 3 archive seals on each level, then reach the green exit unseen.

## How to play

- **WASD / arrow keys** — move
- **Shift** — sneak (slow, quiet, harder to spot)
- **Space** — sprint (fast, but loud: nearby guards come to listen)
- **Enter** — start / next night, **R** — retry a night

Guards patrol waypoints with visible vision cones. Being seen fills the
detection meter — break line of sight and it drains again, so a near miss
raises the alarm without ending the run. Hiding in a shadow pool makes you
much harder to spot, and crates block both sight and feet. Get spotted
completely and the guards chase; if one lays hands on you, the night is over.

## The game

- 3 hand-built levels: The Reading Room, The Map Vault, The Director's Wing
- Guard patrols you can learn, vision cones clipped by walls, hearing radius
- Alarm states: calm / suspicious / alerted, with "!" and "?" marks over guards
- Footstep rings that show how loud you are, HUD with seals, detection meter and timer
- Win, level-clear and caught screens, restart, and generated WebAudio bleeps (no audio files)
- Pure static files under `game/` — no build step, no network requests, no libraries

Run it locally with `node serve.ts` and open http://localhost:8080.

## Referral

Built with make.fun — try it yourself: https://make.fun/r/m4psg5rh (referral code `m4psg5rh`).
