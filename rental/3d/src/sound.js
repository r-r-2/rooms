// Room tone and interaction sounds, all synthesised with Web Audio (no audio files).
// Off until the visitor turns sound on; browsers only allow audio after a tap.
import { events } from './interact.js';

const ROOMS = { // [x0, x1, z0, z1]
  bedroom: [-2.13, 1.08, -2.76, 0.16],
  kitchen: [1.08, 3.65, -3.69, -0.58],
  living: [1.08, 3.65, -0.58, 3.55],
  bath: [-0.5, 1.08, 0.95, 3.55],
};

let ctx, master, noise, tones = {}, on = false;

function noiseSource() {
  const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start();
  return s;
}
function filter(type, freq, q = 0.7) { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; }
function gain(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
function osc(type, freq, level, out) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; const g = gain(level); o.connect(g).connect(out); o.start(); return o; }
const chain = (...nodes) => { nodes.reduce((a, b) => a.connect(b)); return nodes.at(-1); };

// One output bus per room, faded in and out as you move between rooms.
function buildTones() {
  const bus = (name) => { const g = gain(0); g.connect(master); return (tones[name] = g); };
  // Bedroom: the AC's airflow hiss and a soft motor hum
  const bed = bus('bedroom');
  chain(noiseSource(), filter('bandpass', 420, 0.6), gain(0.05), bed);
  osc('sine', 98, 0.012, bed);
  // Kitchen: fridge compressor buzz, a little street noise through the window
  const kit = bus('kitchen');
  const buzz = gain(1);
  chain(buzz, filter('lowpass', 260), gain(0.02), kit);
  [50, 100, 150].forEach((f) => osc('sawtooth', f, 0.5 / f * 50, buzz));
  chain(noiseSource(), filter('lowpass', 380), gain(0.018), kit);
  // Living room: distant traffic that swells and fades, an occasional scooter going past
  const liv = bus('living');
  const traffic = gain(0.07);
  chain(noiseSource(), filter('lowpass', 240), traffic, liv);
  osc('sine', 0.06, 0.025, traffic.gain); // slow swell
  scooterLoop(liv);
  // Bathroom: a slow drip with a small-room echo
  const bath = bus('bath');
  const echo = ctx.createDelay(); echo.delayTime.value = 0.09;
  const fb = gain(0.35); echo.connect(fb).connect(echo); echo.connect(bath);
  dripLoop(echo, bath);
  // Corridor: almost nothing, a faint electrical hum
  const cor = bus('corridor');
  osc('sine', 60, 0.006, cor);
}

function dripLoop(wet, dry) {
  const drip = () => {
    if (ctx.state !== 'running') return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = gain(0);
    o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.08);
    g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(wet); g.connect(dry); o.start(t); o.stop(t + 0.15);
    setTimeout(drip, 2200 + Math.random() * 2200);
  };
  setTimeout(drip, 1500);
}

function scooterLoop(out) {
  const pass = () => {
    if (ctx.state !== 'running') return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = gain(0), lp = filter('lowpass', 500);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(130, t + 2.5); o.frequency.linearRampToValueAtTime(85, t + 5);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 2.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
    chain(o, lp, g, out); o.start(t); o.stop(t + 5.2);
    setTimeout(pass, 14000 + Math.random() * 16000);
  };
  setTimeout(pass, 6000);
}

// Short one-off sounds for things you tap.
function burst(freq, type, dur, level, q = 1) {
  const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noise;
  const g = gain(0);
  g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  chain(s, filter(type, freq, q), g, master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
function beep(freq, at, dur = 0.08, level = 0.05) {
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = gain(0);
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  chain(o, g, master); o.start(t); o.stop(t + dur + 0.02);
}
const EFFECTS = {
  door: () => { burst(700, 'bandpass', 0.35, 0.08, 2); setTimeout(() => burst(140, 'lowpass', 0.12, 0.25), 550); },
  switch: () => { burst(3200, 'highpass', 0.02, 0.2); },
  slide: () => { burst(500, 'lowpass', 0.8, 0.05); },
  curtain: () => { burst(2500, 'highpass', 1.1, 0.03); },
  blinds: () => { for (let i = 0; i < 6; i++) setTimeout(() => burst(2800, 'bandpass', 0.03, 0.06, 4), i * 45); },
  tv: () => { burst(3000, 'highpass', 0.03, 0.15); beep(15600, 0.05, 0.6, 0.004); },
  ac: () => { beep(2100, 0); beep(2100, 0.14); },
  click: () => { burst(2000, 'bandpass', 0.03, 0.1); },
};

events.addEventListener('sound', (e) => { if (on) EFFECTS[e.detail.kind]?.(); });

export function toggleSound() {
  if (!ctx) {
    ctx = new AudioContext();
    master = gain(0.9); master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    buildTones();
  }
  on = !on;
  if (on) ctx.resume(); else ctx.suspend();
  return on;
}

// Each frame: full tone for the room you're in, a quiet mix of everything in the dollhouse view.
export function updateSound(pos, walking) {
  if (!on || !ctx) return;
  let here = 'corridor';
  for (const [name, [x0, x1, z0, z1]] of Object.entries(ROOMS)) if (pos.x > x0 && pos.x < x1 && pos.z > z0 && pos.z < z1) here = name;
  for (const [name, bus] of Object.entries(tones)) {
    const target = walking ? (name === here ? 1 : 0.12) : 0.35;
    bus.gain.setTargetAtTime(target, ctx.currentTime, 0.6);
  }
  footsteps(pos, walking, here === 'kitchen' || here === 'bath');
}

// Footsteps, kept quiet: a soft heel thump every ~65 cm of walking, with a light tap on top that is
// warmer on the wooden floors and crisper on the kitchen and bathroom tiles. Left and right differ a little.
let last = null, stride = 0, foot = 0;
function footsteps(pos, walking, tiles) {
  if (!walking) { last = null; stride = 0; return; }
  if (last) {
    const d = Math.hypot(pos.x - last.x, pos.z - last.z);
    if (d > 0.5) stride = 0;            // a jump to another room, not a step
    else stride += d;
  }
  last = { x: pos.x, z: pos.z };
  if (stride < 0.65) return;
  stride = 0; foot ^= 1;
  const v = (foot ? 1 : 0.92) * (0.9 + Math.random() * 0.2);
  burst((tiles ? 210 : 160) * v, 'lowpass', 0.09, 0.05);                 // heel
  burst((tiles ? 2600 : 950) * v, 'bandpass', tiles ? 0.035 : 0.05, tiles ? 0.016 : 0.01, tiles ? 3 : 2); // contact
}
