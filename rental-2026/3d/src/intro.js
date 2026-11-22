// Opening, about 6.5 s, one continuous move:
// an orange floor plan draws itself, the floors spread out room by room, the walls rise in a wave,
// the furniture settles in, and the camera spirals down from above into the dollhouse view the whole time.
import * as THREE from 'three';

const ROOM_ORDER = ['living', 'kitchen', 'bedroom', 'corridor', 'toilet']; // the wave starts at the front door
const END = 6.6, HOLD = 0.35; // HOLD: a beat before anything moves, so the first (slow) frames aren't seen as stutter

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // cubic in-out
const inOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const outQuart = (t) => 1 - Math.pow(1 - t, 4);
const outBack = (t, s = 1.4) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); // a soft overshoot

export class Intro {
  constructor(home, camera, centre, endPose) {
    Object.assign(this, { home, camera, centre, endPose, t: -HOLD, active: true, parts: [] });
    home.updateMatrixWorld(true);
    const roomOf = (o) => { while (o.parent && o.parent !== home) o = o.parent; return Math.max(0, ROOM_ORDER.indexOf(o.name)); };
    const roomCentre = {};
    home.children.forEach((g) => (roomCentre[g.name] = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3())));
    const v = new THREE.Vector3(), floors = [];
    home.traverse((o) => {
      if (!o.isMesh || o.userData.ceiling) return;
      const r = roomOf(o), rc = roomCentre[ROOM_ORDER[r]] || centre;
      o.getWorldPosition(v);
      const local = Math.hypot(v.x - rc.x, v.z - rc.z); // distance from the middle of its room
      const base = { o, y0: o.position.y, s0: o.scale.clone() };
      if (o.userData.floor) { floors.push(o); this.parts.push({ ...base, kind: 'floor', delay: 0.9 + r * 0.22, dur: 0.9 }); }
      else if (o.userData.wall && o.geometry.parameters?.height) {
        const h = o.geometry.parameters.height;
        this.parts.push({ ...base, kind: 'wall', bottom: o.position.y - h / 2, h, delay: 1.7 + r * 0.28 + local * 0.06, dur: 1.1 });
      } else this.parts.push({ ...base, kind: 'thing', delay: 3.0 + r * 0.28 + local * 0.08 + Math.random() * 0.15, dur: 0.85 });
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
      else {
        o.visible = k > 0;
        const s = Math.max(outBack(k), 0.001);
        o.scale.set(p.s0.x * s, p.s0.y * s, p.s0.z * s);
        o.position.y = p.y0 + (1 - outQuart(k)) * 0.3;
      }
    }
    // the plan draws in over 1.6 s, then fades once the rooms stand on it
    this.plan.geometry.setDrawRange(0, Math.ceil(inOut(clamp01(t / 1.6)) * this.planCount / 2) * 2);
    this.plan.material.opacity = 1 - clamp01((t - 4.6) / 1.4);

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
    this.plan.removeFromParent(); this.plan.geometry.dispose(); this.plan.material.dispose();
    this.active = false;
  }
}
