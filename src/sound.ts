// All sounds are synthesised with the Web Audio API: no audio files, nothing to download.
// Browsers only allow audio after a tap or key press, so unlock() is called from the welcome screen's start gate.

const KEY = 'life-grid-sound';
let ctx: AudioContext | null = null;
let master: GainNode;
let hiss: AudioBuffer;
let on = (() => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } })();

export const soundOn = () => on;
export function setSound(v: boolean) {
  on = v;
  try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch { /* private mode */ }
  if (v) unlock();
}

/** Create or wake the audio engine. Call from a tap or key press. */
export function unlock() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain(); master.gain.value = 0.8;
      master.connect(comp).connect(ctx.destination);
      hiss = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = hiss.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* no audio available */ }
}
const ready = () => on && !!ctx && ctx.state === 'running';

function tone(f: number, t: number, d: number, o: { type?: OscillatorType; g?: number; to?: number; a?: number } = {}) {
  const c = ctx!, osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(f, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.g ?? 0.15, t + (o.a ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  osc.connect(g).connect(master);
  osc.start(t); osc.stop(t + d + 0.03);
}

function noise(t: number, d: number, o: { f0: number; f1: number; g: number; q?: number }) {
  const c = ctx!, src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
  src.buffer = hiss; src.loop = true;
  bp.type = 'bandpass'; bp.Q.value = o.q ?? 1;
  bp.frequency.setValueAtTime(o.f0, t); bp.frequency.exponentialRampToValueAtTime(o.f1, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.g, t + Math.min(0.03, d / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(bp).connect(g).connect(master);
  src.start(t); src.stop(t + d + 0.03);
}

/** A springy "boing-oing": the pitch wobbles up and down as it settles. */
function boing(t: number, base: number, gain: number) {
  const c = ctx!, osc = c.createOscillator(), g = c.createGain(), f = osc.frequency;
  osc.type = 'sine';
  f.setValueAtTime(base * 0.6, t);
  f.exponentialRampToValueAtTime(base * 1.9, t + 0.05);
  f.exponentialRampToValueAtTime(base * 0.8, t + 0.14);
  f.exponentialRampToValueAtTime(base * 1.4, t + 0.22);
  f.exponentialRampToValueAtTime(base, t + 0.36);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  osc.connect(g).connect(master);
  osc.start(t); osc.stop(t + 0.45);
}

const SCALE = [0, 2, 4, 7, 9, 12, 14]; // a pentatonic run, so any string of blips sounds friendly
let lastBlip = 0;

/** One character of dialogue: a tiny bubbly bleep, pitched by the letter. Not a typewriter. */
export function blip(ch: string) {
  if (!ready() || /\s/.test(ch)) return;
  const t = ctx!.currentTime;
  if (t - lastBlip < 0.035) return;
  lastBlip = t;
  if (/[.,!?…;:—]/.test(ch)) return tone(190, t, 0.13, { type: 'triangle', to: 150, g: 0.06 }); // a low "bwomp" for punctuation
  const semis = SCALE[ch.toLowerCase().charCodeAt(0) % SCALE.length] + (Math.random() < 0.18 ? 12 : 0) + (/[A-Z]/.test(ch) ? 5 : 0);
  const f = 262 * 2 ** (semis / 12);
  tone(f * 0.85, t, 0.08, { type: 'triangle', to: f, g: 0.07 });
}

/** A bubble popping into place. */
export function pop() {
  if (!ready()) return;
  const t = ctx!.currentTime;
  tone(260, t, 0.11, { to: 820, g: 0.2 });
  tone(1240, t + 0.03, 0.09, { g: 0.05 });
}

/** A small tap on a button. */
export function tick() {
  if (!ready()) return;
  tone(740, ctx!.currentTime, 0.07, { type: 'square', to: 980, g: 0.035 });
}

/** The game-start jingle: a quick rising chime with a wobble on the end. */
export function startJingle() {
  if (!ready()) return;
  const t = ctx!.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.075, 0.18, { type: 'triangle', g: 0.12 }));
  boing(t + 0.3, 300, 0.1);
}

/** The card is lifted and carried: a rising, slightly wobbly "wheee". */
export function whoosh() {
  if (!ready()) return;
  const t = ctx!.currentTime;
  noise(t, 0.9, { f0: 300, f1: 2600, g: 0.1, q: 1.2 });
  tone(280, t, 0.9, { type: 'triangle', to: 1100, g: 0.06 });
}

/** The card lands: a click, a thump, a spring, and a sparkle on top. Satisfying, a little silly. */
export function lock() {
  if (!ready()) return;
  const t = ctx!.currentTime;
  noise(t, 0.07, { f0: 2200, f1: 900, g: 0.28, q: 2 });
  tone(120, t, 0.14, { to: 50, g: 0.5 });
  boing(t + 0.04, 200, 0.22);
  [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => tone(f, t + 0.14 + i * 0.065, 0.4, { type: 'triangle', g: 0.1 }));
  tone(3136, t + 0.5, 0.5, { g: 0.05 });
}

/** Something new unlocked. */
export function sparkle() {
  if (!ready()) return;
  const t = ctx!.currentTime;
  [1318.5, 1568, 2093, 2637, 3136].forEach((f, i) => tone(f, t + i * 0.06, 0.35, { type: 'triangle', g: 0.09 }));
  boing(t, 260, 0.1);
}
