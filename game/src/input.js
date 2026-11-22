// Lantern Thief — keyboard input. WASD or arrows to move, Shift to sneak,
// R to restart, M to mute, Enter/Space to start. One object, read by the loop.

export function makeInput() {
  const input = { left: false, right: false, up: false, down: false, sneak: false };
  const keys = {};
  const map = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
  };
  window.addEventListener('keydown', (e) => {
    if (map[e.code]) { input[map[e.code]] = true; keys[e.code] = true; e.preventDefault(); }
    if (e.code === 'KeyR') input.restart = true;
    if (e.code === 'KeyM') input.mute = true;
    if (e.code === 'Enter' || e.code === 'Space') input.confirm = true;
  });
  window.addEventListener('keyup', (e) => {
    if (map[e.code]) { input[map[e.code]] = false; keys[e.code] = false; }
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(input)) input[k] = false;
  });
  return input;
}
