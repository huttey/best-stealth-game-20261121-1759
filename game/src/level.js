// Lantern Thief — the garden: walls, hedges, lanterns, patrols, letters.
// Legend: '#' wall, '.' floor, 'H' hedge (cover), 'L' lantern (light pool),
// 'P' player start, 'E' exit gate, 'C' a sealed letter to steal.
// Three horizontal bands, split by wall rows with doorways; one guard patrols
// each band along a clear lane, so the player learns the patrols and times
// the crossings. Hedges break sight lines; lanterns mark the risky open ground.

export const GRID = [
  '########################',
  '#....H.....L.H.......E.#',
  '#...............C......#',
  '#..H....H....H....H....#',
  '#..H....H....H....H....#',
  '#.......H....H.........#',
  '####.#######.#####.#####',
  '#....H.......H.........#',
  '#....H...L...H....H....#',
  '#......C...............#',
  '#..H....H....H....H....#',
  '####.#######.#####.#####',
  '#....H.......H......C..#',
  '#....H.....L.H.........#',
  '#P...H.......H.........#',
  '########################',
];

export const TILE_CHARS = { wall: '#', floor: '.', hedge: 'H', lantern: 'L', player: 'P', exit: 'E', letter: 'C' };

// Guard patrols: waypoints in tile coords [col, row]. Each guard walks its lane
// back and forth, pausing at each end.
export const GUARD_PATROLS = [
  [[2, 2], [21, 2]], // top band: the long lane past the letter and the exit
  [[2, 9], [21, 9]], // middle band: the long lane past the middle letter
  [[14, 13], [21, 13]], // bottom band, right half: the player starts safe at left
];

// Tile helpers. x, y are pixel coords; col, row are tile coords.
export function tileAt(col, row) {
  if (row < 0 || row >= GRID.length || col < 0 || col >= GRID[0].length) return '#';
  return GRID[row][col];
}

export function isWall(col, row) {
  return tileAt(col, row) === '#';
}

export function isHedge(col, row) {
  return tileAt(col, row) === 'H';
}

export function isSolid(col, row) {
  // Walls block movement; hedges do not (you can hide inside one).
  return isWall(col, row);
}

export function tileCenter(col, row) {
  return { x: (col + 0.5) * 40, y: (row + 0.5) * 40 };
}

export function findChar(ch) {
  const out = [];
  for (let row = 0; row < GRID.length; row++) {
    for (let col = 0; col < GRID[row].length; col++) {
      if (GRID[row][col] === ch) out.push({ col, row });
    }
  }
  return out;
}

export function lanternTiles() {
  return findChar('L');
}

export function letterTiles() {
  return findChar('C');
}

export function playerStart() {
  const [p] = findChar('P');
  return tileCenter(p.col, p.row);
}

export function exitTile() {
  const [e] = findChar('E');
  return { col: e.col, row: e.row, ...tileCenter(e.col, e.row) };
}

// Checks the level is well formed. Throws on the first problem. Runs in Node
// (node -e) and in the browser console alike.
export function validateLevel() {
  const width = GRID[0].length;
  for (let r = 0; r < GRID.length; r++) {
    if (GRID[r].length !== width) throw new Error(`row ${r} is ${GRID[r].length} wide, not ${width}`);
  }
  for (let c = 0; c < width; c++) {
    if (GRID[0][c] !== '#' || GRID[GRID.length - 1][c] !== '#') throw new Error('top/bottom border must be wall');
  }
  for (let r = 0; r < GRID.length; r++) {
    if (GRID[r][0] !== '#' || GRID[r][width - 1] !== '#') throw new Error(`row ${r} border must be wall`);
  }
  if (findChar('P').length !== 1) throw new Error('level needs exactly one player start');
  if (findChar('E').length !== 1) throw new Error('level needs exactly one exit');
  if (findChar('C').length < 1) throw new Error('level needs at least one letter');
  for (const patrol of GUARD_PATROLS) {
    for (const [col, row] of patrol) {
      if (isSolid(col, row) || isHedge(col, row)) throw new Error(`guard waypoint (${col},${row}) is not open floor`);
    }
  }
  for (const { col, row } of letterTiles()) {
    if (isSolid(col, row) || isHedge(col, row)) throw new Error(`letter (${col},${row}) is not open floor`);
  }
  return true;
}
