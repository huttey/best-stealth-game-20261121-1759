// Lantern Thief — the guards. Each guard walks a patrol lane back and forth,
// pauses at each end, and watches its cone. States:
//   patrol     walking the lane, detection draining
//   suspicious detection over the threshold: stops, turns to stare
//   chase      detection full: runs at the player
//   return     lost the player: walks back to the nearest waypoint, then patrols
// A guard that loses sight of the player for ALARM_HOLD seconds gives up —
// that is the player's chance to recover.

import { GUARD_WALK, GUARD_CHASE, GUARD_PAUSE, DETECT_SUSPICIOUS, ALARM_HOLD, CHASE_MAX, CATCH_RANGE } from './config.js';
import { guardSeesPlayer, detectionRate, inLanternLight, inHedgeAt } from './vision.js';
import { tileCenter } from './level.js';

export function makeGuard(waypoints) {
  const pts = waypoints.map(([col, row]) => tileCenter(col, row));
  return {
    waypoints: pts,
    leg: 0, // index of the waypoint being walked toward
    dir: 1, // +1 forward along the lane, -1 back
    x: pts[0].x,
    y: pts[0].y,
    angle: 0,
    state: 'patrol',
    pause: 0,
    detection: 0,
    chaseTime: 0,
    lostTime: 0,
    stepPhase: 0,
    stepped: false, // set when a footstep sound should play
  };
}

function angleTo(x0, y0, x1, y1) {
  return Math.atan2(y1 - y0, x1 - x0);
}

function turnToward(guard, target, rate, dt) {
  let diff = target - guard.angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
  guard.angle += step;
}

// Move with wall collision: try x then y, so the guard slides along walls.
function moveWithWalls(guard, dx, dy, solidAt) {
  const r = 14;
  if (dx !== 0) {
    const nx = guard.x + dx;
    if (!solidAt(nx + Math.sign(dx) * r, guard.y - r + 2) && !solidAt(nx + Math.sign(dx) * r, guard.y + r - 2)) guard.x = nx;
  }
  if (dy !== 0) {
    const ny = guard.y + dy;
    if (!solidAt(guard.x - r + 2, ny + Math.sign(dy) * r) && !solidAt(guard.x + r - 2, ny + Math.sign(dy) * r)) guard.y = ny;
  }
}

export function updateGuard(guard, dt, player, lanterns, solidAt) {
  const sees = guardSeesPlayer(guard, player);
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);

  // Detection meter: fills while seen, drains while hidden.
  if (sees) {
    const rate = detectionRate(dist, inLanternLight(player.x, player.y, lanterns), player.sneaking);
    guard.detection = Math.min(100, guard.detection + rate * dt);
    guard.lostTime = 0;
  } else {
    guard.detection = Math.max(0, guard.detection - 32 * dt);
  }

  if (guard.state === 'patrol') {
    if (guard.detection >= 100) {
      guard.state = 'chase';
      guard.chaseTime = 0;
      guard.lostTime = 0;
    } else if (guard.detection >= DETECT_SUSPICIOUS) {
      guard.state = 'suspicious';
    } else {
      patrolStep(guard, dt, solidAt);
    }
  } else if (guard.state === 'suspicious') {
    // Stop and stare at the player. If the meter drains, go back to patrol.
    turnToward(guard, angleTo(guard.x, guard.y, player.x, player.y), 3.2, dt);
    if (guard.detection >= 100) {
      guard.state = 'chase';
      guard.chaseTime = 0;
      guard.lostTime = 0;
    } else if (guard.detection <= 5) {
      guard.state = 'patrol';
    }
  } else if (guard.state === 'chase') {
    guard.chaseTime += dt;
    if (!sees) guard.lostTime += dt;
    else guard.lostTime = 0;
    turnToward(guard, angleTo(guard.x, guard.y, player.x, player.y), 6, dt);
    const step = GUARD_CHASE * dt;
    moveWithWalls(guard, Math.cos(guard.angle) * step, Math.sin(guard.angle) * step, solidAt);
    guard.stepPhase += dt * 3.2;
    if (guard.stepPhase > 1) { guard.stepPhase -= 1; guard.stepped = true; }
    const caught = dist <= CATCH_RANGE;
    if (caught || guard.chaseTime >= CHASE_MAX || guard.lostTime >= ALARM_HOLD) {
      if (caught) return 'caught';
      guard.state = 'return';
      guard.detection = 45;
    }
  } else if (guard.state === 'return') {
    // Walk back to the nearest waypoint, then resume the patrol.
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < guard.waypoints.length; i++) {
      const d = Math.hypot(guard.waypoints[i].x - guard.x, guard.waypoints[i].y - guard.y);
      if (d < bestD) { bestD = d; best = i; }
    }
    const target = guard.waypoints[best];
    const d = Math.hypot(target.x - guard.x, target.y - guard.y);
    if (d < 6) {
      guard.leg = best;
      guard.dir = best === guard.waypoints.length - 1 ? -1 : 1;
      guard.state = 'patrol';
    } else {
      turnToward(guard, angleTo(guard.x, guard.y, target.x, target.y), 4, dt);
      const step = GUARD_WALK * dt;
      moveWithWalls(guard, Math.cos(guard.angle) * step, Math.sin(guard.angle) * step, solidAt);
    }
    if (guard.detection >= 100) { guard.state = 'chase'; guard.chaseTime = 0; guard.lostTime = 0; }
  }
  return null;
}

function patrolStep(guard, dt, solidAt) {
  if (guard.pause > 0) {
    guard.pause -= dt;
    return;
  }
  const target = guard.waypoints[guard.leg];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) {
    guard.pause = GUARD_PAUSE;
    guard.leg += guard.dir;
    if (guard.leg >= guard.waypoints.length) { guard.leg = guard.waypoints.length - 2; guard.dir = -1; }
    if (guard.leg < 0) { guard.leg = 1; guard.dir = 1; }
    return;
  }
  const want = Math.atan2(dy, dx);
  turnToward(guard, want, 5, dt);
  const step = GUARD_WALK * dt;
  moveWithWalls(guard, Math.cos(guard.angle) * step, Math.sin(guard.angle) * step, solidAt);
  guard.stepPhase += dt * 2.2;
  if (guard.stepPhase > 1) { guard.stepPhase -= 1; guard.stepped = true; }
}
