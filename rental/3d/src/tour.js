// Walkthrough: one unbroken walk at eye level, the way a person would show you round.
// The camera follows a smooth path at walking pace with a slight head bob, slows to a stop
// where there's something to look at, looks around, then carries on. Doors open as you reach them.
import * as THREE from 'three';
import { tvControl } from './rooms/kitchen_living.js';

const EYE = 1.6, SPEED = 0.45, ACCEL = 0.45, BOB = 0.015, STRIDE = 0.7, LOOK_TIME = 2.2; // (seconds per look are set per point below)
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Path points. look: where to look while standing here (x, y, z, seconds), in order. Points without looks are walked through.
export const PATH = [
  { x: 1.85, z: 3.1, looks: [[3.1, 0.9, 1.0, 2.6], [1.15, 1.25, 0.9, 2.6]] },   // inside the front door: sofa, then the TV
  { x: 1.76, z: 1.2 },
  { x: 1.7, z: -0.6 },                                                         // through the open glass partition
  { x: 2.2, z: -1.75, looks: [[2.0, 0.9, -3.69, 2.6], [3.4, 1.1, -1.4, 2.2]] }, // kitchen: desk at the window, then the counter and fridge
  { x: 1.6, z: -0.45 },
  { x: 1.4, z: -0.05 },
  { x: 0.95, z: -0.05 },                                                       // bedroom door
  { x: 0.25, z: -0.85, looks: [[-2.0, 1.15, -1.2, 2.6], [-1.1, 1.3, -2.76, 2.4]] }, // bedroom: bed and prints, then the balcony
  { x: 0.3, z: 0.3, looks: [[0.28, 1.25, 0.95, 2.2]] },                        // dressing table
  { x: -0.75, z: 0.55 },
  { x: -1.05, z: 1.55, looks: [[0.2, 1.05, 1.65, 1.8]] },                      // glance into the toilet as its door slides open
  { x: -1.3, z: 2.2 },
  { x: -1.3, z: 2.95, looks: [[-2.13, 1.35, 2.97, 2.0], [0.1, 1.25, 3.0, 3.2]] }, // wash basin, then the shower
];

// The rooms the walk is split into, for the room buttons: which stop (index into the standing points) starts each
export const ROOMS = [['Living room', 0], ['Kitchen', 1], ['Bedroom', 2], ['Dressing', 3], ['Bathroom', 4]];

const smooth = (t) => t * t * (3 - 2 * t);

export class Tour {
  // nearDoors(x, z): opens any closed door close to this spot. onProgress(fraction, room?) for the UI.
  constructor(camera, nearDoors, onProgress, onEnd) {
    Object.assign(this, { camera, nearDoors, onProgress, onEnd, active: false, paused: false });
    this.curve = new THREE.CatmullRomCurve3(PATH.map((p) => new THREE.Vector3(p.x, 0, p.z)), false, 'centripetal');
    this.len = this.curve.getLength();
    // Where each path point sits along the curve, in metres
    const N = 2000, lens = this.curve.getLengths(N);
    this.at = PATH.map((_, i) => lens[Math.round((i / (PATH.length - 1)) * N)]);
    this.stops = PATH.map((p, i) => (p.looks ? i : -1)).filter((i) => i >= 0);
    this.total = this.len / SPEED * 1.15 + PATH.reduce((s, p) => s + (p.looks || []).reduce((a, l) => a + l[3], 0), 0);
  }

  start() {
    Object.assign(this, { active: true, paused: false, s: 0, v: 0, si: 0, look: 0, lookT: 0, bob: 0, elapsed: 0, prevLook: null });
    this.lookAt = new THREE.Vector3(); this.tmp = new THREE.Vector3();
    tvControl.set?.(true);
    this.place(0, this.target(0), 1);
  }

  // Skip straight to a room: open every door on the way, then stand at its first stop
  jump(si) {
    if (!this.active || si >= this.stops.length) return;
    const to = this.at[this.stops[si]];
    for (let d = Math.min(this.s, to); d <= Math.max(this.s, to); d += 0.25) { const p = this.curve.getPointAt(Math.min(1, d / this.len)); this.nearDoors(p.x, p.z); }
    Object.assign(this, { s: to, v: 0, si, look: 0, lookT: 0 });
    this.elapsed = Math.max(this.elapsed, (to / this.len) * this.total * 0.6);
    this.place(this.s, this.tmp.set(...PATH[this.stops[si]].looks[0].slice(0, 3)), 1);
    this.onProgress(this.elapsed / this.total, this.room());
  }
  room() { let r = 0; for (const [i, [, si]] of ROOMS.entries()) if (this.si >= si) r = i; return r; }
  nextRoom() { const r = this.room() + 1; if (r < ROOMS.length) this.jump(ROOMS[r][1]); else this.onEnd(); }

  stop() { if (this.active) tvControl.set?.(false); this.active = false; }

  // Where to look at distance s: the current stop's first look when close to it, else a point ahead on the path.
  target(s) {
    const ahead = this.curve.getPointAt(Math.min(1, (s + 1.4) / this.len)).setY(1.45);
    const i = this.stops[this.si];
    if (i === undefined) return ahead;
    const [x, y, z] = PATH[i].looks[0], d = this.at[i] - s;
    const k = smooth(THREE.MathUtils.clamp(1 - (d - 0.2) / 1.6, 0, 1)); // turn towards it over the last ~1.8 m
    return ahead.lerp(this.tmp.set(x, y, z), k);
  }

  place(s, look, lerp) {
    const p = this.curve.getPointAt(Math.min(1, s / this.len));
    this.lookAt.lerp(look, lerp);
    const bob = still ? 0 : Math.sin(this.bob) * BOB * Math.min(1, this.v / SPEED);
    this.camera.position.set(p.x, EYE + bob, p.z);
    this.camera.lookAt(this.lookAt);
    this.nearDoors(p.x, p.z);
  }

  update(dt) {
    if (!this.active || this.paused) return;
    this.elapsed += dt;
    const i = this.stops[this.si];
    const stopAt = i === undefined ? this.len : this.at[i];
    if (this.s < stopAt - 0.005) {
      // Walking: speed up to a stroll, ease down so the stop lands gently
      const room = Math.max(0, stopAt - this.s);
      this.v = Math.min(this.v + ACCEL * dt, SPEED, Math.sqrt(2 * ACCEL * room) + 0.02);
      this.s = Math.min(stopAt, this.s + this.v * dt);
      this.bob += (this.v * dt / STRIDE) * 2 * Math.PI;
      this.place(this.s, this.target(this.s), 1 - Math.exp(-dt * 4));
    } else if (i !== undefined) {
      // Standing: look at each thing in turn
      this.v = 0;
      const looks = PATH[i].looks, [x, y, z, sec] = looks[this.look];
      this.lookT += dt;
      this.place(this.s, this.tmp.set(x, y, z), 1 - Math.exp(-dt * 2.2));
      if (this.lookT > sec) {
        this.lookT = 0; this.look += 1;
        if (this.look >= looks.length) { this.look = 0; this.si += 1; }
      }
    } else { this.onEnd(); return; }
    this.onProgress(Math.min(1, this.elapsed / this.total), this.room());
  }
}
