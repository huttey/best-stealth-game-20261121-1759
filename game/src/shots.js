// Lantern Thief — deterministic scenes for the screenshots. The URL query
// ?shot=start|play|chase|exit&seed=1 stages a fixed moment of the game, so the
// screenshots are real renders of the game's own code and repeatable. The staged
// state is frozen: the loop renders it but never updates it, so the shot never
// changes while the browser takes it.

import { tileCenter } from './level.js';

export function shotFromUrl() {
  const q = new URLSearchParams(window.location.search);
  return q.get('shot') || null;
}

// Stage one of the four screenshot scenes. `state` is the live game state;
// this rewrites the parts the scene needs and freezes it.
export function applyShot(state, shot) {
  const at = (col, row) => tileCenter(col, row);
  state.frozen = true;
  if (shot === 'start') {
    // Title screen over the garden: guards mid-patrol, player at the start.
    state.mode = 'title';
    state.guards[0].x = at(11, 2).x; state.guards[0].y = at(11, 2).y; state.guards[0].angle = 0;
    state.guards[1].x = at(11, 9).x; state.guards[1].y = at(11, 9).y; state.guards[1].angle = Math.PI;
    state.guards[2].x = at(18, 13).x; state.guards[2].y = at(18, 13).y; state.guards[2].angle = 0;
    return;
  }
  if (shot === 'play') {
    // Mid-game: the courier sneaks behind a hedge while a guard's cone sweeps
    // past, its eye meter half full — the tense quiet moment.
    state.mode = 'playing';
    state.player.x = at(7, 9).x; state.player.y = at(7, 9).y;
    state.player.sneaking = true;
    state.player.face = Math.PI;
    const g = state.guards[1];
    g.x = at(11, 9).x; g.y = at(11, 9).y; g.angle = Math.PI; g.state = 'suspicious'; g.detection = 55;
    state.time = 47;
    return;
  }
  if (shot === 'chase') {
    // The near miss: a guard has spotted the courier by the top lane and gives
    // chase, cone red, "!!" over its head, the courier running for the hedge.
    state.mode = 'playing';
    state.player.x = at(17, 2).x; state.player.y = at(17, 2).y;
    state.player.face = 0;
    const g = state.guards[0];
    g.x = at(14, 2).x; g.y = at(14, 2).y; g.angle = 0; g.state = 'chase'; g.detection = 100;
    state.time = 83;
    state.score = 100;
    return;
  }
  if (shot === 'exit') {
    // The win: the courier stands at the exit gate, all three letters stolen.
    state.mode = 'win';
    state.player.x = state.exit.x; state.player.y = state.exit.y;
    state.player.face = -Math.PI / 2;
    for (const l of state.letters) l.taken = true;
    state.lettersTaken = 3;
    state.score = 800;
    state.time = 96;
    return;
  }
}
