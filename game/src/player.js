// Lantern Thief — the player. WASD or arrows to move, Shift to sneak. The
// player slides along walls (axis-separated collision) and can hide inside
// hedges. Sneaking is slower and quieter, and halves how fast guards spot you.

import { PLAYER_WALK, PLAYER_SNEAK, PLAYER_RADIUS } from './config.js';
import { inHedgeAt, inLanternLight, inWallAt } from './vision.js';

export function makePlayer(start) {
  return {
    x: start.x,
    y: start.y,
    vx: 0,
    vy: 0,
    sneaking: false,
    moving: false,
    inHedge: false,
    inLight: false,
    stepPhase: 0,
    stepped: false,
    face: 0, // facing angle, for drawing the cloak
  };
}

export function updatePlayer(player, dt, input, lanterns) {
  let ax = 0;
  let ay = 0;
  if (input.left) ax -= 1;
  if (input.right) ax += 1;
  if (input.up) ay -= 1;
  if (input.down) ay += 1;
  const len = Math.hypot(ax, ay);
  player.moving = len > 0;
  player.sneaking = input.sneak && len > 0;
  if (len > 0) {
    ax /= len;
    ay /= len;
    const speed = player.sneaking ? PLAYER_SNEAK : PLAYER_WALK;
    const step = speed * dt;
    const r = PLAYER_RADIUS;
    // Axis-separated wall collision: slide along walls instead of sticking.
    const nx = player.x + ax * step;
    if (!inWallAt(nx + Math.sign(ax) * r, player.y - r + 2) && !inWallAt(nx + Math.sign(ax) * r, player.y + r - 2)) player.x = nx;
    const ny = player.y + ay * step;
    if (!inWallAt(player.x - r + 2, ny + Math.sign(ay) * r) && !inWallAt(player.x + r - 2, ny + Math.sign(ay) * r)) player.y = ny;
    player.face = Math.atan2(ay, ax);
    player.stepPhase += dt * (player.sneaking ? 3 : 5.5);
    if (player.stepPhase > 1) { player.stepPhase -= 1; player.stepped = true; }
  }
  player.inHedge = inHedgeAt(player.x, player.y);
  player.inLight = inLanternLight(player.x, player.y, lanterns);
}

export function resetPlayer(player, start) {
  player.x = start.x;
  player.y = start.y;
  player.sneaking = false;
  player.moving = false;
  player.inHedge = false;
  player.inLight = false;
  player.face = 0;
}
