// Opening, about 4 s, four beats while the camera spirals down in one move:
// the orange plan draws itself, each room rises as one piece, each room's furniture lands as one group,
// then the ceiling lights ripple on and the plan fades.
import * as THREE from 'three';

const ROOM_ORDER = ['living', 'kitchen', 'bedroom', 'corridor', 'toilet']; // the wave starts at the front door
const END = 3.9, HOLD = 0.25;
const LIGHT_ORDER = ['living', 'kitchen', 'dressing', 'bedroom', 'corridor', 'toilet', 'shower']; // HOLD: a beat before anything moves, so the first (slow) frames aren't seen as stutter

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // cubic in-out
const inOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const outQuart = (t) => 1 - Math.pow(1 - t, 4);

export class Intro {
  constructor(home, camera, centre, endPose, lights = {}, fixtures = null) {
    Object.assign(this, { home, camera, centre, endPose, lights, fixtures, t: -HOLD, active: true, parts: [] });
    home.updateMatrixWorld(true);
    const roomOf = (o) => { while (o.parent && o.parent !== home) o = o.parent; return Math.max(0, ROOM_ORDER.indexOf(o.name)); };
    const floors = [];
    home.traverse((o) => {
      if (!o.isMesh || o.userData.ceiling) return;
      const r = roomOf(o);
      const base = { o, y0: o.position.y, s0: o.scale.clone() };
      // a whole room moves as one: same timing for its floor and walls, then for all its furniture
      if (o.userData.floor) { floors.push(o); this.parts.push({ ...base, kind: 'floor', delay: 0.55 + r * 0.2, dur: 0.6 }); }
      else if (o.userData.wall && o.geometry.parameters?.height) {
        const h = o.geometry.parameters.height;
        this.parts.push({ ...base, kind: 'wall', bottom: o.position.y - h / 2, h, delay: 0.6 + r * 0.2, dur: 0.65 });
      } else this.parts.push({ ...base, kind: 'thing', delay: 1.6 + r * 0.2, dur: 0.45 });
    });

    // The plan: every floor outline traced in the stamp orange, drawn on in one stroke
    const pts = [], b = new THREE.Box3();
    floors.sort((a, c) => roomOf(a) - roomOf(c)).forEach((f) => {
      b.setFromObject(f); const y = 0.015, { min: m, max: M } = b;
      pts.push(m.x, y, m.z, M.x, y, m.z, M.x, y, m.z, M.x, y, M.z, M.x, y, M.z, m.x, y, M.z, m.x, y, M.z, m.x, y, m.z);
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.planCount = pts.length / 3;
    this.plan = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xff6a13, transparent: true, opacity: 1, toneMapped: false, depthWrite: false }));
    this.plan.renderOrder = 10; home.add(this.plan);

    // Camera: a spiral on a sphere around the flat, from high and turned away to the dollhouse view
    const off = endPose.clone().sub(centre);
    this.sph1 = new THREE.Spherical().setFromVector3(off);
    this.sph0 = new THREE.Spherical(this.sph1.radius * 1.3, 0.14, this.sph1.theta - 1.1);
    this.sph = new THREE.Spherical();
    this.update(0);
  }

  update(dt) {
    if (!this.active) return false;
    this.t += dt;
    const t = this.t;
    for (const p of this.parts) {
      const k = clamp01((t - p.delay) / p.dur), o = p.o;
      if (p.kind === 'floor') { const e = outQuart(k); o.visible = k > 0; o.scale.set(Math.max(e, 0.001), Math.max(e, 0.001), 1); }
      else if (p.kind === 'wall') { const e = Math.max(inOut(k), 0.001); o.scale.y = e; o.position.y = p.bottom + (p.h * e) / 2; }
      else { o.visible = k > 0; o.position.y = p.y0 + (1 - outQuart(k)) * 0.15; }
    }
    // the plan draws in one quick stroke, then fades as the lights come on
    this.plan.geometry.setDrawRange(0, Math.ceil(inOut(clamp01(t / 0.8)) * this.planCount / 2) * 2);
    this.plan.material.opacity = 1 - clamp01((t - 2.8) / 0.8);
    // finale: the ceiling lights ripple on room by room, a warm swell that settles back to the time of day
    if (this.fixtures) this.fixtures.visible = t > 2.6;
    LIGHT_ORDER.forEach((name, i) => {
      const L = this.lights[name]; if (!L) return;
      const k = clamp01((t - 2.65 - i * 0.12) / 0.7), g = Math.sin(Math.PI * k) * (k > 0 && k < 1 ? 1 : 0);
      const base = L.on ? 1 : 0;
      L.light.intensity = 0.9 * L.discs.length * Math.max(base, g * 1.3);
      L.discs.forEach((d) => d.material.emissive.setHex(0xffe2b8).multiplyScalar(Math.max(base, g)));
    });

    const c = inOutSine(clamp01(t / (END - 0.3)));
    this.sph.set(
      THREE.MathUtils.lerp(this.sph0.radius, this.sph1.radius, c),
      THREE.MathUtils.lerp(this.sph0.phi, this.sph1.phi, c),
      THREE.MathUtils.lerp(this.sph0.theta, this.sph1.theta, c));
    this.camera.position.setFromSpherical(this.sph).add(this.centre);
    this.camera.lookAt(this.centre);
    if (t >= END) this.finish();
    return this.active;
  }

  finish() {
    for (const p of this.parts) {
      const o = p.o;
      o.visible = true; o.position.y = p.y0;
      if (p.kind === 'floor') o.scale.set(1, 1, 1);
      else if (p.kind === 'wall') o.scale.y = 1;
      else o.scale.copy(p.s0);
    }
    for (const L of Object.values(this.lights)) L.set(L.on); // back to the time of day's lighting
    if (this.fixtures) this.fixtures.visible = true;
    this.plan.removeFromParent(); this.plan.geometry.dispose(); this.plan.material.dispose();
    this.active = false;
  }
}
