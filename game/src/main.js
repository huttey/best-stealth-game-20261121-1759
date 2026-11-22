// Lantern Thief — the game loop and state machine. Modes: title, playing,
// caught (a short pause, then respawn or game over), win, gameover. The loop
// runs on requestAnimationFrame; a frozen state (a ?shot= scene) renders but
// never updates, so screenshots are deterministic.

import { VIEW_W, VIEW_H, START_LIVES, LETTER_SCORE, WIN_SCORE, CATCH_RANGE } from './config.js';
import { GUARD_PATROLS, playerStart, exitTile, letterTiles, tileCenter, validateLevel, lanternTiles, isWall } from './level.js';
import { makeGuard, updateGuard } from './guard.js';
import { makePlayer, updatePlayer, resetPlayer } from './player.js';
import { makeInput } from './input.js';
import { drawWorld } from './render.js';
import { ensureAudio, setMuted, isMuted, footstep, notice, alarm, pickup, caught as caughtSound, win as winSound } from './audio.js';
import { shotFromUrl, applyShot } from './shots.js';

validateLevel();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const input = makeInput();
const startPos = playerStart();
const exit = exitTile();
const lanterns = lanternTiles().map((t) => tileCenter(t.col, t.row));

const state = {
  mode: 'title',
  frozen: false,
  time: 0,
  lives: START_LIVES,
  score: 0,
  lettersTaken: 0,
  letters: letterTiles().map((t) => ({ ...tileCenter(t.col, t.row), taken: false, phase: Math.random() * 6 })),
  player: makePlayer(startPos),
  guards: GUARD_PATROLS.map((p) => makeGuard(p)),
  exit,
  lanterns,
  caughtTimer: 0,
  maxDetection: 0,
};

const el = (id) => document.getElementById(id);
const hud = { lives: el('lives'), letters: el('letters'), score: el('score'), time: el('time'), eye: el('eye'), eyeFill: el('eye-fill'), msg: el('msg') };
const overlays = { title: el('title'), win: el('win'), over: el('gameover') };

function showOverlay(which) {
  for (const k of Object.keys(overlays)) overlays[k].classList.toggle('hidden', k !== which);
  if (!which) for (const k of Object.keys(overlays)) overlays[k].classList.add('hidden');
}

function startGame() {
  ensureAudio();
  state.mode = 'playing';
  state.time = 0;
  state.lives = START_LIVES;
  state.score = 0;
  state.lettersTaken = 0;
  for (const l of state.letters) l.taken = false;
  resetPlayer(state.player, startPos);
  state.guards = GUARD_PATROLS.map((p) => makeGuard(p));
  showOverlay(null);
  setMsg('Reach the exit gate — unseen.');
}

function updateHud() {
  hud.lives.textContent = '♥'.repeat(state.lives) + '♡'.repeat(Math.max(0, START_LIVES - state.lives));
  hud.letters.textContent = `✉ ${state.lettersTaken}/3`;
  hud.score.textContent = `Score ${state.score}`;
  const m = Math.floor(state.time / 60);
  const s = Math.floor(state.time % 60);
  hud.time.textContent = `${m}:${String(s).padStart(2, '0')}`;
  const d = state.maxDetection;
  hud.eyeFill.style.width = `${d}%`;
  hud.eyeFill.style.background = d >= 100 ? '#ff5040' : d >= 40 ? '#ffb347' : '#ffd27a';
  hud.eye.style.opacity = d > 2 ? '1' : '0.35';
}

function setMsg(text) {
  hud.msg.textContent = text;
}

function update(dt) {
  if (state.mode === 'playing') {
    state.time += dt;
    const p = state.player;
    updatePlayer(p, dt, input, lanterns);
    if (p.stepped) { footstep(false); p.stepped = false; }

    // Letters.
    for (const letter of state.letters) {
      letter.phase += dt * 2;
      if (!letter.taken && Math.hypot(letter.x - p.x, letter.y - p.y) < 22) {
        letter.taken = true;
        state.lettersTaken++;
        state.score += LETTER_SCORE;
        pickup();
        setMsg('Letter stolen! The guards must never know.');
      }
    }

    // Guards.
    let worst = 0;
    let alarming = false;
    for (const g of state.guards) {
      const before = g.detection;
      const result = updateGuard(g, dt, p, lanterns, (x, y) => {
        // Walls block guards (hedges do not). Out of bounds counts as solid.
        const col = Math.floor(x / 40);
        const row = Math.floor(y / 40);
        return col < 0 || row < 0 || col >= 24 || row >= 16 || isWall(col, row);
      });
      if (g.stepped) {
        footstep(true, Math.hypot(g.x - p.x, g.y - p.y));
        g.stepped = false;
      }
      if (g.detection >= 40 && before < 40) { notice(); setMsg('A guard is suspicious — stay out of the cone!'); }
      if (g.detection >= 100 && before < 100) { alarm(); alarming = true; setMsg('SPOTTED! Break line of sight!'); }
      worst = Math.max(worst, g.detection);
      if (result === 'caught') {
        onCaught();
        return;
      }
    }
    state.maxDetection = worst;
    if (!alarming && worst < 5) {
      if (p.inHedge) setMsg('Hidden in the hedge. Wait for the patrol to pass.');
      else if (p.inLight) setMsg('You are in the lamplight — move to the dark.');
      else if (p.sneaking) setMsg('Sneaking. Slow, quiet, hard to spot.');
    }

    // Win: reach the exit gate.
    if (Math.hypot(exit.x - p.x, exit.y - p.y) < 26) {
      state.score += WIN_SCORE;
      state.mode = 'win';
      winSound();
      el('win-score').textContent = `Score ${state.score} · ${state.lettersTaken}/3 letters · ${Math.floor(state.time)}s`;
      showOverlay('win');
    }
  } else if (state.mode === 'caught') {
    state.caughtTimer -= dt;
    if (state.caughtTimer <= 0) {
      if (state.lives > 0) {
        resetPlayer(state.player, startPos);
        state.guards = GUARD_PATROLS.map((pp) => makeGuard(pp));
        state.mode = 'playing';
        setMsg('Caught! Back to the start — the patrols have reset.');
      } else {
        state.mode = 'gameover';
        el('over-score').textContent = `Score ${state.score} · ${state.lettersTaken}/3 letters`;
        showOverlay('over');
      }
    }
  }
}

function onCaught() {
  state.lives--;
  caughtSound();
  state.mode = 'caught';
  state.caughtTimer = 1.4;
  state.maxDetection = 0;
  setMsg(state.lives > 0 ? `Caught! ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left.` : 'Caught! The night is over.');
  updateHud();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!state.frozen) {
    if (input.restart && (state.mode === 'playing' || state.mode === 'win' || state.mode === 'gameover')) { input.restart = false; startGame(); }
    if (input.mute) { input.mute = false; setMuted(!isMuted()); el('mute').textContent = isMuted() ? 'Sound: off (M)' : 'Sound: on (M)'; }
    if (input.confirm && state.mode === 'title') { input.confirm = false; startGame(); }
    update(dt);
  }
  drawWorld(ctx, state);
  if (state.mode !== 'title') updateHud();
  requestAnimationFrame(loop);
}

// Buttons.
el('start-btn').addEventListener('click', startGame);
el('again-btn').addEventListener('click', startGame);
el('retry-btn').addEventListener('click', startGame);
el('mute').addEventListener('click', () => {
  ensureAudio();
  setMuted(!isMuted());
  el('mute').textContent = isMuted() ? 'Sound: off (M)' : 'Sound: on (M)';
});

// A ?shot= scene stages a fixed moment for the screenshots and freezes it.
const shot = shotFromUrl();
if (shot) {
  applyShot(state, shot);
  if (shot === 'exit') {
    el('win-score').textContent = `Score ${state.score} · ${state.lettersTaken}/3 letters · ${Math.floor(state.time)}s`;
    showOverlay('win');
  } else if (shot !== 'start') {
    showOverlay(null);
  }
  updateHud();
} else {
  showOverlay('title');
}

requestAnimationFrame(loop);

// Surface any load error on the canvas itself, so a broken build is visible
// in a screenshot instead of silently blank.
window.addEventListener('error', (e) => {
  ctx.fillStyle = '#300';
  ctx.fillRect(0, 0, VIEW_W, 60);
  ctx.fillStyle = '#f88';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Error: ${e.message}`, 12, 34);
});
