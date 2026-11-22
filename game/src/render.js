// Lantern Thief — canvas drawing. One job: turn the game state into a picture.
// The level reads at a glance: dark stone floor, slate walls, green hedge
// clumps you can hide in, warm lantern pools (danger), pale vision cones,
// a teal courier and red guards with lanterns. A soft night darkness sits over
// everything, lighter around the player and the lanterns, so the lighting
// itself shows what is safe.

import { TILE, COLS, ROWS, COLORS, CONE_RANGE, CONE_HALF_ANGLE } from './config.js';
import { GRID, lanternTiles, tileCenter } from './level.js';
import { castRay } from './vision.js';

function hash(col, row) {
  let h = (col * 374761393 + row * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  return ((h * 1274126177) >> 16) / 32767;
}

export function drawWorld(ctx, state) {
  const { player, guards, letters, time } = state;
  drawFloor(ctx);
  drawLanternPools(ctx);
  drawHedges(ctx);
  drawWalls(ctx);
  drawExit(ctx, state);
  drawLetters(ctx, letters);
  drawCones(ctx, guards);
  for (const g of guards) drawGuard(ctx, g);
  drawPlayer(ctx, player);
  drawNight(ctx, state);
  drawDetectionEye(ctx, guards);
}

function drawFloor(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = GRID[row][col];
      if (ch === '#') continue;
      const shade = hash(col, row);
      ctx.fillStyle = shade > 0.5 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      // A faint stone seam, so the floor reads as tiles.
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.strokeRect(col * TILE + 0.5, row * TILE + 0.5, TILE - 1, TILE - 1);
    }
  }
}

function drawLanternPools(ctx) {
  for (const lamp of lanternTiles()) {
    const c = tileCenter(lamp.col, lamp.row);
    const g = ctx.createRadialGradient(c.x, c.y, 6, c.x, c.y, 95);
    g.addColorStop(0, 'rgba(255, 205, 110, 0.30)');
    g.addColorStop(1, 'rgba(255, 205, 110, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - 95, c.y - 95, 190, 190);
    // The lantern post.
    ctx.fillStyle = '#5a4632';
    ctx.fillRect(c.x - 3, c.y - 3, 6, 6);
    ctx.fillStyle = COLORS.lanternCore;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHedges(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (GRID[row][col] !== 'H') continue;
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = COLORS.hedge;
      ctx.fillRect(x, y, TILE, TILE);
      // Leafy blobs, seeded per tile so they never move.
      ctx.fillStyle = COLORS.hedgeLight;
      const h = hash(col, row);
      ctx.beginPath();
      ctx.arc(x + 12 + h * 8, y + 14, 9, 0, Math.PI * 2);
      ctx.arc(x + 26, y + 24, 10, 0, Math.PI * 2);
      ctx.arc(x + 20, y + 10, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x, y + TILE - 4, TILE, 4);
    }
  }
}

function drawWalls(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (GRID[row][col] !== '#') continue;
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(x, y, TILE, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, y + TILE - 3, TILE, 3);
    }
  }
}

function drawExit(ctx, state) {
  const exit = state.exit;
  const pulse = 0.6 + 0.4 * Math.sin(state.time * 3);
  const g = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, 55);
  g.addColorStop(0, `rgba(88, 214, 141, ${0.35 * pulse})`);
  g.addColorStop(1, 'rgba(88, 214, 141, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(exit.x - 55, exit.y - 55, 110, 110);
  // The gate: two posts and an arch.
  ctx.fillStyle = '#2c7a4b';
  ctx.fillRect(exit.x - 16, exit.y - 16, 5, 32);
  ctx.fillRect(exit.x + 11, exit.y - 16, 5, 32);
  ctx.fillRect(exit.x - 16, exit.y - 16, 32, 5);
  ctx.fillStyle = COLORS.exit;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', exit.x, exit.y + 30);
}

function drawLetters(ctx, letters) {
  for (const letter of letters) {
    if (letter.taken) continue;
    const bob = Math.sin(letter.phase) * 2;
    ctx.fillStyle = COLORS.letter;
    ctx.fillRect(letter.x - 7, letter.y - 9 + bob, 14, 18);
    ctx.fillStyle = '#7d6608';
    ctx.fillRect(letter.x - 7, letter.y - 9 + bob, 14, 4);
    ctx.fillStyle = '#f9e79f';
    ctx.font = 'bold 11px serif';
    ctx.textAlign = 'center';
    ctx.fillText('✉', letter.x, letter.y + 5 + bob);
  }
}

function drawCones(ctx, guards) {
  // Each cone is a fan of rays clipped by walls and hedges, so the cone stops
  // where sight stops — the drawn cone and the detection rule always agree.
  for (const g of guards) {
    const color = g.state === 'chase' ? COLORS.coneAlarm : g.detection >= 40 ? COLORS.coneSuspicious : COLORS.cone;
    const rays = 28;
    const pts = [];
    for (let i = 0; i <= rays; i++) {
      const a = g.angle - CONE_HALF_ANGLE + (i / rays) * 2 * CONE_HALF_ANGLE;
      const d = castRay(g.x, g.y, a, CONE_RANGE);
      pts.push([g.x + Math.cos(a) * d, g.y + Math.sin(a) * d]);
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
    // The cone's edge lines, so its reach is unmistakable.
    ctx.strokeStyle = color.replace(/[\d.]+\)$/, '0.5)');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(pts[0][0], pts[0][1]);
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.stroke();
  }
}

function drawGuard(ctx, g) {
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(g.x, g.y + 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: a red cloak with a lantern.
  ctx.fillStyle = g.state === 'chase' ? '#e74c3c' : COLORS.guard;
  ctx.beginPath();
  ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guardDark;
  ctx.beginPath();
  ctx.arc(g.x, g.y, 7, 0, Math.PI * 2);
  ctx.fill();
  // Eyes look where the guard looks.
  const ex = g.x + Math.cos(g.angle) * 5;
  const ey = g.y + Math.sin(g.angle) * 5;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ex, ey, 3, 0, Math.PI * 2);
  ctx.fill();
  // The guard's own little lantern.
  ctx.fillStyle = COLORS.lanternCore;
  ctx.beginPath();
  ctx.arc(g.x + Math.cos(g.angle + 0.6) * 15, g.y + Math.sin(g.angle + 0.6) * 15, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // "!" when suspicious, "!!" when chasing.
  if (g.state === 'suspicious' || g.state === 'chase') {
    ctx.fillStyle = g.state === 'chase' ? '#ff5040' : '#ffd27a';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.state === 'chase' ? '!!' : '!', g.x, g.y - 20);
  }
}

function drawPlayer(ctx, p) {
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 9, 11, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cloak: a triangle pointing where the player faces.
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.face) * 15, p.y + Math.sin(p.face) * 15);
  ctx.lineTo(p.x + Math.cos(p.face + 2.5) * 11, p.y + Math.sin(p.face + 2.5) * 11);
  ctx.lineTo(p.x + Math.cos(p.face - 2.5) * 11, p.y + Math.sin(p.face - 2.5) * 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b3d39';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.face) * 3, p.y + Math.sin(p.face) * 3, 4, 0, Math.PI * 2);
  ctx.fill();
  // Sneaking: a small "shh" ring so the state is visible.
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(63, 210, 192, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Hidden in a hedge: draw leaves over the player.
  if (p.inHedge) {
    ctx.fillStyle = 'rgba(42, 107, 62, 0.85)';
    ctx.beginPath();
    ctx.arc(p.x - 5, p.y - 4, 7, 0, Math.PI * 2);
    ctx.arc(p.x + 6, p.y + 3, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNight(ctx, state) {
  // Night darkness, lighter around the player and each lantern, so light
  // itself shows what is safe. Kept mild: the level must stay readable.
  const p = state.player;
  const g = ctx.createRadialGradient(p.x, p.y, 60, p.x, p.y, 420);
  g.addColorStop(0, 'rgba(4, 8, 18, 0)');
  g.addColorStop(1, 'rgba(4, 8, 18, 0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
}

function drawDetectionEye(ctx, guards) {
  // The highest detection among guards, drawn as an eye above the most
  // suspicious guard — the player sees the danger coming.
  let worst = null;
  for (const g of guards) if (g.detection > 5 && (!worst || g.detection > worst.detection)) worst = g;
  if (!worst) return;
  const w = 34;
  const h = 7;
  const x = worst.x - w / 2;
  const y = worst.y - 34;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = worst.detection >= 100 ? '#ff5040' : worst.detection >= 40 ? '#ffb347' : '#ffd27a';
  ctx.fillRect(x, y, (w * worst.detection) / 100, h);
}
