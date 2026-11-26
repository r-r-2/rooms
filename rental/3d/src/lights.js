// Downlights: small recessed discs in each room's ceiling, one warm point light per room, tap a disc to switch the room.
import * as THREE from 'three';
import { H } from './build.js';
import { interactive } from './interact.js';

// Room → downlight positions [x, z] (from the floor plan).
const ROOMS = {
  bedroom: [[-1.3, -1.9], [-0.1, -1.9], [-1.3, -0.6], [-0.1, -0.6]],
  dressing: [[0.55, 0.45]],
  corridor: [[-1.05, 0.6], [-1.05, 1.7], [-1.05, 3.0]],
  kitchen: [[2.35, -2.9], [2.35, -1.5]],
  living: [[2.35, 0.4], [2.35, 1.6], [2.35, 2.8]],
  toilet: [[0.25, 1.6]],
  shower: [[-0.1, 3.0]],
};

export const roomLights = {};
export const lightLevel = { k: 1, warm: false }; // brighter and warmer at night (set by the time of day)

export function downlights(scene) {
  const g = new THREE.Group(); g.name = 'downlights';
  for (const [room, spots] of Object.entries(ROOMS)) {
    const cx = spots.reduce((s, p) => s + p[0], 0) / spots.length, cz = spots.reduce((s, p) => s + p[1], 0) / spots.length;
    const light = new THREE.PointLight(0xffd9a8, 0, 6, 1.6);
    light.position.set(cx, H - 0.15, cz);
    g.add(light);
    const discs = spots.map(([x, z]) => {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 24), new THREE.MeshStandardMaterial({ color: 0xf4f2ee, emissive: 0x000000, roughness: 0.4 }));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 6, 24), new THREE.MeshStandardMaterial({ color: 0xcfd2d4, metalness: 0.6, roughness: 0.3 }));
      rim.rotation.x = Math.PI / 2;
      d.position.set(x, H - 0.008, z); rim.position.set(x, H - 0.012, z);
      g.add(d, rim);
      return d;
    });
    const state = { on: false, light, discs, set(on) {
      this.on = on;
      light.intensity = on ? 0.9 * spots.length * lightLevel.k : 0;
      light.color.setHex(lightLevel.warm ? 0xffbf7a : 0xffd9a8); // evening lamps are warmer
      discs.forEach((d) => d.material.emissive.setHex(on ? 0xffe2b8 : 0x000000));
      discs.forEach((d) => (d.userData.baseEmissive = on ? 0xffe2b8 : 0x000000));
    } };
    interactive(discs, () => state.set(!state.on), 'switch');
    roomLights[room] = state;
  }
  scene.add(g);
  return g;
}
