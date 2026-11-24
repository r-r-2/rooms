// Bedroom, measured from the scan (metres). x: west -2.13 → east 1.03, z: north -2.76 → south 0.16.
import * as THREE from 'three';
import { box, wall, H } from '../build.js';
import { mat } from '../materials.js';
import { interactive, hingedDoor, tween, slidingGlass } from '../interact.js';
import { acUnit } from './kitchen_living.js';

const W = -2.13, E = 1.03, N = -2.76, S = 0.16;
const WIN = [-1.77, -0.56]; // full-height window on the north wall

export function bedroom() {
  const g = new THREE.Group(); g.name = 'bedroom';

  // Floor and ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(E - W, S - N), mat.floor(E - W, S - N));
  floor.rotation.x = -Math.PI / 2; floor.position.set((W + E) / 2, 0, (N + S) / 2); floor.receiveShadow = true; floor.userData.floor = true;
  g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(E - W, S - N), mat.ceiling);
  ceil.rotation.x = Math.PI / 2; ceil.position.set((W + E) / 2, H, (N + S) / 2); ceil.userData.ceiling = true;
  g.add(ceil);

  // Walls (south side is open to the corridor)
  wall(g, 'x', N - 0.05, W - 0.1, E, mat.wall, [[WIN[0], WIN[1], 0.02, 2.3]]);
  wall(g, 'z', W - 0.05, N, S, mat.wall);
  wall(g, 'z', E + 0.05, N, -0.36, mat.wall); // open to the living room from z -0.36
  // Sliding glass door onto a small balcony
  const clear = new THREE.MeshStandardMaterial({ color: 0x5f6f76, roughness: 0.05, transparent: true, opacity: 0.07, depthWrite: false }); // dark and faint so it does not go milky at night
  slidingGlass(g, { axis: 'x', at: N - 0.05, from: WIN[0], to: WIN[1], height: 2.28, glass: clear }); // sliding door to the balcony
  balcony(g);

  // Oak wall panel behind the bed, up to 1.15 m
  box(g, [W, 0, N + 0.02], [W + 0.03, 1.15, S - 0.05], mat.oak);

  // Bed: queen, head against the west wall
  const bx = [W + 0.03, W + 2.03], bz = [-2.16, -0.56];
  box(g, [bx[0], 0.08, bz[0]], [bx[1], 0.3, bz[1]], mat.oak, { collide: true });
  box(g, [bx[0] + 0.02, 0.3, bz[0] + 0.02], [bx[1] - 0.02, 0.52, bz[1] - 0.02], mat.pillow);
  const duvet = box(g, [bx[0] + 0.45, 0.5, bz[0] - 0.03], [bx[1] + 0.03, 0.6, bz[1] + 0.03], mat.sheet);
  duvet.geometry = rounded(duvet.geometry);
  for (const [z0, z1] of [[bz[0] + 0.08, -1.40], [-1.32, bz[1] - 0.08]]) {
    const p = box(g, [bx[0] + 0.06, 0.52, z0], [bx[0] + 0.5, 0.66, z1], mat.pillow);
    p.geometry = rounded(p.geometry);
  }

  // Bedside table in the corner by the window
  box(g, [W + 0.03, 0, N + 0.05], [W + 0.45, 0.45, bz[0] - 0.05], mat.oak, { collide: true });

  // Three-panel mountain print above the bed (one landscape split across three canvases)
  const art = mat.canvasTexture(384, 256, mountains);
  [[-2.0, -1.5], [-1.45, -0.95], [-0.9, -0.4]].forEach(([z0, z1], i) => {
    const t = art.clone(); t.needsUpdate = true; t.offset.x = i / 3; t.repeat.x = 1 / 3;
    box(g, [W + 0.03, 1.38, z0], [W + 0.06, 1.92, z1], new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
  });

  // Curtains and sheer
  const left = drape(-2.08, -1.70, mat.curtain, N + 0.12), right = drape(-0.62, -0.08, mat.curtain, N + 0.12);
  const sheer = drape(WIN[0], WIN[1], mat.sheer, N + 0.06); sheer.castShadow = false; // let the morning sun through
  g.add(left, right, sheer);
  // Tap a curtain to draw both across the window, tap again to open them
  const mid = (WIN[0] + WIN[1]) / 2;
  const spans = [[left, [-2.08, -1.70], [-2.08, mid + 0.03]], [right, [-0.62, -0.08], [mid - 0.03, -0.08]]];
  let drawn = false;
  interactive([left, right], () => {
    drawn = !drawn;
    for (const [m, open, shut] of spans) {
      const [a, b] = drawn ? shut : open, w0 = open[1] - open[0];
      tween(m.scale, 'x', (b - a) / w0, 1.2); tween(m.position, 'x', (a + b) / 2, 1.2);
    }
  }, 'curtain');
  box(g, [-2.1, 2.45, N + 0.03], [0, 2.48, N + 0.14], mat.ac); // curtain rail

  // Air conditioner
  acUnit(g, box(g, [-0.05, 2.12, N], [0.75, 2.42, N + 0.22], mat.ac), [0.35, 2.135, N + 0.22], 'x');

  // East wall (from the scan): oak-framed recessed unit with a top cubby, hexagon prints and a low open shelf
  const ex = E - 0.03, u0 = -2.0, u1 = -0.75;
  for (const [a, b] of [[u0 - 0.04, u0], [u1, u1 + 0.04]]) box(g, [ex - 0.22, 0.68, a], [ex, 2.3, b], mat.oakDoor);
  box(g, [ex - 0.22, 2.26, u0], [ex, 2.3, u1], mat.oakDoor);
  box(g, [ex - 0.22, 1.9, u0], [ex, 1.93, u1], mat.oakDoor);
  box(g, [ex - 0.02, 1.93, u0], [ex, 2.26, u1], mat.oakDoor);   // cubby back
  box(g, [ex - 0.22, 0.68, u0], [ex, 0.71, u1], mat.oakDoor);
  box(g, [ex - 0.22, 0.91, u0], [ex, 0.94, u1], mat.oakDoor);   // low open shelf
  const hex = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.88), new THREE.MeshStandardMaterial({ map: mat.canvasTexture(400, 350, hexagons), transparent: true }));
  hex.rotation.y = -Math.PI / 2; hex.position.set(ex - 0.005, 1.45, (u0 + u1) / 2);
  g.add(hex);

  // Doorway to the living room (z -0.36 to 0.28): oak casing, oak door swung open into the dressing area
  for (const [a, b] of [[-0.4, -0.355], [0.275, 0.32]]) box(g, [E - 0.06, 0, a], [E + 0.06, 2.14, b], mat.oakDoor);
  box(g, [E - 0.06, 2.1, -0.4], [E + 0.06, 2.14, 0.32], mat.oakDoor);
  hingedDoor(g, { x: E + 0.03, z: 0.28, along: 'z', dir: -1, width: 0.64, material: mat.oakDoor, openAngle: Math.PI / 2 * 0.95, open: true, auto: true });

  // Dressing area against the toilet wall: oak dressing table with two drawers, mirror above, cream stool
  const dz = 0.9; // face of the toilet's north wall
  box(g, [0.05, 0.72, dz - 0.45], [E - 0.05, 0.76, dz], mat.oakDoor, { collide: true });
  box(g, [0.05, 0.5, dz - 0.45], [E - 0.05, 0.72, dz - 0.02], mat.oakDoor);
  box(g, [(0.05 + E - 0.05) / 2 - 0.005, 0.52, dz - 0.455], [(0.05 + E - 0.05) / 2 + 0.005, 0.7, dz - 0.45], mat.counter);
  for (const x of [0.3, 0.75]) box(g, [x, 0.6, dz - 0.47], [x + 0.08, 0.62, dz - 0.45], mat.steel);
  box(g, [0.05, 0, dz - 0.4], [0.09, 0.5, dz - 0.04], mat.oakDoor);
  box(g, [E - 0.09, 0, dz - 0.4], [E - 0.05, 0.5, dz - 0.04], mat.oakDoor);
  box(g, [0.1, 0.95, dz - 0.012], [E - 0.08, 2.0, dz - 0.002], mat.mirror);
  box(g, [0.1, 0, 0.35], [0.46, 0.45, 0.7], new THREE.MeshStandardMaterial({ color: 0xece3d2, roughness: 0.8 }), { collide: true });
  return g;
}

// Curtain with folds, hanging from 2.45 m.
function drape(x0, x1, material, z) {
  const geo = new THREE.PlaneGeometry(x1 - x0, 2.4, 40, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 40) * 0.025);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.position.set((x0 + x1) / 2, 1.25, z); m.castShadow = true;
  return m;
}

// Soften a box: pull the top corners in a little so bedding reads as fabric.
function rounded(geo) {
  const g = new THREE.BoxGeometry(geo.parameters.width, geo.parameters.height, geo.parameters.depth, 8, 2, 8);
  const p = g.attributes.position, hw = geo.parameters.width / 2, hd = geo.parameters.depth / 2, hh = geo.parameters.height / 2;
  for (let i = 0; i < p.count; i++) {
    const ex = Math.abs(p.getX(i)) / hw, ez = Math.abs(p.getZ(i)) / hd;
    if (p.getY(i) > 0) p.setY(i, hh - Math.max(0, Math.max(ex, ez) - 0.75) * hh * 2.5);
  }
  g.computeVertexNormals();
  return g;
}

function mountains(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#9ec3d6'); sky.addColorStop(0.45, '#f3d3b8'); sky.addColorStop(0.6, '#f6c9a6');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const ridge = (base, amp, color, seed) => {
    g.fillStyle = color; g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, base + Math.sin(x / 37 + seed) * amp + Math.sin(x / 13 + seed * 2) * amp * 0.3);
    g.lineTo(w, h); g.fill();
  };
  ridge(h * 0.5, 28, '#9cc3cf', 1); ridge(h * 0.6, 34, '#6d9db0', 2); ridge(h * 0.72, 30, '#3f6f86', 3); ridge(h * 0.85, 22, '#2a4f63', 4);
}

function hexagons(g, w, h) {
  const r = 50, cells = [[0, 1, '#9fcfd9'], [1, 0.5, '#2f3f6b'], [2, 0, '#f4f1ea'], [1, 1.5, '#e8a63c'], [2, 1, '#5aa6b8'], [0, 2, '#f4f1ea']];
  for (const [cx, cy, color] of cells) {
    const x = 60 + cx * r * 1.55, y = 60 + cy * r * 1.75;
    g.beginPath();
    for (let k = 0; k < 6; k++) g.lineTo(x + r * Math.cos(Math.PI / 3 * k), y + r * Math.sin(Math.PI / 3 * k));
    g.closePath(); g.fillStyle = color; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x, y, r * 0.35, 0, 7); g.fill();
  }
}

// Small balcony outside the bedroom window: tiled slab, side walls, glass railing, sky beyond.
function balcony(g) {
  const x0 = -2.18, x1 = 0.9, z0 = N - 1.1, z1 = N - 0.1;
  box(g, [x0, -0.06, z0], [x1, 0, z1], mat.tile(x1 - x0, z1 - z0, '#cbc5bb'));
  for (const x of [x0, x1 - 0.1]) box(g, [x, 0, z0], [x + 0.1, H, z1], mat.wall);
  box(g, [x0 + 0.001, H - 0.1, z0], [x1 - 0.001, H, z1], mat.wall); // slab above
  // Metal grill railing: vertical bars between a top and bottom rail
  const grill = new THREE.MeshStandardMaterial({ color: 0x2f3134, roughness: 0.5, metalness: 0.6 });
  box(g, [x0 + 0.1, 1.05, z0 - 0.01], [x1 - 0.1, 1.09, z0 + 0.03], grill);
  box(g, [x0 + 0.1, 0.08, z0 - 0.005], [x1 - 0.1, 0.11, z0 + 0.025], grill);
  for (let x = x0 + 0.16; x < x1 - 0.12; x += 0.11) box(g, [x - 0.008, 0.11, z0], [x + 0.008, 1.05, z0 + 0.016], grill);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), new THREE.MeshBasicMaterial({ map: mat.canvasTexture(64, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#9cc3df'); gr.addColorStop(0.55, '#e3edf2'); gr.addColorStop(0.75, '#f3e6d6'); gr.addColorStop(1, '#d9d4cc');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  }) }));
  // sky plane dropped: the city view is outside now
}
