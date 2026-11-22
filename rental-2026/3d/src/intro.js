// Opening: the floors are laid, the walls rise, the furniture settles in, then the camera tilts into the dollhouse view.
import * as THREE from 'three';

const DUR = 6.5;
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export class Intro {
  constructor(home, camera, centre, endPose) {
    Object.assign(this, { camera, centre, endPose, t: 0, active: true, parts: [] });
    home.traverse((o) => {
      if (!o.isMesh || o.userData.floor || o.userData.ceiling) return;
      const p = o.getWorldPosition(new THREE.Vector3()), dist = Math.hypot(p.x - centre.x, p.z - centre.z);
      if (o.userData.wall && o.geometry.parameters?.height) {
        const h = o.geometry.parameters.height;
        this.parts.push({ o, kind: 'wall', y0: o.position.y, bottom: o.position.y - h / 2, h, delay: 0.6 + dist * 0.18 });
      } else {
        this.parts.push({ o, kind: 'thing', y0: o.position.y, delay: 2.6 + dist * 0.22 + Math.random() * 0.3 });
      }
    });
    this.start = new THREE.Vector3(centre.x, 16, centre.z + 0.01);
    this.update(0);
  }
  update(dt) {
    if (!this.active) return false;
    this.t += dt;
    for (const p of this.parts) {
      const k = ease((this.t - p.delay) / (p.kind === 'wall' ? 0.9 : 0.7));
      if (p.kind === 'wall') { p.o.scale.y = Math.max(k, 0.001); p.o.position.y = p.bottom + (p.h * Math.max(k, 0.001)) / 2; }
      else { p.o.visible = k > 0; p.o.position.y = p.y0 + (1 - k) * 1.2; }
    }
    const c = ease((this.t - 3) / 3.3);
    this.camera.position.lerpVectors(this.start, this.endPose, c);
    this.camera.lookAt(this.centre);
    if (this.t >= DUR + 1.5) this.finish();
    return this.active;
  }
  finish() {
    for (const p of this.parts) {
      if (p.kind === 'wall') { p.o.scale.y = 1; p.o.position.y = p.y0; } else { p.o.visible = true; p.o.position.y = p.y0; }
    }
    this.active = false;
  }
}
