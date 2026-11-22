// Lantern Thief — tuning: every number the game balances on lives here, so a
// balance change is one edit in one file.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

// Movement (pixels per second).
export const PLAYER_WALK = 135;
export const PLAYER_SNEAK = 68;
export const GUARD_WALK = 58;
export const GUARD_CHASE = 118;
export const GUARD_PAUSE = 1.2; // seconds a guard waits at each waypoint

// Vision cone.
export const CONE_RANGE = 205;
export const CONE_HALF_ANGLE = 0.66; // radians, about 38 degrees each side
export const HEDGE_SPOT_RANGE = 55; // a guard this close sees through a hedge

// Detection meter (0..100). Fills while the player is seen, drains while hidden.
export const DETECT_BASE = 58; // per second at point-blank, in the open, walking
export const DETECT_LIGHT_MULT = 1.6; // standing in lamplight
export const DETECT_SNEAK_MULT = 0.5; // sneaking halves it
export const DETECT_DRAIN = 32; // per second while unseen
export const DETECT_SUSPICIOUS = 40; // above this the guard turns to look ("!")
export const ALARM_HOLD = 2.5; // seconds unseen before a chasing guard gives up
export const CHASE_MAX = 6; // seconds a chase lasts at most

export const PLAYER_RADIUS = 13;
export const GUARD_RADIUS = 14;
export const CATCH_RANGE = 20; // guard this close to the player catches them
export const START_LIVES = 3;
export const LETTER_SCORE = 100;
export const WIN_SCORE = 500;

// Colours.
export const COLORS = {
  floorA: '#232c3d',
  floorB: '#202835',
  wall: '#3a4356',
  wallTop: '#4d5872',
  hedge: '#1d4a2c',
  hedgeLight: '#2a6b3e',
  lanternGlow: 'rgba(255, 190, 90, 0.20)',
  lanternCore: '#ffd27a',
  cone: 'rgba(255, 220, 110, 0.16)',
  coneSuspicious: 'rgba(255, 200, 80, 0.30)',
  coneAlarm: 'rgba(255, 70, 60, 0.34)',
  player: '#3fd2c0',
  playerCloak: '#2a9d8f',
  guard: '#c0392b',
  guardDark: '#7b241c',
  exit: '#58d68d',
  exitGlow: 'rgba(88, 214, 141, 0.25)',
  letter: '#f4d03f',
};
