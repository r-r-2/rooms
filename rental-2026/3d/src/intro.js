// Opening, about 4 s: a LiDAR-style scan. An orange light sheet sweeps across the flat from the front door,
// and everything behind it appears whole, the way the iPhone scan built it up. Then the ceiling lights
// ripple on. The camera spirals down from above into the dollhouse view in one move the whole time.
import * as THREE from 'three';

const END = 3.9, HOLD = 0.25, SWEEP = [0.05, 2.45]; // sweep start and end, seconds
const LIGHT_ORDER = ['living', 'kitchen', 'dressing', 'bedroom', 'corridor', 'toilet', 'shower'];
const ORANGE = 0xff6a13;

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const inOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

export class Intro {
  constructor(home, camera, centre, endPose, lights = {}, fixtures = null) {
    Object.assign(this, { home, camera, centre, endPose, lights, fixtures, t: -HOLD, active: true });
    home.updateMatrixWorld(true);

    // Sweep direction: from the front door (south-east) towards the far corner
    this.dir = new THREE.Vector3(-0.35, 0, -1).normalize();
    const box = new THREE.Box3().setFromObject(home), d = [];
    for (const x of [box.min.x, box.max.x]) for (const z of [box.min.z, box.max.z]) d.push(this.dir.dot(new THREE.Vector3(x, 0, z)));
    this.range = [Math.min(...d) - 0.1, Math.max(...d) + 0.1];
    // One clipping plane cuts the whole flat; what the sheet has passed (dir·p <= at) is shown
    this.plane = new THREE.Plane(this.dir.clone().negate(), this.range[0]);
    this.mats = new Set();
    home.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => this.mats.add(m)); });
    this.mats.forEach((m) => { m.clippingPlanes = [this.plane]; m.needsUpdate = true; });

    // The light sheet: a tall orange glow across the flat, brightest at the floor, with a bright line on the ground
    const size = box.getSize(new THREE.Vector3()), span = Math.hypot(size.x, size.z) + 1, h = 2.9;
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 128;
    const g = cv.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, 'rgba(255,106,19,0)'); grad.addColorStop(0.6, 'rgba(255,106,19,0.18)'); grad.addColorStop(1, 'rgba(255,106,19,0.85)');
    g.fillStyle = grad; g.fillRect(0, 0, 4, 128);
    this.tex = new THREE.CanvasTexture(cv);
    this.sheet = new THREE.Mesh(new THREE.PlaneGeometry(span, h), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    this.line = new THREE.Mesh(new THREE.BoxGeometry(span, 0.025, 0.025), new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, depthWrite: false, toneMapped: false }));
    this.line.position.y = -h / 2 + 0.015; this.sheet.add(this.line);
    this.sheet.renderOrder = this.line.renderOrder = 10;
    this.sheet.position.y = h / 2;
    this.sheet.lookAt(this.dir.clone().setY(h / 2)); // face along the sweep (sheet sits at the origin here)
    this.rig = new THREE.Group(); this.rig.add(this.sheet);
    home.parent.add(this.rig);
    const c = box.getCenter(new THREE.Vector3()); this.mid = new THREE.Vector3(c.x, 0, c.z);

    // Camera: a spiral on a sphere around the flat, from high and turned away to the dollhouse view
    this.sph1 = new THREE.Spherical().setFromVector3(endPose.clone().sub(centre));
    this.sph0 = new THREE.Spherical(this.sph1.radius * 1.3, 0.14, this.sph1.theta - 1.1);
    this.sph = new THREE.Spherical();
    this.update(0);
  }

  update(dt) {
    if (!this.active) return false;
    this.t += dt;
    const t = this.t;

    // the sweep: the plane and the sheet move together across the whole flat
    const k = inOutSine(clamp01((t - SWEEP[0]) / (SWEEP[1] - SWEEP[0])));
    const at = THREE.MathUtils.lerp(this.range[0], this.range[1], k);
    this.plane.constant = at;
    const p = this.mid.clone().addScaledVector(this.dir, at - this.dir.dot(this.mid));
    this.rig.position.set(p.x, 0, p.z);
    const fade = clamp01(t / 0.2) * (1 - clamp01((t - SWEEP[1] + 0.1) / 0.4));
    this.sheet.material.opacity = 0.85 * fade; this.line.material.opacity = fade;
    this.rig.visible = fade > 0;

    // finale: the ceiling lights ripple on room by room, a warm swell that settles back to the time of day
    if (this.fixtures) this.fixtures.visible = t > 2.4;
    LIGHT_ORDER.forEach((name, i) => {
      const L = this.lights[name]; if (!L) return;
      const q = clamp01((t - 2.5 - i * 0.12) / 0.7), glow = q > 0 && q < 1 ? Math.sin(Math.PI * q) : 0, base = L.on ? 1 : 0;
      L.light.intensity = 0.9 * L.discs.length * Math.max(base, glow * 1.3);
      L.discs.forEach((dsc) => dsc.material.emissive.setHex(0xffe2b8).multiplyScalar(Math.max(base, glow)));
    });

    const e = inOutSine(clamp01(t / (END - 0.3)));
    this.sph.set(
      THREE.MathUtils.lerp(this.sph0.radius, this.sph1.radius, e),
      THREE.MathUtils.lerp(this.sph0.phi, this.sph1.phi, e),
      THREE.MathUtils.lerp(this.sph0.theta, this.sph1.theta, e));
    this.camera.position.setFromSpherical(this.sph).add(this.centre);
    this.camera.lookAt(this.centre);
    if (t >= END) this.finish();
    return this.active;
  }

  finish() {
    this.plane.constant = 1e6; // everything shown; the plane stays on the materials so nothing recompiles
    for (const L of Object.values(this.lights)) L.set(L.on); // back to the time of day's lighting
    if (this.fixtures) this.fixtures.visible = true;
    this.rig.removeFromParent();
    this.sheet.geometry.dispose(); this.sheet.material.dispose(); this.tex.dispose();
    this.line.geometry.dispose(); this.line.material.dispose();
    this.active = false;
  }
}
