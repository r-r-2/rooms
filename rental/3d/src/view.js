// The real view out of the kitchen window and balcony, from OpenStreetMap.
import * as THREE from 'three';
import { DATA } from './view-data.js';
import { OV } from './view-overture.js';
import { OV2 } from './view-overture2.js';

const FLOOR_Y = -51;          // 17th floor: the street is ~51 m below the flat's floor
const BEARING = 110;          // the windows (model -z) look east-southeast
const TOWER_Z = 10;           // the tower's centre sits ~10 m behind the window wall
const b = (BEARING * Math.PI) / 180;
const F = [Math.sin(b), -Math.cos(b)];                    // real (east, south) of model -z
const R = [Math.sin(b + Math.PI / 2), -Math.cos(b + Math.PI / 2)]; // real direction of model +x
const toModel = (x, z) => [x * R[0] + z * R[1] + 1.5, -(x * F[0] + z * F[1]) + TOWER_Z];
const undelta = (d) => { const p = [[d[0], d[1]]]; for (let i = 2; i < d.length; i += 2) p.push([p[p.length - 1][0] + d[i], p[p.length - 1][1] + d[i + 1]]); return p; };

// Lit windows for the night: a tile of 4 m bays by 3.2 m floors, some lit
function windowTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const v = rnd(); if (v > 0.45) continue;
    x.fillStyle = v < 0.12 ? '#ffe2b0' : v < 0.3 ? '#ffd08a' : '#cfe0ff';
    x.fillRect(i * 32 + 6, j * 32 + 9, 20, 15);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(1 / 32, 1 / 25.6); return t; // 8 bays of 4 m, 8 floors of 3.2 m per tile
}

// Facades drawn by building type (from Overture's class): apartments get punched windows and balcony slabs,
// offices a glass curtain wall. One tile = 4 bays x 4 floors; each building scales it to its own floor height.
const FAC = {
  a: { walls: ['#eeeae2', '#e4e0d6', '#f2efe9', '#dcd8cf'], glass: '#4e5a63', bayW: 3.6 },
  c: { walls: ['#7d929c', '#6f8791', '#8a979b', '#6d7e86'], glass: '#3e4c55', bayW: 1.6 },
  x: { walls: ['#d9d4ca', '#cfc9be', '#e1ddd5'], glass: '#4d565c', bayW: 3.2 },
  h: { walls: ['#e6dccb'], glass: '#4e5a63', bayW: 3 },
};
const facCache = new Map();
function facadeTex(type, v, ov = {}) {
  const key = type + v + JSON.stringify(ov); if (facCache.has(key)) return facCache.get(key);
  const F = { ...(FAC[type] || FAC.x), ...(ov.glass ? { glass: ov.glass } : {}) }, wall = ov.wall || F.walls[v % F.walls.length];
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = 256; return c; };
  const day = mk(), night = mk(), d = day.getContext('2d'), n = night.getContext('2d');
  d.fillStyle = wall; d.fillRect(0, 0, 256, 256); n.fillStyle = '#000'; n.fillRect(0, 0, 256, 256);
  let s = 11 + v * 97; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let fl = 0; fl < 4; fl++) {
    const y0 = fl * 64;
    if (ov.gold) { // the gold building: diamond pattern panels
      for (let b = 0; b < 8; b++) { d.fillStyle = (b + fl) % 2 ? '#a7792f' : '#c49a4e'; d.beginPath(); d.moveTo(b * 32, y0 + 64); d.lineTo(b * 32 + 16, y0); d.lineTo(b * 32 + 32, y0 + 64); d.fill(); }
      for (let b = 0; b < 8; b++) { const r = rnd(); if (r < 0.3) { n.fillStyle = '#ffd9a0'; n.fillRect(b * 32 + 10, y0 + 30, 12, 26); } }
    } else if (type === 'c') {
      d.fillStyle = F.glass; d.fillRect(0, y0 + 4, 256, 46);                      // glass band
      d.fillStyle = 'rgba(255,255,255,0.12)'; d.fillRect(0, y0 + 4, 256, 10);      // sky reflection at the top of each pane
      d.fillStyle = '#c9ced0'; for (let b = 0; b < 4; b++) d.fillRect(b * 64, y0, 3, 64); // mullions
      for (let b = 0; b < 8; b++) { const r = rnd(); if (r < 0.35) { n.fillStyle = r < 0.12 ? '#cfdcff' : '#ffd9a0'; n.fillRect(b * 32 + 2, y0 + 6, 28, 42); } }
    } else {
      for (let b = 0; b < 4; b++) {
        const x0 = b * 64 + 10; d.fillStyle = F.glass; d.fillRect(x0, y0 + 14, 44, 34);  // window
        d.fillStyle = 'rgba(255,255,255,0.10)'; d.fillRect(x0, y0 + 14, 44, 6);
        const r = rnd(); if (r < 0.32) { n.fillStyle = r < 0.08 ? '#cfdcff' : r < 0.22 ? '#ffc979' : '#ffe0ae'; n.fillRect(x0 + 2, y0 + 16, 40, 30); }
      }
      if (type === 'a') { d.fillStyle = 'rgba(0,0,0,0.13)'; d.fillRect(0, y0 + 56, 256, 4); d.fillStyle = 'rgba(255,255,255,0.5)'; d.fillRect(0, y0 + 52, 256, 4); } // balcony slab
    }
  }
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const r = { map: tex(day, true), em: tex(night, true), bayW: F.bayW }; facCache.set(key, r); return r;
}
const facadeMats = [], goldMats = [];
// Sunset glint: the sun sets behind the flat, so glass facing the balcony catches it.
// k fades it in at Evening; strong = how mirror-like the glass is.
const glint = { k: { value: 0 }, dir: { value: new THREE.Vector3(0.3, 0.1, 1).normalize() } };
function addGlint(m, strong) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.gK = glint.k; sh.uniforms.gDir = glint.dir;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGP; varying vec3 vGN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvGP = (modelMatrix * vec4(transformed, 1.0)).xyz; vGN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float gK; uniform vec3 gDir; varying vec3 vGP; varying vec3 vGN;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (gK > 0.0) { vec3 Nw = normalize(vGN), Vw = normalize(cameraPosition - vGP), Rr = reflect(-Vw, Nw);
          float facing = max(dot(Nw, gDir), 0.0), glare = pow(max(dot(Rr, gDir), 0.0), ${strong ? '40.0' : '10.0'});
          float pane = 1.0 - smoothstep(0.25, 0.6, dot(diffuseColor.rgb, vec3(0.33)));   // glass panes catch more than frames
          gl_FragColor.rgb += gK * (vec3(1.0, 0.5, 0.18) * facing * 0.1 + vec3(1.0, 0.55, 0.22) * glare * (0.3 + pane) * ${strong ? '0.8' : '0.3'}); }`);
  };
  m.customProgramCacheKey = () => 'glint' + (strong ? 1 : 0);
}
function facade(type, floorH, seed, ov) {
  const v = Math.abs(Math.round(seed)) % 4, t = facadeTex(type, v, ov);
  const map = t.map.clone(), em = t.em.clone(); [map, em].forEach((x) => x.repeat.set(1 / (4 * t.bayW), 1 / (4 * floorH)));
  const m = new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0, roughness: type === 'c' ? 0.35 : 0.85, metalness: type === 'c' ? 0.25 : 0 });
  if (type === 'c') addGlint(m, false);
  facadeMats.push(m); if (ov && ov.gold) { m.userData.em = em; goldMats.push(m); } return m;
}
const ROOFS = [0x8d918f, 0x9a9c98, 0x83888a, 0xa3a39d];
const roofMats = ROOFS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
function label(g, txt, d, h) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 48; const x = c.getContext('2d');
  x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(0, 0, 128, 48); x.fillStyle = '#d00'; x.font = 'bold 34px sans-serif'; x.fillText(txt, 6, 36);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  const pts = d.length > 2 ? undelta(d) : [d]; const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cz = pts.reduce((a, q) => a + q[1], 0) / pts.length;
  const [mx, mz] = toModel(cx, cz); sp.position.set(mx, FLOOR_Y + h + 4, mz); const k = Math.hypot(mx, mz) / 25; sp.scale.set(k * 2.6, k, 1); g.add(sp);
}
export const landmark = { mode: 0, MODES: ['Classic', 'Outline', 'Red and green', 'Colours', 'Show'] };
// The landmark's round tower, from the photos: bronze glass, two pink stripes up the front, an open crown with two raised tips
function landmarkTower(g, d) {
  const pts = undelta(d), cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cz = pts.reduce((a, q) => a + q[1], 0) / pts.length;
  const rad = pts.reduce((a, q) => a + Math.hypot(q[0] - cx, q[1] - cz), 0) / pts.length, H = 192; // 130 m from 32 floors looked short next to the photos; raised to match by eye
  const [mx, mz] = toModel(cx, cz);
  const mk = () => { const c = document.createElement('canvas'); c.width = 512; c.height = 512; return c; };
  const day = mk(), night = mk(), dd = day.getContext('2d'), n = night.getContext('2d');
  dd.fillStyle = '#3d302a'; dd.fillRect(0, 0, 512, 512); n.fillStyle = '#000'; n.fillRect(0, 0, 512, 512);
  let s = 5; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let fl = 0; fl < 32; fl++) for (let b = 0; b < 48; b++) {
    dd.fillStyle = rnd() < 0.5 ? '#4a3a31' : '#35291f'; dd.fillRect(b * 10.67 + 1, fl * 16 + 2, 9, 12);
    if (rnd() < 0.3) { n.fillStyle = rnd() < 0.3 ? '#cfdcff' : '#ffd29a'; n.fillRect(b * 10.67 + 1, fl * 16 + 3, 9, 10); }
  }
  dd.fillStyle = '#e0457f'; for (const u of [0.045, 0.955]) dd.fillRect(u * 512 - 6, 0, 12, 512); // pink stripes, facing the flat
  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const mat = new THREE.MeshStandardMaterial({ map: tex(day), emissiveMap: tex(night), emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.3, metalness: 0.35 });
  facadeMats.push(mat); addGlint(mat, true);
  const face = Math.atan2(-mx, -mz); // turn u=0 (the stripes) toward the flat
  const body = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, H, 48, 1, true), mat); body.position.set(mx, FLOOR_Y + H / 2, mz); body.rotation.y = face; g.add(body);
  const top = new THREE.Mesh(new THREE.CircleGeometry(rad, 48), new THREE.MeshStandardMaterial({ color: 0x5b524c })); top.rotation.x = -Math.PI / 2; top.position.set(mx, FLOOR_Y + H - 6, mz); g.add(top);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x4a3c34, roughness: 0.5, metalness: 0.3 });
  // the crown: a ring wall with two gaps, and two raised tips on either side of the front gap
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 7, 48, 1, true, face + 0.35, Math.PI - 0.7), crownMat); ring.position.set(mx, FLOOR_Y + H + 3.5, mz); g.add(ring);
  const ring2 = ring.clone(); ring2.rotation.y = Math.PI; g.add(ring2);
  const emblem = new THREE.MeshStandardMaterial({ color: 0xc9a043, emissive: 0xffc450, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.4 });
  for (const k of [-0.35, 0.35]) { const a = face + k; const tip = new THREE.Mesh(new THREE.BoxGeometry(5, 12, 1.5), crownMat); tip.position.set(mx + Math.sin(a) * rad, FLOOR_Y + H + 6, mz + Math.cos(a) * rad); tip.rotation.y = a; g.add(tip);
    const em = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), emblem); const a2 = face + k * 1.9; em.position.set(mx + Math.sin(a2) * (rad + 0.3), FLOOR_Y + H - 3, mz + Math.cos(a2) * (rad + 0.3)); em.rotation.y = a2; g.add(em); } // the emblems, lit at night
  // Night lighting, from Rahul's photos: LED fins round the sides and back (the front panel between the stripes is
  // plain glass), two stripes that turn sideways near the top like a T, a warm crown and a white V at the base.
  // Tap the tower to switch: Classic, Outline, Red and green, Colours, Show.
  const finU = { t: { value: 0 }, mode: { value: 0 }, on: { value: 0 }, tint: { value: new THREE.Color(1, 1, 1) } };
  const fins = new THREE.Mesh(new THREE.CylinderGeometry(rad + 0.25, rad + 0.25, H - 4, 96, 1, true), new THREE.ShaderMaterial({
    uniforms: finU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform float t, mode, on; uniform vec3 tint; varying vec2 vUv;
      vec3 hsv(float h){ vec3 k = clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); return k; }
      void main(){
#include <logdepthbuf_fragment>

        float u = vUv.x, v = vUv.y;
        float side = smoothstep(0.04, 0.06, u) * smoothstep(0.96, 0.94, u);                   // 0 on the front panel
        float fin = smoothstep(0.30, 0.0, abs(fract(u * 96.0) - 0.5) * 2.0 - 0.55) * side;    // thin vertical lines
        float TV = 0.935;                                                                     // where the stripes turn
        float up = max(smoothstep(0.010, 0.0, abs(u - 0.05)), smoothstep(0.010, 0.0, abs(u - 0.95))) * step(v, TV + 0.004);
        float arm = smoothstep(0.005, 0.0, abs(v - TV)) * (step(u, 0.21) * step(0.04, u) + step(0.79, u) * step(u, 0.96));
        float stripe = max(up, arm);
        vec3 pink = vec3(1.0, 0.18, 0.42), pinkWhite = vec3(1.0, 0.72, 0.84);
        vec3 c = vec3(1.0, 0.94, 0.9) * fin * 0.9;                                            // Classic: warm white fins
        if (mode > 0.5 && mode < 1.5) c = vec3(0.0);                                           // Outline: only the stripes
        if (mode > 1.5 && mode < 2.5) {                                                        // Red and green: bands down the fins
          float b = floor(v * 5.0); vec3 band = mod(b, 2.0) < 0.5 ? vec3(1.0, 0.08, 0.06) : vec3(0.1, 1.0, 0.25);
          float gap = smoothstep(0.0, 0.02, fract(v * 5.0)) * smoothstep(1.0, 0.98, fract(v * 5.0));
          c = band * fin * gap * 1.1; }
        if (mode > 2.5 && mode < 3.5) c = hsv(fract(t * 0.03)) * fin * 1.0;                    // Colours: one colour, drifting slowly
        if (mode > 3.5) { float ph = mod(t, 24.0); float k;                                     // Show: three patterns in turn
          if (ph < 8.0) k = smoothstep(0.25, 0.0, abs(fract(v - t * 0.35) - 0.5) - 0.2);        // light rising up the fins
          else if (ph < 16.0) k = smoothstep(0.2, 0.0, abs(fract(u + t * 0.12) - 0.5) - 0.25); // a sweep around the tower
          else k = 0.35 + 0.65 * (0.5 + 0.5 * sin(t * 2.2));                                    // a slow pulse
          c = mix(vec3(1.0, 0.92, 0.95), hsv(fract(v * 0.4 + t * 0.05)), 0.55) * fin * k * 1.2; }
        c += (mode > 0.5 && mode < 2.5 ? pinkWhite : pink) * stripe * 1.3;                     // the stripes
        gl_FragColor = vec4(c * on, 1.0);
      }` }));
  fins.position.set(mx, FLOOR_Y + H / 2 - 2, mz); fins.rotation.y = face; fins.renderOrder = 2; g.add(fins);
  // white V at the base, like the legs in the photo
  const vMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false });
  for (const sd of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 16, 0.6), vMat); const a = face + sd * 0.16;
    leg.position.set(mx + Math.sin(a) * (rad + 0.6), FLOOR_Y + 8, mz + Math.cos(a) * (rad + 0.6)); leg.rotation.set(0, 0, 0); leg.rotateOnAxis(new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)), sd * 0.45); g.add(leg); }
  // red aircraft warning lights on the crown tips, blinking slowly
  const avi = new THREE.MeshBasicMaterial({ color: 0xff1a10, transparent: true, opacity: 0, fog: false });
  for (const k of [-0.35, 0.35]) { const a = face + k; const l = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), avi);
    l.position.set(mx + Math.sin(a) * rad, FLOOR_Y + H + 12.6, mz + Math.cos(a) * rad); g.add(l); }
  landmark.meshes = [body, fins]; landmark.u = finU; landmark.crown = crownMat; landmark.v = vMat; landmark.avi = avi;

}
const roofMat = (seed) => roofMats[Math.abs(Math.round(seed)) % roofMats.length];

// Matched by eye to Rahul's photos from the balcony (shapes and positions stay Overture's)
const STYLE = {
  27: { type: 'a', wall: '#f0e2c2', floors: 20 },              // cream tower on the left, balconies
  64: { type: 'c', wall: '#e9ecec', glass: '#6f8a99' },          // white office tower behind it
  71: { type: 'c', wall: '#22343a', glass: '#1d2c33' },          // curved dark glass tower at the far left
  5: { type: 'a', wall: '#eef0ee', floors: 8 },                  // white block on the right, close by
  47: { type: 'a', wall: '#e8b4b4', floors: 7, roof: 0x6f8f55 }, // pink block with the roof garden
  65: { type: 'c', gold: true, floors: 10 },                     // the gold building beside the round tower
};
const LSTYLE = [ // low buildings: [x, z, wall, floors, roof]
  [423, 131, 0xf1d3da, 4, 0xd8d8d6], // the pink-and-white Thai-style building in front of the round tower
  [206, -4, 0xf0dc9c, 6, 0x6f6f6c],  // the yellow building with the pool
  [25, 45, 0xece6dc, 2, 0xb2492f],   // the house with the red tiled roof
];
export function cityView() {
  const g = new THREE.Group(); g.name = 'city';
  const win = windowTexture();
  const side = new THREE.MeshStandardMaterial({ color: 0xb9bdbe, roughness: 0.8, emissive: 0xffffff, emissiveMap: win, emissiveIntensity: 0 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x9a9d9b, roughness: 0.95 });
  const low = new THREE.MeshStandardMaterial({ color: 0xc4bdb2, roughness: 0.95 });
  const ground = new THREE.MeshStandardMaterial({ color: 0x7c8077, roughness: 1 });
  const road = new THREE.MeshStandardMaterial({ color: 0x56595e, roughness: 1 });
  const AREA = { water: 0x6d97ac, river: 0x6d97ac, basin: 0x6d97ac };
  const green = new THREE.MeshStandardMaterial({ color: 0x6c8a5c, roughness: 1 });

  // Ground
  const gr = new THREE.Mesh(new THREE.CircleGeometry(4000, 48), ground); gr.rotation.x = -Math.PI / 2; gr.position.y = FLOOR_Y; g.add(gr);

  // The tower below the flat, so looking down from the balcony shows the building's face
  const tower = new THREE.Mesh(new THREE.BoxGeometry(34, -FLOOR_Y - 0.4, 26), new THREE.MeshStandardMaterial({ color: 0xe4e2dd, roughness: 0.9 }));
  tower.position.set(0.8, FLOOR_Y / 2 - 0.2, -3.95 + 13); g.add(tower);

  // Buildings from Overture Maps: real footprints, real floor counts and building types
  const o = new THREE.Object3D(); let s = 3; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const markMat = window.__markLandmark ? new THREE.MeshStandardMaterial({ color: 0xff6a13 }) : null;
  const FLOOR_H = { a: 3.1, c: 4.0, h: 3.0, x: 3.5, r: 4 };
  const solid = (type, floors, height, d, minFloor = 0, st = {}) => {
    const fh = FLOOR_H[type] || 3.5, h = height || floors * fh + 2, minH = minFloor * fh;
    const pts = undelta(d), cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cz = pts.reduce((a, q) => a + q[1], 0) / pts.length;
    const shape = new THREE.Shape(pts.map(([x, z]) => { const [mx, mz] = toModel(x, z); return new THREE.Vector2(mx, -mz); }));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h - minH, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
    const landmark = markMat && Math.hypot(cx - 460, cz - 140) < 70;
    const m = new THREE.Mesh(geo, landmark ? [roofMat(cx), markMat] : [st.roof ? new THREE.MeshStandardMaterial({ color: st.roof, roughness: 1 }) : roofMat(cx), facade(type, floors ? (h - 2) / floors : fh, cx * 7 + cz, st)]);
    m.position.y = FLOOR_Y + minH; g.add(m);
  };
  OV2.T.forEach(([type0, floors0, height, d], i) => { const st = STYLE[i] || {}; const type = st.type || type0, floors = st.floors || floors0; solid(type, floors, height, d, 0, st); if (window.__labels) label(g, 'T' + i, d, height || floors * (FLOOR_H[type] || 3.5) + 2); });
  if (window.__labels) OV.L.forEach(([x, z, w, dd], i) => { if (w * dd > 500) label(g, 'L' + i, [x, z], 14); });
  for (const [floors, height, minFloor, d] of OV2.P) { if (floors === 32) landmarkTower(g, d); else solid('c', floors, height, d, minFloor); }

  // Low buildings: boxes; type and floors from Overture where it has them, else 2–4 storeys by size
  const LOW = { h: [0xd9c6a8, 0xcbb293, 0xe2d6c0], a: [0xe6e2d8, 0xd8d4ca], c: [0xc9cccc, 0xbfc4c6], x: [0xd3cdc2, 0xc6bfb3, 0xdcd6cb], r: [0x8f969a] };
  const typeAt = (x, z) => OV2.LC.find((q) => Math.abs(q[2] - x) < 4 && Math.abs(q[3] - z) < 4);
  const roofs = []; let thai = null;
  const L = OV.L.concat([[423, 131, 74, 130, -3.01, 14]]), inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), low, L.length);
  L.forEach(([x, z, w, d, ang, h0], i) => {
    const t = typeAt(x, z), type = t ? t[0] : 'x', fl = t ? t[1] : 0, area = w * d;
    let hh = fl ? fl * 3.2 : h0 || (area < 120 ? 6 + rnd() * 3 : area < 400 ? 9 + rnd() * 4 : 11 + rnd() * 5), y = hh / 2;
    if (type === 'r') { hh = 0.4; y = 4.5; } // open roofs and carports: a roof on posts
    const [mx, mz] = toModel(x, z);
    const ux = Math.cos(ang) * R[0] + Math.sin(ang) * R[1], uz = -(Math.cos(ang) * F[0] + Math.sin(ang) * F[1]);
    o.position.set(mx, FLOOR_Y + y, mz); o.rotation.set(0, Math.atan2(-uz, ux), 0); o.scale.set(w, hh, d); o.updateMatrix(); inst.setMatrixAt(i, o.matrix);
    const ls = LSTYLE.find((q) => Math.abs(q[0] - x) < 4 && Math.abs(q[1] - z) < 4);
    if (ls) { hh = ls[3] * 3.3; if (ls === LSTYLE[0]) thai = { x: mx, z: mz, r: o.rotation.y, w, d, hh }; y = hh / 2; o.position.y = FLOOR_Y + y; o.scale.y = hh; o.updateMatrix(); inst.setMatrixAt(i, o.matrix); }
    const longThin = type === 'r' && Math.max(w, d) / Math.min(w, d) > 3;
    const pal = LOW[type]; inst.setColorAt(i, ls ? new THREE.Color(ls[2]) : longThin ? new THREE.Color(0x2f9e85) : new THREE.Color(pal[Math.floor(rnd() * pal.length)]).multiplyScalar(0.92 + rnd() * 0.12));
    // roof colour: the mix seen in the photos (mostly grey and white metal, some blue, red and green)
    if (type !== 'r') { const r = rnd(); const rc = ls ? ls[4] : r < 0.42 ? 0x8a8d8f : r < 0.66 ? 0xb9bcbc : r < 0.8 ? 0xd9dbd9 : r < 0.88 ? 0x3f78c4 : r < 0.94 ? 0xa8493c : 0x3f9b82;
      roofs.push([o.matrix.clone(), rc, hh]); }
  });
  g.add(inst);
  // the Thai-style building in front of the round tower, washed in warm light at night
  const thaiMat = new THREE.MeshBasicMaterial({ color: 0xffcf9a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  if (thai) { const m = new THREE.Mesh(new THREE.BoxGeometry(thai.w + 0.6, thai.hh, thai.d + 0.6), thaiMat); m.position.set(thai.x, FLOOR_Y + thai.hh / 2, thai.z); m.rotation.y = thai.r; g.add(m); }
  const rf = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), roofs.length);
  roofs.forEach(([mtx, c, hh], i) => { const m = mtx.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.5 + 0.15 / hh, 0)).multiply(new THREE.Matrix4().makeScale(1.02, 0.3 / hh, 1.02)); rf.setMatrixAt(i, m); rf.setColorAt(i, new THREE.Color(c)); });
  g.add(rf);

  // Skytrain: elevated deck on columns, with a train running along it
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9e9c97, roughness: 0.9 });
  const DECK_Y = FLOOR_Y + 12, deck = [], cols = [], paths = [];
  for (const d of OV2.B) {
    const p = undelta(d).map(([x, z]) => toModel(x, z)); paths.push(p);
    let run = 0;
    for (let i = 1; i < p.length; i++) { const [ax, az] = p[i - 1], [bx, bz] = p[i], len = Math.hypot(bx - ax, bz - az);
      deck.push([ax, az, bx, bz, len]);
      for (let t = (30 - run % 30); t < len; t += 30) cols.push([ax + (bx - ax) * t / len, az + (bz - az) * t / len]);
      run += len; }
  }
  const dk = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), concrete, deck.length);
  deck.forEach(([ax, az, bx, bz, len], i) => { o.position.set((ax + bx) / 2, DECK_Y, (az + bz) / 2); o.rotation.set(0, -Math.atan2(bz - az, bx - ax), 0); o.scale.set(len + 0.6, 1.4, 5.5); o.updateMatrix(); dk.setMatrixAt(i, o.matrix); });
  const cl = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.9, 0.9, 1, 10), concrete, cols.length);
  cols.forEach(([x, z], i) => { o.position.set(x, FLOOR_Y + (DECK_Y - FLOOR_Y) / 2, z); o.rotation.set(0, 0, 0); o.scale.set(1, DECK_Y - FLOOR_Y, 1); o.updateMatrix(); cl.setMatrixAt(i, o.matrix); });
  g.add(dk, cl);
  // Stations where OpenStreetMap has platforms
  for (const [x, z, ang] of [[-63, 1020, -1.23], [488, -540, -1.24]]) {
    const [mx, mz] = toModel(x, z), ux = Math.cos(ang) * R[0] + Math.sin(ang) * R[1], uz = -(Math.cos(ang) * F[0] + Math.sin(ang) * F[1]);
    const st = new THREE.Mesh(new THREE.BoxGeometry(150, 7, 24), concrete); st.position.set(mx, DECK_Y + 3, mz); st.rotation.y = Math.atan2(-uz, ux); g.add(st);
    const rf = new THREE.Mesh(new THREE.BoxGeometry(154, 0.6, 27), new THREE.MeshStandardMaterial({ color: 0x8e9aa0, roughness: 0.6, metalness: 0.3 })); rf.position.set(mx, DECK_Y + 7, mz); rf.rotation.y = st.rotation.y; g.add(rf);
  }
  // 4-car trains, three on each track, the two tracks going opposite ways (picked: the two tracks with the most length near the flat)
  const near = (p) => p.reduce((acc, q, i) => i ? acc + (Math.hypot(q[0], q[1]) < 900 ? Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0) : 0, 0);
  const tracks = paths.slice().sort((p, q) => near(q) - near(p)).slice(0, 2);
  const carMat = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.4, metalness: 0.3 });
  const winMat = new THREE.MeshStandardMaterial({ color: 0x1f262c, roughness: 0.3, emissive: 0xfff0d0, emissiveIntensity: 0 }); // window band, lit at night
  const trains = tracks.flatMap((track, ti) => {
    const seg = []; let total = 0; for (let i = 1; i < track.length; i++) { const l = Math.hypot(track[i][0] - track[i - 1][0], track[i][1] - track[i - 1][1]); seg.push([track[i - 1], track[i], total, l]); total += l; }
    const at = (dd) => { dd = Math.max(0, Math.min(total, dd)); const sg = seg.find((q) => dd <= q[2] + q[3]) || seg[seg.length - 1]; const k = (dd - sg[2]) / sg[3]; return [sg[0][0] + (sg[1][0] - sg[0][0]) * k, sg[0][1] + (sg[1][1] - sg[0][1]) * k]; };
    const makeCars = () => [0, 1, 2, 3].map(() => { const c = new THREE.Mesh(new THREE.BoxGeometry(21, 3.6, 3.1), carMat); const band = new THREE.Mesh(new THREE.BoxGeometry(20.4, 1.1, 3.4), winMat); band.position.y = 0.5; c.add(band); g.add(c); return c; });
    // where this track crosses the view straight ahead (model x≈0, in front): trains loop around that point
    let d0 = 0, best = 1e9; for (let dd = 0; dd < total; dd += 5) { const [x, z] = at(dd); if (z < 0 && Math.abs(x) < best) { best = Math.abs(x); d0 = dd; } }
    const lo = Math.max(0, d0 - 700), hi = Math.min(total, d0 + 700), dir = ti === 0 ? 1 : -1;
    // three trains per track, evenly spaced round the loop: one passes each way about every 40 s
    const loop = hi - lo + 180, start = dir > 0 ? d0 - 250 : d0 + 420;
    return [0, 1, 2].map((k) => { let pos = start + k * loop / 3; while (pos > hi + 90) pos -= loop; return { at, total, cars: makeCars(), dir, lo, hi, pos }; });
  });
  g.trains = trains;
  g.update = (dt) => {
    if (landmark.u) { landmark.u.t.value += dt; landmark.avi.opacity = landmark.u.on.value * (Math.sin(landmark.u.t.value * 3.0) > 0 ? 1 : 0.15); }
    for (const t of trains) {
      t.pos += t.dir * dt * 14; if (t.pos > t.hi + 90) t.pos = t.lo - 90; if (t.pos < t.lo - 90) t.pos = t.hi + 90; // loop around the stretch in view
      t.cars.forEach((c, i) => { const d = t.pos - t.dir * i * 22, p = t.at(d), q = t.at(d - 10); c.visible = d > t.lo && d < t.hi; c.position.set(p[0], DECK_Y + 2.6, p[1]); c.rotation.y = -Math.atan2(p[1] - q[1], p[0] - q[0]); });
    }
  };


  // Roads as flat strips, parks and water as flat shapes
  const W = { primary: 16, secondary: 11, tertiary: 8 }, segs = [];
  for (const [k, d] of DATA.G) {
    const p = undelta(d).map(([x, z]) => toModel(x, z));
    if (k.startsWith('r:')) { const w = W[k.slice(2).replace('_link', '')] || 7; for (let i = 1; i < p.length; i++) segs.push([p[i - 1], p[i], w]); continue; }
    const kind = k.split(':')[1];
    const shape = new THREE.Shape(p.map(([mx, mz]) => new THREE.Vector2(mx, -mz)));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), AREA[kind] ? new THREE.MeshStandardMaterial({ color: AREA[kind], roughness: 0.3 }) : green);
    m.rotation.x = -Math.PI / 2; m.position.y = FLOOR_Y + 0.15; g.add(m);
  }
  // Trees: scattered inside OpenStreetMap's parks, gardens and green strips nearby (the tree-lined road ahead is one)
  const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if ((p[i][1] > z) !== (p[j][1] > z) && x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; } return c; };
  const trees = [];
  for (const [k, d] of DATA.G) { if (!/a:(grass|garden|park|wood)/.test(k)) continue; const p = undelta(d);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    if (Math.hypot((x0 + x1) / 2, (z0 + z1) / 2) > 800) continue;
    const n = Math.min(400, Math.round((x1 - x0) * (z1 - z0) / 140));
    for (let i = 0; i < n * 3 && trees.length < 2500; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (inPoly(x, z, p) && rnd() < 0.55) trees.push(toModel(x, z)); } }
  const tr = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), trees.length);
  trees.forEach(([x, z], i) => { const r = 2.5 + rnd() * 3; o.position.set(x, FLOOR_Y + 2 + r * 0.7, z); o.rotation.set(0, rnd() * 6, 0); o.scale.set(r, r * 0.75, r); o.updateMatrix(); tr.setMatrixAt(i, o.matrix); tr.setColorAt(i, new THREE.Color().setHSL(0.26 + rnd() * 0.07, 0.5, 0.1 + rnd() * 0.07)); });
  g.add(tr);
  const rd = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.1, 1), road, segs.length);
  segs.forEach(([a, c, w], i) => {
    const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz);
    o.position.set((a[0] + c[0]) / 2, FLOOR_Y + 0.25, (a[1] + c[1]) / 2); o.rotation.set(0, -Math.atan2(dz, dx), 0); o.scale.set(len + w * 0.5, 1, w); o.updateMatrix(); rd.setMatrixAt(i, o.matrix);
  });
  g.add(rd);

  // Filler skyline past the mapped area (made up, so the horizon isn't empty)
  const far = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), side, 420);
  for (let i = 0; i < 420; i++) {
    const a = rnd() * Math.PI * 2, r = 1500 + rnd() * 1800, h = 15 + rnd() * rnd() * 140, w = 18 + rnd() * 40;
    o.position.set(Math.cos(a) * r, FLOOR_Y + h / 2, Math.sin(a) * r); o.rotation.set(0, rnd() * 3, 0); o.scale.set(w, h, w * (0.6 + rnd())); o.updateMatrix(); far.setMatrixAt(i, o.matrix);
  }
  g.add(far);

  const mats = new Set(); g.traverse((m) => { if (m.isMesh) [].concat(m.material).forEach((x) => x.color && !x.isMeshBasicMaterial && mats.add(x)); });
  mats.forEach((m) => (m.userData.base = m.color.clone()));
  g.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
  g.userData.backdrop = true;
  // Sky dome: gradient, a glow where the sun is, and cumulus clouds like in the photos
  const cloudTex = (() => { const c = document.createElement('canvas'); c.width = 2048; c.height = 512; const x = c.getContext('2d');
    let q = 21; const r = () => ((q = (q * 16807) % 2147483647) / 2147483647);
    const puff = (bx, by, br, col, a) => { for (const dx of [-2048, 0, 2048]) { const gr = x.createRadialGradient(bx + dx, by, 0, bx + dx, by, br); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.7, `rgba(${col},${a * 0.8})`); gr.addColorStop(1, `rgba(${col},0)`); x.fillStyle = gr; x.beginPath(); x.arc(bx + dx, by, br, 0, 7); x.fill(); } };
    const clusters = []; for (let k = 0; k < 55; k++) { const cy = 90 + r() * 380, sz = 12 + r() * 34 * (cy / 470); const cx = r() * 2048, n = 8 + r() * 16, ps = [];
      for (let j = 0; j < n; j++) ps.push([cx + (r() - 0.5) * sz * 5, cy - r() * sz * 1.2, sz * (0.45 + r() * 0.6)]); clusters.push(ps); }
    for (const ps of clusters) for (const [bx, by, br] of ps) puff(bx, by + br * 0.35, br, '150,160,178', 0.9);   // grey undersides
    for (const ps of clusters) for (const [bx, by, br] of ps) puff(bx, by - br * 0.15, br * 0.92, '255,255,255', 0.95); // sunlit tops
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const skyU = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, glow: { value: new THREE.Color() }, glowDir: { value: new THREE.Vector3(0, 0, -1) }, glowK: { value: 0 }, clouds: { value: cloudTex }, cloudK: { value: 1 }, cloudTint: { value: new THREE.Color(1, 1, 1) } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4600, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform vec3 top, mid, hor, glow, glowDir, cloudTint; uniform float glowK, cloudK; uniform sampler2D clouds; varying vec3 vd;
      void main(){
#include <logdepthbuf_fragment>
 float e = clamp(vd.y, -0.2, 1.0);
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, e)); c = mix(c, top, smoothstep(0.18, 0.75, e));
        float gd = max(dot(normalize(vec3(vd.x, 0.0, vd.z)), normalize(vec3(glowDir.x, 0.0, glowDir.z))), 0.0);
        c += glow * glowK * pow(gd, 3.0) * (1.0 - smoothstep(0.0, 0.35, e));
        vec2 uv = vec2(atan(vd.x, -vd.z) / 6.2832 * 2.0 + 0.5, 1.0 - clamp(e / 0.42, 0.0, 1.0));
        vec4 ct = texture2D(clouds, uv); float cl = ct.a * cloudK * smoothstep(0.01, 0.05, e) * (1.0 - smoothstep(0.38, 0.42, e));
        c = mix(c, ct.rgb * cloudTint, cl);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }` }));
  sky.renderOrder = -1; sky.frustumCulled = false; g.add(sky);

  // Street lamps: warm points along the mapped roads, and a row along the BTS deck
  const lampPts = [];
  for (const [a, c, w] of segs) { const len = Math.hypot(c[0] - a[0], c[1] - a[1]); if (Math.hypot(a[0], a[1]) > 1600 || w < 11) continue;
    const nx = -(c[1] - a[1]) / len, nz = (c[0] - a[0]) / len;
    for (let t = 0; t < len; t += 70) for (const sd of [1]) lampPts.push(a[0] + (c[0] - a[0]) * t / len + nx * sd * (w / 2 + 1), FLOOR_Y + 7, a[1] + (c[1] - a[1]) * t / len + nz * sd * (w / 2 + 1)); }
  for (const [ax, az, bx, bz, len] of deck) for (let t = 0; t < len; t += 45) lampPts.push(ax + (bx - ax) * t / len, DECK_Y + 2.2, az + (bz - az) * t / len);
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,220,160,0.8)'); gr.addColorStop(1, 'rgba(255,160,60,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const lampGeo = new THREE.BufferGeometry(); lampGeo.setAttribute('position', new THREE.Float32BufferAttribute(lampPts, 3));
  const lamps = new THREE.Points(lampGeo, new THREE.PointsMaterial({ map: dot, color: 0xffc27a, size: 4.5, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  lamps.visible = false; g.add(lamps);

  const SKY = { // [top, mid, horizon, glow, glowK, clouds, cloud tint] per time of day
    7: [0x4d6fa8, 0x9db3cf, 0xf0b27a, 0xff7a2a, 0.9, 0.3, 0xffd9bf],    // sunrise behind the round tower, like the photo
    12.5: [0x3f6db5, 0x7fa4d6, 0xc7d6e6, 0xffffff, 0.0, 1.0, 0xffffff], // blue sky with big cumulus
    17.75: [0x2f4677, 0x8790b3, 0xf3b88c, 0xff9a50, 0.55, 0.65, 0xf4c6a6], // sunset behind the flat: golden low sky, glass glinting
    22: [0x0b1020, 0x141c33, 0x2b2f3f, 0xff9a4a, 0.25, 0.15, 0x3a3f50], // night, a faint city glow on the horizon
  };
  g.setTime = (h, night) => {
    const S = SKY[h] || SKY[12.5]; skyU.top.value.set(S[0]); skyU.mid.value.set(S[1]); skyU.hor.value.set(S[2]); skyU.glow.value.set(S[3]); skyU.glowK.value = S[4]; skyU.cloudK.value = S[5]; skyU.cloudTint.value.set(S[6]);
    skyU.glowDir.value.set(0, 0, h < 12 ? -1 : 1);
    lamps.visible = night; glint.k.value = !night && h > 17 ? 1 : 0;
    thaiMat.opacity = night ? 0.13 : 0;
    if (landmark.u) { const on = night ? 1 : 0; /* off while the sun is still out */ landmark.u.on.value = on; landmark.v.opacity = on; landmark.crown.emissive.set(0xffc98a); landmark.crown.emissiveIntensity = on * 0.3; }
    for (const m of goldMats) { m.emissiveMap = night ? null : m.userData.em; m.emissive.set(night ? 0x9a6620 : 0xffffff); m.needsUpdate = true; } // gold building washed in warm light g.fogColor = new THREE.Color(S[2]).lerp(new THREE.Color(S[1]), 0.4);
    side.emissiveIntensity = night ? 1.1 : h > 17 ? 0.12 : 0;
    facadeMats.forEach((m) => (m.emissiveIntensity = night ? 0.75 : h > 17 ? 0.1 : 0)); road.emissive.set(0xff9a3c); road.emissiveIntensity = night ? 0.1 : 0; concrete.emissive.set(0xfff0dc); concrete.emissiveIntensity = night ? 0.06 : 0; winMat.emissiveIntensity = night ? 1.0 : h > 17 ? 0.2 : 0;
    const k = night ? 0.07 : h > 17 ? 0.85 : 1;
    const warm = !night && h > 17 ? new THREE.Color(1.0, 0.82, 0.66) : new THREE.Color(1, 1, 1); // low orange sun
    mats.forEach((m) => m.color.copy(m.userData.base).multiplyScalar(k).multiply(warm));
  };
  return g;
}
