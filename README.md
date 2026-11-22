# Lantern Thief — a stealth game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/huttey/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/huttey/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Lantern Thief** is a complete top-down stealth game that plays offline in a
desktop browser from its own files — no network, no build step, no library.
You are a courier slipping through a moonlit walled garden at night. Guards
patrol with lantern-lit vision cones. Hedges are cover, lamplight is danger.
Reach the exit gate unseen — and steal the three sealed letters on the way
if you dare.

## How to play

- **Move** with WASD or the arrow keys. **Shift** to sneak — slower, quieter,
  and harder to spot.
- **Vision cones** show what each guard can see. Walls block their sight;
  hedges hide you unless a guard is right next to you.
- **Lamplight** makes you easier to spot. Darkness is your friend.
- If a guard's **eye meter** fills, the alarm sounds and the guard chases
  you. Break line of sight and stay hidden until the guard gives up and
  goes back to patrol.
- Get caught three times and the night is over. Reach the **exit gate** to win.
- **R** restarts. **M** mutes the sound.

## Files

- `game/index.html` — the page and canvas
- `game/src/config.js` — tuning: speeds, cone, detection rates, colours
- `game/src/level.js` — the garden: walls, hedges, lanterns, patrols, letters
- `game/src/vision.js` — line of sight and vision-cone maths (pure, testable)
- `game/src/guard.js` — guard patrol, suspicion, chase and return
- `game/src/player.js` — movement, sneaking and wall collision
- `game/src/audio.js` — synthesised footsteps, alerts and stingers (WebAudio)
- `game/src/render.js` — canvas drawing: floor, walls, hedges, light, cones
- `game/src/shots.js` — deterministic scenes for the screenshots
- `game/src/main.js` — game loop and state machine
- `main.ts` — hands the game in (copies `game/` and `screenshots/`, writes
  `dossier.json`)
- `serve.ts` — tiny local server: `node serve.ts`, then open
  http://localhost:8080

## Entry

Built for the make.fun bounty "Make the best stealth game"
(best-stealth-game-20261121-1759). My referral link:
https://make.fun/r/rsq9xkyh
