// Corridor, wardrobe, wash basin, toilet room and the shower south of it (all west of the living room).
import * as THREE from 'three';
import { box, wall, floor, H } from '../build.js';
import { mat } from '../materials.js';
import { hingedDoor, slidingGlass } from '../interact.js';

const W = -2.13, S = 3.55, BED_S = 0.16, LIV_W = 1.08;
const T = { x0: -0.5, x1: LIV_W, z0: 0.95, z1: 2.43 }; // toilet room; the shower is south of it, z T.z1 → S

export function corridor() {
  const g = new THREE.Group(); g.name = 'corridor';
  // Hall from the bedroom to the living room, then down to the wash basin
  floor(g, W, BED_S, LIV_W, T.z0, mat.floor(LIV_W - W, T.z0 - BED_S), mat.ceiling);
  floor(g, W, T.z0, T.x0, S, mat.floor(T.x0 - W, S - T.z0), mat.ceiling);
  wall(g, 'z', W - 0.05, BED_S, S, mat.wall);
  wall(g, 'x', S + 0.05, W - 0.1, LIV_W, mat.wall);

  // Built-in wardrobe on the west side (from the scan): oak body, two hinged doors each with a full-length
  // mirror in a thin silver frame, and a column of open oak shelves at the bedroom end
  const SH = 0.55; // open shelves from z 0.25 to here, doors from here to 2.4
  box(g, [W, 0, SH], [-1.6, 2.4, 2.4], mat.oakDoor, { collide: true });
  // the shelves open towards the bed: closed on the corridor side, open on the bedroom side
  box(g, [-1.62, 0, 0.18], [-1.58, 2.4, SH], mat.oakDoor, { collide: true }); // side panel facing the corridor
  box(g, [W, 2.37, 0.18], [-1.62, 2.4, SH], mat.oakDoor);                      // top
  for (const y of [0.03, 0.47, 0.91, 1.35, 1.79]) box(g, [W, y, 0.18], [-1.62, y + 0.025, SH - 0.001], mat.oak); // five shelves
  const silver = new THREE.MeshStandardMaterial({ color: 0xb9bdc0, roughness: 0.35, metalness: 0.7 });
  const glassy = new THREE.MeshStandardMaterial({ color: 0xcfd5d8, roughness: 0.18, metalness: 0.55 }); // silver-grey, no live reflection
  const dw = (2.4 - SH) / 2 - 0.005;
  for (const [z, dir] of [[SH + 0.005, 1], [2.39, -1]]) {
    hingedDoor(g, { x: -1.58, z, along: 'z', dir, width: dw, height: 2.3, y0: 0.05, thick: 0.03, material: mat.oakDoor, openAngle: dir * Math.PI / 2 * 0.85,
      dress: (pv) => {
        // the mirror covers the whole door face, edged with a thin silver frame
        const z0 = 0, z1 = dir * dw, a = Math.min(z0, z1), b = Math.max(z0, z1);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.006, 2.3, b - a), silver); frame.position.set(0.018, 1.15, (a + b) / 2);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.006, 2.27, b - a - 0.03), glassy); glass.position.set(0.022, 1.15, (a + b) / 2);
        pv.add(frame, glass);
      } });
  }

  // Wall closing off the wardrobe's end from the wash area, charcoal tiles on the basin side (from the scan)
  box(g, [W, 0, 2.4], [-1.6, H, 2.46], mat.wall, { collide: true });
  box(g, [W, 0, 2.46], [-1.6, H, 2.468], mat.tile(0.53, H, '#34312f'));

  // Sliding frosted glass door between the corridor and the wash basin area
  const washGlass = new THREE.MeshStandardMaterial({ color: 0xf2f4f4, roughness: 0.9, transparent: true, opacity: 0.9, depthWrite: false }); // 90% opaque, same as the toilet door
  slidingGlass(g, { axis: 'x', at: 2.42, from: -1.6, to: -0.55, height: 2.3, glass: washGlass });
  box(g, [-1.6, 2.3, 2.37], [-0.55, H, 2.47], mat.wall);

  // Wash basin counter and mirror on the west wall (the shower faces it from the east)
  box(g, [W, 0, 2.6], [W + 0.55, 0.82, 3.35], mat.cabinet, { collide: true });
  box(g, [W, 0.82, 2.58], [W + 0.57, 0.86, 3.37], mat.white);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.12, 32), mat.white);
  basin.position.set(W + 0.3, 0.92, 2.97); basin.castShadow = true; g.add(basin);
  box(g, [W + 0.02, 0.86, 2.95], [W + 0.06, 1.05, 2.99], mat.steel);
  box(g, [W, 1.15, 2.65], [W + 0.02, 1.95, 3.3], mat.mirror);
  return g;
}

export function toilet() {
  const g = new THREE.Group(); g.name = 'toilet';
  floor(g, T.x0, T.z0, T.x1, T.z1, mat.tile(T.x1 - T.x0, T.z1 - T.z0, '#d9dcdc'), mat.ceiling);
  wall(g, 'x', T.z0, T.x0, T.x1, mat.wall);
  // West side: a full-width sliding frosted glass door opposite the wardrobe, wall only above it
  box(g, [T.x0 - 0.05, 2.3, T.z0], [T.x0 + 0.05, H, T.z1], mat.wall).userData.wall = 'z';
  const frosted = new THREE.MeshStandardMaterial({ color: 0xf2f4f4, roughness: 0.9, transparent: true, opacity: 0.9, depthWrite: false }); // 90% opaque
  slidingGlass(g, { axis: 'z', at: T.x0, from: T.z0 + 0.05, to: T.z1, height: 2.3, glass: frosted }); // two panels, like the wash area door

  // Toilet against the north wall, small hand basin beside it
  box(g, [-0.2, 0.4, T.z0 + 0.053], [0.2, 0.8, T.z0 + 0.22], mat.white);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.4, 32), mat.white);
  bowl.scale.z = 1.4; bowl.position.set(0, 0.2, T.z0 + 0.45); bowl.castShadow = true; g.add(bowl);
  box(g, [-0.2, 0.4, T.z0 + 0.2], [0.2, 0.43, T.z0 + 0.72], mat.white, { collide: true });
  box(g, [-0.3, 1.3, T.z0 + 0.06], [0.3, 1.32, T.z0 + 0.26], mat.white); // wire rack above the toilet
  box(g, [-0.3, 1.32, T.z0 + 0.24], [0.3, 1.42, T.z0 + 0.26], mat.white);
  // Dark charcoal wall tiles (from the scan), kept clear of the two doors
  const dark = (w, h) => mat.tile(w, h, '#34312f');
  const F = 0.005, E = T.x1 - 0.05; // E: face of the living-room wall
  box(g, [T.x0 + 0.05, 0, T.z0 + 0.05], [E, H, T.z0 + 0.05 + F], dark(E - T.x0, H));               // north
  box(g, [T.x0 + 0.05, 2.3, T.z0 + 0.05], [T.x0 + 0.05 + F, H, T.z1], dark(T.z1 - T.z0, H - 2.3)); // west, above the door
  for (const [a, b] of [[T.z0 + 0.05, 1.62], [2.32, T.z1]]) box(g, [E - F, 0, a], [E, H, b], dark(b - a, H));   // east
  box(g, [E - F, 2.1, 1.62], [E, H, 2.32], dark(0.7, H - 2.1));

  // Wall-hung basin on the north wall in the north-east corner, with a large mirror above
  const N = T.z0 + 0.05 + F; // face of the north wall tiles
  // Narrow basin projecting out from the wall (about 26 cm wide, 48 cm deep, as in the scan)
  box(g, [E - 0.29, 0.74, N], [E - 0.03, 0.9, N + 0.48], mat.white, { collide: true });
  box(g, [E - 0.25, 0.8, N + 0.1], [E - 0.07, 0.905, N + 0.44], new THREE.MeshStandardMaterial({ color: 0xdde0e0, roughness: 0.2 }));
  box(g, [E - 0.175, 0.9, N + 0.02], [E - 0.145, 0.93, N + 0.14], mat.steel);
  box(g, [E - 0.175, 0.93, N + 0.01], [E - 0.145, 1.05, N + 0.03], mat.steel);
  box(g, [T.x0 + 0.07, 1.15, N], [E - 0.02, 2.2, N + 0.01], mat.mirror); // mirror across the whole north wall

  // Shower: south of the toilet, facing the wash basin; glass on the toilet side and the basin side
  const Z0 = T.z1, Z1 = S, X1 = 0.3; // X1: shower's east wall; the laundry cupboard is beyond it
  floor(g, T.x0, Z0, X1, Z1, mat.tile(X1 - T.x0, Z1 - Z0, '#4a4644'), mat.ceiling);
  wall(g, 'z', X1 + 0.05, Z0, Z1, mat.wall);  // shower | laundry cupboard
  wall(g, 'x', Z0, X1 + 0.003, T.x1, mat.wall);        // toilet | laundry cupboard

  // Laundry cupboard, opening from the living room: washing machine facing the door
  floor(g, X1 + 0.1, Z0 + 0.05, T.x1 - 0.05, Z1, mat.tile(T.x1 - X1, Z1 - Z0, '#e2ded7'), mat.ceiling);
  box(g, [X1 + 0.12, 0, 2.6], [X1 + 0.72, 0.85, 3.2], mat.white, { collide: true });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 32), mat.dark);
  drum.rotation.z = Math.PI / 2; drum.position.set(X1 + 0.73, 0.45, 2.9); g.add(drum);
  const brick = (w) => new THREE.MeshStandardMaterial({ map: bricks(w, 2.4), roughness: 0.5 });
  box(g, [T.x0, 0, Z1 - 0.035], [X1 - 0.035, H, Z1 - 0.005], brick(X1 - T.x0)); // south wall tiles
  box(g, [X1 - 0.035, 0, Z0], [X1 - 0.005, H, Z1 - 0.005], brick(Z1 - Z0));     // east wall tiles
  // Toilet–shower divider: tiled half wall, glass above it
  const SILL = 1.0;
  box(g, [T.x0, 0, Z0 - 0.04], [X1, SILL, Z0 + 0.04], mat.tile(X1 - T.x0, SILL, '#d9dcdc'), { collide: true });
  box(g, [T.x0, 0, Z0 + 0.04], [X1, SILL, Z0 + 0.05], brick(X1 - T.x0));
  box(g, [T.x0, SILL, Z0 - 0.01], [X1, 2.0, Z0 + 0.01], mat.showerGlass, { shadow: false });
  box(g, [T.x0, SILL - 0.01, Z0 - 0.02], [X1, SILL + 0.01, Z0 + 0.02], mat.steel);
  box(g, [T.x0 - 0.01, 0, Z0], [T.x0 + 0.01, 2.0, Z0 + 0.55], mat.showerGlass, { shadow: false, collide: true }); // fixed glass
  box(g, [T.x0 - 0.04, 0, Z0 + 0.55], [T.x0 - 0.02, 2.0, Z1 - 0.05], mat.showerGlass, { shadow: false }); // door to the basin side
  box(g, [T.x0 - 0.02, 0, Z0 + 0.53], [T.x0 + 0.02, 2.0, Z0 + 0.57], mat.steel);

  // Water heater high on the east wall near the south end, hand shower on a rail below it
  const hz = 3.18;
  box(g, [X1 - 0.16, 1.9, hz - 0.14], [X1 - 0.035, 2.22, hz + 0.14], mat.white);
  box(g, [X1 - 0.065, 0.9, hz - 0.015], [X1 - 0.035, 1.8, hz + 0.015], mat.steel);
  const hand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.22, 16), mat.steel);
  hand.position.set(X1 - 0.09, 1.55, hz); hand.rotation.x = 0.4; g.add(hand);
  return g;
}

// Dark brick-style wall tiles (as in the scan), w × h metres.
function bricks(w, h) {
  const t = mat.canvasTexture(256, 256, (g, cw, ch) => {
    g.fillStyle = '#2e2a28'; g.fillRect(0, 0, cw, ch);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) {
      const x = c * 64 + (r % 2) * 32, y = r * 32, tone = 58 + ((r * 3 + c * 5) % 4) * 6;
      g.fillStyle = `rgb(${tone},${tone - 6},${tone - 10})`; g.fillRect(x + 2, y + 2, 60, 28);
    }
  });
  t.repeat.set(w / 0.6, h / 0.6);
  return t;
}
