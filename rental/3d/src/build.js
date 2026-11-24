// Small helpers for placing boxes and walls in metres. x = east, z = south, y = up; floor at y = 0.
import * as THREE from 'three';

export const H = 2.6; // ceiling height

// Box by its min/max corners. Optional: collide (blocks walking).
export function box(parent, [x0, y0, z0], [x1, y1, z1], material, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = opts.shadow !== false; m.receiveShadow = true;
  if (opts.collide) m.userData.collide = true;
  parent.add(m);
  return m;
}

// Wall along x (at z) or along z (at x), with optional openings [from, to, bottom, top].
export function wall(parent, axis, at, from, to, material, openings = [], t = 0.1) {
  const cuts = [...openings].sort((a, b) => a[0] - b[0]);
  const seg = (a, b, y0, y1) => {
    if (b - a < 0.001 || y1 - y0 < 0.001) return;
    const m = axis === 'x' ? box(parent, [a, y0, at - t / 2], [b, y1, at + t / 2], material, { collide: y0 < 1 })
      : box(parent, [at - t / 2, y0, a], [at + t / 2, y1, b], material, { collide: y0 < 1 });
    m.userData.wall = axis; // used by the dollhouse cutaway
  };
  let pos = from;
  for (const [a, b, bot, top] of cuts) {
    seg(pos, a, 0, H);
    seg(a, b, 0, bot);   // below the opening
    seg(a, b, top, H);   // above the opening
    pos = b;
  }
  seg(pos, to, 0, H);
}

// Floor (and matching ceiling) for a rectangular zone.
export function floor(parent, x0, z0, x1, z1, material, ceilingMat) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), material);
  f.rotation.x = -Math.PI / 2; f.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); f.receiveShadow = true; f.userData.floor = true;
  parent.add(f);
  if (ceilingMat) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), ceilingMat);
    c.rotation.x = Math.PI / 2; c.position.set((x0 + x1) / 2, H, (z0 + z1) / 2); c.userData.ceiling = true;
    parent.add(c);
  }
}
