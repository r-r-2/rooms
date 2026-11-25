// Kitchen (north, desk under the window) and living room (south), one open space.
// x: 1.08 (wall shared with bedroom) → 3.65 (east wall); z: -3.69 (kitchen window) → 3.55 (south wall).
import * as THREE from 'three';
import { box, wall, floor, H } from '../build.js';
import { mat } from '../materials.js';
import { interactive, hingedDoor, slider, tween } from '../interact.js';

const W = 1.08, E = 3.65, N = -3.69, S = 3.55, SPLIT = -0.58; // SPLIT: kitchen tiles end, living wood begins

export function kitchen() {
  const g = new THREE.Group(); g.name = 'kitchen';
  floor(g, W, N, E, SPLIT, mat.tile(E - W, SPLIT - N), mat.ceiling);
  wall(g, 'x', N - 0.05, W - 0.05, E + 0.05, mat.wall, [[1.3, 3.4, 0.02, 2.3]]); // window down to the floor
  wall(g, 'z', W, N, -2.76, mat.wall);
  wall(g, 'z', E + 0.05, N, SPLIT, mat.wall, [[-2.42, -1.52, 1.19, 1.5], [-2.32, -1.52, 1.52, 1.7]]); // niches above the tap
  box(g, [1.3, 0.02, N - 0.06], [3.4, 2.3, N - 0.04], new THREE.MeshStandardMaterial({ color: 0x5f6f76, roughness: 0.05, transparent: true, opacity: 0.05, depthWrite: false }), { shadow: false }); // clear, to see the view (dark and faint so it does not go milky at night)
  const bl = blinds(1.3, 3.4, 0.03, 2.27, N + 0.05); // full height, like the window
  box(g, [1.3, 0, N - 0.24], [3.4, 2.3, N - 0.23], mat.wall, { collide: true }).visible = false; // invisible stop just outside the glass: you can stand between the blinds and the window, but not walk out
  g.add(bl);
  let shut = false; // tap to tilt the slats shut (they overlap and block the window) or open
  interactive(bl, () => { shut = !shut; bl.children.forEach((sl) => sl.userData.slat && tween(sl.rotation, 'x', shut ? 1.45 : 0.12, 0.6)); }, 'blinds');

  // Desk along the window about 10 cm above the counter, running from the west wall into the kitchen counter's oak corner (from the scan),
  // a hand's width off the glass, clear of the blinds; an oak end panel with a small shelf at the west end; two white counter stools
  box(g, [W, 0.97, N + 0.11], [E - 0.62, 1.01, -3.11], mat.oakDoor); // ~10 cm above the counter, level with its back lip
  // the west end stands on an open oak cubby against the wall (from the scan): about 28 cm wide and 34 cm deep, set back
  // from the window, open towards the room, with a plinth and one shelf; a deep front edge runs along the desk
  const CB = -3.45; // back of the cubby
  box(g, [W, 0, CB], [W + 0.03, 0.97, -3.11], mat.oakDoor, { collide: true });
  box(g, [W + 0.25, 0, CB], [W + 0.28, 0.97, -3.11], mat.oakDoor, { collide: true });
  box(g, [W + 0.03, 0, CB], [W + 0.25, 0.97, CB + 0.02], mat.oakDoor);
  box(g, [W + 0.03, 0, -3.15], [W + 0.25, 0.08, -3.11], mat.oakDoor);   // plinth
  box(g, [W + 0.03, 0.08, CB + 0.02], [W + 0.25, 0.1, -3.12], mat.oak);  // bottom
  box(g, [W + 0.03, 0.45, CB + 0.02], [W + 0.25, 0.47, -3.12], mat.oak); // shelf
  box(g, [W, 0.88, -3.14], [E - 0.62, 0.97, -3.11], mat.oakDoor);       // deep front edge under the top
  for (const cx of [1.6, 2.5]) chair(g, cx, -2.75, 0.72);

  glassPartition(g, SPLIT, W, E);

  // Kitchen run on the east wall, measured from the scan (z north → south):
  // oak corner top -3.59…-3.11 (the desk wraps round), white counter -3.11…-1.51 with the hob (north) and the sink (south),
  // oak base cabinets below (drawers on the left, two doors on the right), tiled splashback.
  // Above: open white shelves with the microwave, a black glass hood over the hob, cream cabinets over the sink and fridge,
  // and an open shelf under the cabinet above the sink.
  const cx = E - 0.6, K0 = -3.59, K1 = -3.11, K2 = -1.51;
  const whiteTop = new THREE.MeshStandardMaterial({ color: 0xf3f0ea, roughness: 0.35 });
  const blackGlass = new THREE.MeshStandardMaterial({ color: 0x0f1316, roughness: 0.08, metalness: 0.4 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xe4dac8, roughness: 0.5 });
  const splash = new THREE.MeshStandardMaterial({ color: 0xcdbfad, roughness: 0.3 });
  box(g, [cx, 0.08, K0], [E, 0.86, K2], mat.oakDoor, { collide: true });            // base cabinets
  box(g, [cx + 0.03, 0, K0], [E, 0.08, K2], mat.dark);                               // kick plate
  for (const z of [-2.94, -2.31, -1.9]) box(g, [cx - 0.003, 0.08, z - 0.004], [cx + 0.003, 0.86, z + 0.004], mat.dark); // door and drawer gaps
  for (const y of [0.67, 0.45]) box(g, [cx - 0.003, y - 0.004, -2.94], [cx + 0.003, y + 0.004, -2.31], mat.dark);       // drawer fronts
  box(g, [cx - 0.02, 0.86, K0], [E, 1.01, K1], mat.oakDoor);                         // oak corner, raised to the desk's height
  box(g, [cx - 0.02, 0.86, K1], [E, 0.9, K2], whiteTop);                             // white counter
  box(g, [E - 0.05, 0.9, K1], [E, 0.98, K2], whiteTop);                              // raised back lip
  box(g, [E - 0.01, 0.98, K1], [E, 1.17, K2], splash, { shadow: false });           // tiled splashback, up to the niches
  box(g, [E - 0.01, 1.17, K1], [E, 1.5, -2.44], splash, { shadow: false });
  box(g, [3.11, 0.9, -2.76], [3.6, 0.912, -2.46], blackGlass);                       // induction hob
  box(g, [3.14, 0.9, -2.28], [3.55, 0.906, -1.87], mat.steel);                       // sink rim
  box(g, [3.19, 0.901, -2.23], [3.5, 0.907, -1.92], mat.dark);                       // sink bowl (reads as depth)
  box(g, [3.57, 0.9, -2.09], [3.6, 1.16, -2.06], mat.steel);                         // tap
  box(g, [3.43, 1.13, -2.09], [3.6, 1.16, -2.06], mat.steel);                        //   spout
  // Open white shelves, north end, microwave on the bottom one
  const sh0 = E - 0.36, sz0 = -3.55, sz1 = -2.92;
  for (const z of [sz0, sz1 - 0.02]) box(g, [sh0, 1.3, z], [E, 2.12, z + 0.02], mat.white);
  for (const y of [1.3, 1.67, 1.88, 2.1]) box(g, [sh0, y, sz0], [E, y + 0.02, sz1], mat.white);
  box(g, [sh0 + 0.04, 1.32, -3.5], [E - 0.02, 1.62, -2.99], mat.steel);              // microwave
  box(g, [sh0 + 0.035, 1.36, -3.42], [sh0 + 0.04, 1.58, -3.12], mat.dark);           //   its window
  // Electric kettle on the desk corner by the microwave (from the scan): a rounded light blue body on a dark base,
  // handle at the back, standing on a small dark mat
  const kettleBlue = new THREE.MeshStandardMaterial({ color: 0xa9d3e3, roughness: 0.3 });
  const kx = 3.22, kz = -3.38, ky = 1.01;
  box(g, [kx - 0.1, ky, kz - 0.1], [kx + 0.1, ky + 0.004, kz + 0.1], mat.dark, { shadow: false });            // mat
  const prof = [[0, 0], [0.086, 0], [0.092, 0.035], [0.091, 0.09], [0.085, 0.14], [0.074, 0.175], [0.06, 0.188], [0.02, 0.192], [0, 0.192]].map(([r, y]) => new THREE.Vector2(r, y));
  const kBody = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), kettleBlue); kBody.position.set(kx, ky + 0.02, kz); kBody.castShadow = true; g.add(kBody);
  const kBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.082, 0.018, 32), mat.dark); kBase.position.set(kx, ky + 0.013, kz); g.add(kBase);
  const kHandle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 20, Math.PI), kettleBlue);   // handle on the south side
  kHandle.rotation.set(0, -Math.PI / 2, -Math.PI / 2); kHandle.position.set(kx, ky + 0.12, kz + 0.075); g.add(kHandle);
  const kLid = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.02, 16), kettleBlue); kLid.position.set(kx, ky + 0.22, kz); g.add(kLid); // lid knob
  const kSpout = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 12), kettleBlue); kSpout.rotation.x = -(Math.PI / 2 + 0.7); kSpout.position.set(kx, ky + 0.17, kz - 0.09); g.add(kSpout); // spout to the north
  // Black glass hood unit over the hob
  box(g, [E - 0.38, 1.5, -2.91], [E, 2.56, -2.33], blackGlass);
  box(g, [E - 0.4, 1.48, -2.91], [E, 1.51, -2.33], mat.steel);
  // Cream cabinets: over the sink, over the fridge, and a top row to the ceiling line
  box(g, [E - 0.35, 1.7, -2.33], [E, 2.11, K2], cream);
  box(g, [E - 0.35, 1.79, -1.49], [E, 2.11, -0.78], cream);
  box(g, [E - 0.35, 2.13, -2.33], [E, 2.56, -0.66], cream);
  box(g, [E - 0.355, 2.11, -2.33], [E, 2.13, -0.66], mat.dark);                      // shadow gap between the rows
  // Two open niches set into the wall above the tap (from the scan, about 25 cm deep)
  for (const [z0, z1, y0, y1] of [[-2.42, -1.52, 1.19, 1.5], [-2.32, -1.52, 1.52, 1.7]]) {
    const nich = [box(g, [E + 0.24, y0, z0], [E + 0.26, y1, z1], splash, { shadow: false }),  // back
      box(g, [E, y0 - 0.02, z0], [E + 0.26, y0, z1], splash),                                   // shelf (bottom)
      box(g, [E, y1, z0], [E + 0.26, y1 + 0.02, z1], splash)];                                  // top
    for (const z of [z0 - 0.02, z1]) nich.push(box(g, [E, y0, z], [E + 0.26, y1, z + 0.02], splash)); // sides
    nich.forEach((m) => (m.userData.wall = 'z')); // hide with the east wall in the view from above
  }
  // Fridge: freezer on top, door gap, two handles, kick plate (front faces west)
  const fridge = new THREE.MeshStandardMaterial({ color: 0xdfe2e4, roughness: 0.25, metalness: 0.55 });
  box(g, [cx + 0.07, 0.06, -1.43], [E, 1.75, -0.88], fridge, { collide: true });
  box(g, [cx + 0.064, 0.1, -1.4], [cx + 0.067, 1.7, -0.91], mat.white);   // lit white inside, seen when a door opens
  box(g, [cx + 0.02, 0, -1.41], [cx + 0.08, 0.06, -0.9], mat.dark);
  const fd = { x: cx + 0.045, z: -1.43, along: 'z', dir: 1, width: 0.55, thick: 0.05, material: fridge, openAngle: -Math.PI / 2 * 0.85 };
  hingedDoor(g, { ...fd, y0: 1.2, height: 0.55 });   // freezer
  hingedDoor(g, { ...fd, y0: 0.06, height: 1.12 });  // main door
  return g;
}

export const tvControl = {};

export function living() {
  const g = new THREE.Group(); g.name = 'living';
  floor(g, W, SPLIT, E, S, mat.floor(E - W, S - SPLIT), mat.ceiling);
  // West wall: opening north of the TV (z -0.36–0.28) to the bedroom; south of the TV, the toilet door and the laundry cupboard door
  wall(g, 'z', W, 0.28, S, mat.wall, [[1.62, 2.32, 0, 2.1], [2.5, 3.25, 0, 2.45]]);
  // Laundry cupboard: full-height oak door, two vertical panels (closed)
  hingedDoor(g, { x: W, z: 3.25, along: 'z', dir: -1, width: 0.75, height: 2.45, material: mat.oakDoor, openAngle: -Math.PI / 2 * 0.9, auto: true });
  // Toilet door: white casing, oak leaf (closed)
  for (const [a, b] of [[1.58, 1.625], [2.315, 2.36]]) box(g, [W - 0.06, 0, a], [W + 0.06, 2.14, b], mat.white);
  box(g, [W - 0.06, 2.095, 1.58], [W + 0.06, 2.14, 2.36], mat.white);
  hingedDoor(g, { x: W, z: 2.32, along: 'z', dir: -1, width: 0.7, height: 2.1, material: mat.oakDoor, openAngle: Math.PI / 2 * 0.9, auto: true });
  wall(g, 'z', E + 0.05, SPLIT, S, mat.wall);
  wall(g, 'x', S + 0.05, W - 0.05, E + 0.05, mat.wall, [[1.4, 2.3, 0, 2.1]]); // front door

  // East wall behind the sofa: a 20 cm deep wall with a recessed niche holding three oak shelves; solid wall below the lowest shelf
  const F = E - 0.2; // face of the thick wall
  for (const [a, b] of [[[F, 0, 0.03], [E, H, 1.6]], [[F, 0, 2.94], [E, H, S]], [[F, 2.45, 1.6], [E, H, 2.94]], [[F, 0, 1.6], [E, 1.33, 2.94]]]) {
    box(g, a, b, mat.wall, { collide: a[1] === 0 }).userData.wall = 'z'; // part of the outer wall: hidden by the cutaway
  }
  for (const y of [1.33, 1.71, 2.1]) box(g, [F + 0.01, y, 1.6], [E, y + 0.03, 2.94], mat.oak);
  box(g, [F + 0.03, 1.36, 2.4], [E - 0.03, 1.4, 2.7], mat.white); // router
  for (const [z0, y0, img] of [[0.85, 1.72, 0], [1.25, 1.82, 1]]) {
    box(g, [F - 0.03, y0, z0], [F, y0 + 0.55, z0 + 0.3], mat.oak);
    box(g, [F - 0.035, y0 + 0.04, z0 + 0.04], [F - 0.03, y0 + 0.51, z0 + 0.26],
      new THREE.MeshStandardMaterial({ map: mat.canvasTexture(64, 112, (c, w, h) => flower(c, w, h, img)) }));
  }
  // Entrance (south wall, from the scan): dark wenge front door; to its left a white pillar and an alcove
  // with a covered oak shoe cabinet, two floating shelves above, and the AC high on the wall
  const wenge = new THREE.MeshStandardMaterial({ color: 0x3a2b23, roughness: 0.55 });
  box(g, [1.4, 0, S - 0.02], [2.3, 2.1, S + 0.03], wenge);
  for (const [a, b] of [[1.36, 1.4], [2.3, 2.34]]) box(g, [a, 0, S - 0.04], [b, 2.14, S + 0.02], mat.dark);
  box(g, [1.36, 2.1, S - 0.04], [2.34, 2.14, S + 0.02], mat.dark);
  box(g, [2.15, 0.98, S - 0.09], [2.22, 1.01, S - 0.02], mat.steel);  // lever handle
  const al0 = 2.65, al1 = F;                                          // alcove between pillar and the thick east wall
  box(g, [al0 - 0.12, 0, S - 0.32], [al0, H, S - 0.05], mat.wall, { collide: true }).userData.wall = 'x';
  box(g, [al0, 0, S - 0.4], [al1, 0.86, S - 0.05], mat.oakDoor, { collide: true });             // shoe cabinet
  box(g, [al0, 0.86, S - 0.42], [al1, 0.9, S - 0.05], mat.oak);
  box(g, [(al0 + al1) / 2 - 0.004, 0.04, S - 0.405], [(al0 + al1) / 2 + 0.004, 0.84, S - 0.4], mat.counter);
  for (const x of [(al0 + al1) / 2 - 0.08, (al0 + al1) / 2 + 0.05]) box(g, [x, 0.7, S - 0.42], [x + 0.03, 0.8, S - 0.405], mat.steel);
  for (const y of [1.35, 1.75]) box(g, [al0, y, S - 0.3], [al1, y + 0.03, S - 0.05], mat.oak);
  acUnit(g, box(g, [al0, 2.2, S - 0.27], [al1, 2.48, S - 0.05], mat.ac), [(al0 + al1) / 2, 2.215, S - 0.27], 'nz');

  // Grey two-cushion sofa bed along the east wall (top-down scan: 2.4 m long, 74 cm deep, no chaise)
  const sofa = new THREE.MeshStandardMaterial({ color: 0xaeb3b6, roughness: 0.95 });
  const B = E - 0.2, sx = B - 0.74, z0 = -0.2, z1 = 2.22;
  box(g, [sx, 0.1, z0], [B - 0.02, 0.4, z1], sofa, { collide: true });
  box(g, [sx + 0.03, 0.4, z0 + 0.14], [B - 0.22, 0.47, (z0 + z1) / 2 - 0.01], sofa); // seat cushions
  box(g, [sx + 0.03, 0.4, (z0 + z1) / 2 + 0.01], [B - 0.22, 0.47, z1 - 0.14], sofa);
  box(g, [B - 0.22, 0.4, z0 + 0.12], [B - 0.02, 0.88, z1 - 0.12], sofa);             // back
  for (const [a, b] of [[z0, z0 + 0.13], [z1 - 0.13, z1]]) box(g, [sx, 0.4, a], [B - 0.02, 0.62, b], sofa); // arms
  for (const [a, b, c] of [[0.05, 0.5, 0xf2a58a], [1.55, 2.0, 0xc3ccd3]]) {
    box(g, [B - 0.36, 0.47, a], [B - 0.23, 0.85, b], new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  }

  // Small centre table in front of the sofa: clear glass top on a black frame with a lower shelf (from the scan)
  const blk = new THREE.MeshStandardMaterial({ color: 0x232426, roughness: 0.5, metalness: 0.4 });
  const ct = [2.0, 0.68, 2.4, 1.15]; // x0, z0, x1, z1
  const tableGlass = new THREE.MeshStandardMaterial({ color: 0xcfe0dc, roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false });
  box(g, [ct[0], 0.405, ct[1]], [ct[2], 0.415, ct[3]], tableGlass, { collide: true, shadow: false });
  for (const [x0, z0, x1, z1] of [[ct[0], ct[1], ct[2], ct[1] + 0.02], [ct[0], ct[3] - 0.02, ct[2], ct[3]], [ct[0], ct[1] + 0.02, ct[0] + 0.02, ct[3] - 0.02], [ct[2] - 0.02, ct[1] + 0.02, ct[2], ct[3] - 0.02]])
    box(g, [x0, 0.37, z0], [x1, 0.4, z1], blk); // frame rim under the glass
  box(g, [ct[0] + 0.02, 0.12, ct[1] + 0.02], [ct[2] - 0.02, 0.135, ct[3] - 0.02], blk);
  for (const x of [ct[0] + 0.01, ct[2] - 0.03]) for (const z of [ct[1] + 0.01, ct[3] - 0.03]) box(g, [x, 0, z], [x + 0.02, 0.39, z + 0.02], blk);
  // TV unit on the west wall (from the scan): oak sides down to the floor, oak-backed cubby with a shelf
  // above the TV, the TV on the wall, an open oak console with a dark inside below it
  const tz0 = 0.45, tz1 = 1.5, tx = W + 0.05, d = 0.3;
  box(g, [tx, 0, tz0 - 0.05], [tx + d, 2.25, tz0], mat.oakDoor, { collide: true });
  box(g, [tx, 0, tz1], [tx + d, 2.25, tz1 + 0.05], mat.oakDoor, { collide: true });
  box(g, [tx, 2.19, tz0], [tx + d, 2.25, tz1], mat.oak);                      // top
  box(g, [tx + 0.005, 1.97, tz0], [tx + 0.02, 2.19, tz1], mat.oak);            // cubby back panel
  box(g, [tx, 1.94, tz0], [tx + d - 0.02, 1.97, tz1], mat.oak);                // shelf above the TV
  box(g, [tx + 0.005, 1.0, tz0], [tx + 0.015, 1.94, tz1], new THREE.MeshStandardMaterial({ color: 0xece4d6, roughness: 0.8 })); // light panel behind the TV
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.12, 20), mat.white);
  pot.position.set(tx + 0.15, 2.03, 1.0); g.add(pot);
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), mat.leaf); leaves.scale.set(1.3, 0.6, 1.3);
  leaves.position.set(tx + 0.15, 2.12, 1.0); g.add(leaves);
  const tv = box(g, [tx, 1.18, 0.52], [tx + 0.06, 1.77, 1.43], mat.screen);     // TV: tap to switch on
  const tvGlow = new THREE.PointLight(0x9fc4ff, 0, 4, 1.5);
  tvGlow.position.set(tx + 1.1, 1.1, 0.98); g.add(tvGlow);
  let tvOn = false, flicker;
  const toggleTV = () => {
    tvOn = !tvOn;
    tv.material.emissive.setHex(tvOn ? 0x7f9fc6 : 0x000000); tv.material.roughness = tvOn ? 0.9 : 0.15; tv.userData.baseEmissive = tv.material.emissive.getHex();
    clearInterval(flicker);
    tvGlow.intensity = tvOn ? 1.2 : 0;
    if (tvOn) flicker = setInterval(() => { tvGlow.intensity = 0.8 + Math.random() * 0.8; }, 140);
  };
  interactive(tv, toggleTV, 'tv');
  tvControl.set = (on) => { if (tvOn !== on) toggleTV(); };
  box(g, [tx, 0.72, tz0], [tx + d, 0.75, tz1], mat.oak);                       // console bottom
  box(g, [tx, 0.97, tz0], [tx + d, 1.0, tz1], mat.oak);                        // console top
  box(g, [tx, 0.75, tz0], [tx + 0.02, 0.97, tz1], mat.counter);                // dark inside
  box(g, [tx + 0.05, 0.75, 0.8], [tx + 0.25, 0.82, 1.15], mat.dark);           // set-top box
  return g;
}

// Horizontal blinds, drawn half way down a window.
function blinds(a, b, y0, y1, at, alongZ = false) {
  const g = new THREE.Group();
  // Slats 7 cm deep on a 5 cm pitch: tilted shut they overlap, so no light gets past
  for (let y = y1 - 0.04; y > y0 + 0.02; y -= 0.05) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 0.07 : b - a, 0.004, alongZ ? b - a : 0.07), mat.blinds);
    s.position.set(alongZ ? at : (a + b) / 2, y, alongZ ? (a + b) / 2 : at); s.rotation[alongZ ? 'z' : 'x'] = 0.12;
    s.castShadow = true; s.userData.slat = true;
    g.add(s);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 0.06 : b - a + 0.02, 0.04, alongZ ? b - a + 0.02 : 0.06), mat.blinds); // head rail
  rail.position.set(alongZ ? at : (a + b) / 2, y1 + 0.005, alongZ ? (a + b) / 2 : at); g.add(rail);
  // brown ladder tapes holding the slats, in front and behind, every half metre or so
  const n = Math.max(2, Math.round((b - a) / 0.5)), step = (b - a - 0.3) / (n - 1);
  for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
    const tape = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 0.002 : 0.016, y1 - y0, alongZ ? 0.016 : 0.002), mat.blindTape);
    const u = a + 0.15 + i * step, off = side * 0.037;
    tape.position.set(alongZ ? at + off : u, (y0 + y1) / 2, alongZ ? u : at + off); g.add(tape);
  }
  return g;
}

// Simple botanical print: a stem with leaves and a flower head.
function flower(g, w, h, kind) {
  g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#6f9a5a'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, h * 0.9); g.lineTo(w / 2, h * 0.35); g.stroke();
  g.fillStyle = '#7aa864';
  for (const [y, d] of [[0.7, 1], [0.55, -1]]) { g.beginPath(); g.ellipse(w / 2 + d * 8, h * y, 9, 3, d * 0.6, 0, 7); g.fill(); }
  g.fillStyle = kind ? '#6b4f8c' : '#e8a13a';
  for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(w / 2 + Math.cos(i * 1.26) * 6, h * 0.3 + Math.sin(i * 1.26) * 6, 5, 3, i * 1.26, 0, 7); g.fill(); }
}

// Glass sliding partition between kitchen and living room along z, from x0 to x1.
// Two equal glass panels, each half the width; the west one is slid almost fully open behind the east one.
export function glassPartition(g, z, x0, x1) {
  const frame = new THREE.MeshStandardMaterial({ color: 0x9a9fa4, roughness: 0.4, metalness: 0.6 }); // grey aluminium
  const glass = new THREE.MeshStandardMaterial({ color: 0xbfd8e0, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false });
  const h = 2.3, f = 0.04, half = (x1 - x0) / 2, slid = 0.12; // slid: how far short of fully open
  box(g, [x0, h, z - 0.05], [x1, H, z + 0.05], mat.wall); // header above the glass
  box(g, [x0, 0, z - 0.04], [x1, 0.015, z + 0.04], frame); // floor track
  const open = x0 + half - slid; // west edge of the slid-open panel
  const moving = new THREE.Group(); g.add(moving); // the west panel: tap to slide it shut or open
  for (const [a, b, dz, p] of [[open, open + half, -0.03, moving], [x0 + half, x1, 0.03, g]]) {
    box(p, [a + f, f, z + dz - 0.02], [b - f, h - f, z + dz + 0.02], glass, { shadow: false, collide: true });
    box(p, [a, 0, z + dz - 0.025], [b, f, z + dz + 0.025], frame);
    box(p, [a, h - f, z + dz - 0.025], [b, h, z + dz + 0.025], frame);
    box(p, [a, 0, z + dz - 0.025], [a + f, h, z + dz + 0.025], frame);
    box(p, [b - f, 0, z + dz - 0.025], [b, h, z + dz + 0.025], frame);
  }
  box(moving, [open + 0.08, 1.0, z - 0.08], [open + 0.1, 1.2, z - 0.06], mat.steel); // handle
  slider(moving, 'x', x0 - open, 0, true);
}

// White dining chair facing north (towards the desk), centred at (x, z).
function chair(g, x, z, seat = 0.44) {
  const w = 0.42, d = 0.42;
  box(g, [x - w / 2, seat, z - d / 2], [x + w / 2, seat + 0.04, z + d / 2], mat.white, { collide: true });
  box(g, [x - w / 2, seat + 0.04, z + d / 2 - 0.04], [x + w / 2, seat + 0.44, z + d / 2], mat.white);
  box(g, [x - w / 2 + 0.03, 0.28, z - d / 2 + 0.03], [x + w / 2 - 0.03, 0.3, z - d / 2 + 0.05], mat.white); // footrest
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const lx = x + dx * (w / 2 - 0.03), lz = z + dz * (d / 2 - 0.03);
    box(g, [lx - 0.015, 0, lz - 0.015], [lx + 0.015, seat, lz + 0.015], mat.white);
  }
}

// Wall-mounted split AC (both units from the scan): cream body, a darker intake grille on top, the air outlet slot
// along the bottom with its louvre flap, and a small display. Tap to swing the flap open (and, with sound on, start its hum).
// body = the unit's box; at = hinge point along the bottom front edge; faces: 'x' = faces +z, 'nz' = faces -z, 'z' = faces -x.
export function acUnit(g, body, at, faces) {
  const alongZ = faces === 'z';
  const cream = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.35 }); // warmer than the walls, as in the scan
  const grille = new THREE.MeshStandardMaterial({ color: 0xb9b09c, roughness: 0.7 });
  const slot = new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.8 });
  body.material = cream;
  const bb = new THREE.Box3().setFromObject(body);
  const n = faces === 'x' ? 1 : faces === 'nz' ? -1 : -1;        // front direction along z (or x for 'z')
  const front = alongZ ? (n < 0 ? bb.min.x : bb.max.x) : (n > 0 ? bb.max.z : bb.min.z);
  const L0 = alongZ ? bb.min.z : bb.min.x, L1 = alongZ ? bb.max.z : bb.max.x, y0 = bb.min.y, y1 = bb.max.y;
  const strip = (a, b, ya, yb, depth, out, m) => { // a strip along the unit's length, standing proud of the front by 'out'
    const f0 = front - n * (depth - out), f1 = front + n * out, lo = Math.min(f0, f1), hi = Math.max(f0, f1);
    return alongZ ? box(g, [lo, ya, a], [hi, yb, b], m) : box(g, [a, ya, lo], [b, yb, hi], m);
  };
  strip(L0 + 0.02, L1 - 0.02, y0 + 0.015, y0 + 0.05, 0.12, 0.004, slot);          // outlet slot under the front
  for (const t of [0.02, 0.05, 0.08, 0.11, 0.14]) strip(L0 + 0.04, L1 - 0.04, y1 - 0.003, y1 + 0.002, t + 0.012, -t, grille); // intake grille bars on top
  strip(L0 + 0.01, L1 - 0.01, y0 + 0.07, y0 + 0.075, 0.01, 0.002, grille);        // seam above the outlet
  strip(L0 + 0.01, L1 - 0.01, y1 - 0.06, y1 - 0.056, 0.01, 0.002, grille);        // seam below the top panel
  const led = new THREE.MeshStandardMaterial({ color: 0x2c8f6a, emissive: 0x2c8f6a, emissiveIntensity: 0 });
  strip(L1 - 0.09, L1 - 0.07, y0 + 0.09, y0 + 0.1, 0.005, 0.003, led);            // display light, on when running
  const len = L1 - L0 - 0.04;
  const flap = new THREE.Mesh(alongZ ? new THREE.BoxGeometry(0.1, 0.012, len) : new THREE.BoxGeometry(len, 0.012, 0.1), cream.clone());
  const pivot = new THREE.Group(); pivot.position.set(...at); g.add(pivot);
  flap.position.set(alongZ ? 0.05 : 0, 0, faces === 'x' ? -0.05 : faces === 'nz' ? 0.05 : 0); pivot.add(flap);
  const tilt = faces === 'nz' ? 0.8 : -0.8;
  let on = false;
  interactive([body, flap], () => { on = !on; led.emissiveIntensity = on ? 1.2 : 0; tween(pivot.rotation, alongZ ? 'z' : 'x', on ? tilt : 0, 0.8); }, 'ac');
}
