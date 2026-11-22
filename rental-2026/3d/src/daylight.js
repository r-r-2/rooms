// Time of day. The kitchen and bedroom windows face east (-z here), so only the morning sun comes straight in.
import * as THREE from 'three';
import { mat } from './materials.js';

const DAY_BG = new THREE.Color(0xdce3e8), DAWN_BG = new THREE.Color(0xe9dccf), NIGHT_BG = new THREE.Color(0x1f2631);
const WARM = new THREE.Color(0xffa95e), NOON = new THREE.Color(0xfff3e2);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function makeDaylight({ scene, renderer, sun, hemi, ambient, centre }) {
  const bg = new THREE.Color();
  return function setHour(h) {
    const phase = ((h - 6) / 12) * Math.PI;          // 0 at 6:00 (east), π at 18:00 (west)
    const el = Math.sin(phase);                       // sun height, negative at night
    const up = smooth(-0.05, 0.12, el);               // 0 at night → 1 once the sun is up
    sun.position.set(centre.x + 0.8, centre.y + 9 * Math.max(el, 0.06), centre.z - 9 * Math.cos(phase));
    sun.target.position.copy(centre);
    sun.color.copy(WARM).lerp(NOON, smooth(0.1, 0.6, el));
    sun.intensity = 2.8 * up * (h < 12 ? 1 : 0.55);   // the west side is blocked by the building
    hemi.intensity = 0.2 + 0.95 * smooth(-0.15, 0.35, el);
    ambient.intensity = 0.12 + 0.25 * up;
    const dusk = 1 - smooth(0.0, 0.3, Math.abs(el));  // near sunrise and sunset
    bg.copy(NIGHT_BG).lerp(DAY_BG, smooth(-0.15, 0.2, el)).lerp(DAWN_BG, dusk * up * 0.6);
    scene.background = bg;
    renderer.toneMappingExposure = 0.85 + 0.2 * up;
    mat.glass.emissiveIntensity = 0.05 + 0.85 * smooth(-0.1, 0.25, el);
    return { night: el < -0.02 };
  };
}
