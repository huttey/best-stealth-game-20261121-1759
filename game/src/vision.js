// Lantern Thief — vision maths: line of sight and vision cones. Pure functions
// with no DOM or canvas use, so Node can test them (node --test or a small script).
// Walls block sight. Hedges block sight too, unless the guard is right next to
// the player — a guard that close hears and sees through the leaves.

import { CONE_RANGE, CONE_HALF_ANGLE, HEDGE_SPOT_RANGE } from './config.js';
import { isWall, isHedge, tileAt } from './level.js';

const TILE = 40;

// Sample points along the segment from (x0,y0) to (x1,y1). True when no wall
// tile and no hedge tile lies on it. The tile the target stands in never blocks:
// standing inside a hedge hides you, but a hedge between you and the guard does
// not count the hedge you are in.
export function hasLineOfSight(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  const targetCol = Math.floor(x1 / TILE);
  const targetRow = Math.floor(y1 / TILE);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    if (col === targetCol && row === targetRow) continue;
    const ch = tileAt(col, row);
    if (ch === '#' || ch === 'H') return false;
  }
  return true;
}

// Is the point (px,py) inside the guard's cone? The guard stands at (gx,gy)
// and faces `angle` (radians). True when within range and within the half-angle.
export function inCone(gx, gy, angle, px, py, range = CONE_RANGE, halfAngle = CONE_HALF_ANGLE) {
  const dx = px - gx;
  const dy = py - gy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return Math.abs(diff) <= halfAngle;
}

// Can this guard see the player right now? Walls always block. A player inside
// a hedge is hidden unless the guard is very close.
export function guardSeesPlayer(guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (!inCone(guard.x, guard.y, guard.angle, player.x, player.y)) return false;
  if (player.inHedge && dist > HEDGE_SPOT_RANGE) return false;
  if (!hasLineOfSight(guard.x, guard.y, player.x, player.y)) return false;
  return true;
}

// How fast the detection meter fills (per second) while the guard sees the
// player: closer is faster, lamplight is faster, sneaking is slower.
export function detectionRate(dist, inLight, sneaking, base = 58) {
  const closeness = Math.max(0.35, 1 - dist / (CONE_RANGE * 1.4));
  let rate = base * (0.5 + closeness);
  if (inLight) rate *= 1.6;
  if (sneaking) rate *= 0.5;
  return rate;
}

// Cast a ray from (x0,y0) along `angle` until it hits a wall or hedge tile or
// travels maxDist. Returns the distance travelled. Walls and hedges block
// sight the same way hasLineOfSight does, so the drawn cone and the detection
// rule always agree.
export function castRay(x0, y0, angle, maxDist) {
  const step = 4;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let d = step; d <= maxDist; d += step) {
    const x = x0 + dx * d;
    const y = y0 + dy * d;
    const ch = tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
    if (ch === '#' || ch === 'H') return d;
  }
  return maxDist;
}
export function inLanternLight(x, y, lanterns) {
  for (const lamp of lanterns) {
    const dx = x - lamp.x;
    const dy = y - lamp.y;
    if (dx * dx + dy * dy < 95 * 95) return true;
  }
  return false;
}

// Is the point (x,y) standing inside a hedge tile?
export function inHedgeAt(x, y) {
  return isHedge(Math.floor(x / TILE), Math.floor(y / TILE));
}

// Is the point (x,y) inside a wall tile?
export function inWallAt(x, y) {
  return isWall(Math.floor(x / TILE), Math.floor(y / TILE));
}
