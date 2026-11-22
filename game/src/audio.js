// Lantern Thief — sound, synthesised with WebAudio. No audio files, no network:
// every sound is an oscillator or a short burst of filtered noise. The AudioContext
// starts on the first user gesture (the Start button), so browsers allow it.
// Guard footsteps get louder as a guard gets closer — that is how you hear one
// coming around a corner before you see its cone.

let ctx = null;
let muted = false;
let noiseBuf = null;

export function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const len = ctx.sampleRate * 0.25;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
}

export function setMuted(m) {
  muted = m;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, gain, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur, gain, freq) {
  if (!ctx || muted || !noiseBuf) return;
  const t0 = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

// A soft footstep. Guard steps are lower and louder, and their gain falls with
// distance so you hear a guard approaching.
export function footstep(isGuard, dist = 0) {
  if (isGuard) {
    const gain = Math.max(0, 0.16 * (1 - dist / 420));
    if (gain <= 0.01) return;
    noise(0.09, gain, 320);
  } else {
    noise(0.05, 0.045, 900);
  }
}

// A short rising ping when a guard starts to notice you.
export function notice() {
  tone(620, 0.12, 'sine', 0.08, 0, 880);
}

// The alarm: two sharp notes when a guard spots you fully.
export function alarm() {
  tone(440, 0.16, 'square', 0.06);
  tone(587, 0.22, 'square', 0.06, 0.16);
}

// A letter picked up: a small pleasant chime.
export function pickup() {
  tone(880, 0.12, 'sine', 0.09);
  tone(1318, 0.18, 'sine', 0.07, 0.09);
}

// Caught: a low buzz.
export function caught() {
  tone(160, 0.5, 'sawtooth', 0.09, 0, 70);
}

// Won: a short rising arpeggio.
export function win() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.08, i * 0.11));
}
