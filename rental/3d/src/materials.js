// Shared materials. Textures are drawn on canvases, so there are no image files to download.
import * as THREE from 'three';

function canvasTexture(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}

// Light oak planks, 18 cm wide, as in the scan.
const woodFloor = canvasTexture(512, 512, (g, w, h) => {
  const rows = 4, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * w * 0.45;
    for (let k = -1; k < 2; k++) {
      const x = off + k * w * 0.9, tone = 180 + ((r * 7 + k * 13) % 5) * 6;
      g.fillStyle = `rgb(${tone + 30},${tone - 12},${tone - 60})`;
      g.fillRect(x, r * rh, w * 0.9, rh);
      for (let i = 0; i < 18; i++) { // grain
        g.strokeStyle = `rgba(120,80,40,${0.05 + (i % 3) * 0.03})`;
        g.beginPath(); g.moveTo(x, r * rh + (i + 0.5) * rh / 18);
        g.bezierCurveTo(x + w * 0.3, r * rh + i * rh / 18 + 3, x + w * 0.6, r * rh + i * rh / 18 - 3, x + w * 0.9, r * rh + (i + 0.5) * rh / 18);
        g.stroke();
      }
      g.fillStyle = 'rgba(90,60,30,0.35)'; g.fillRect(x, r * rh, 2, rh);
    }
    g.fillStyle = 'rgba(90,60,30,0.35)'; g.fillRect(0, r * rh, w, 2);
  }
});

// Vertical oak grain for doors and joinery.
const oakGrain = canvasTexture(256, 512, (g, w, h) => {
  g.fillStyle = '#c9a27a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const x = (i * 37) % w, a = 0.04 + (i % 4) * 0.025;
    g.strokeStyle = `rgba(110,70,35,${a})`; g.lineWidth = 1 + (i % 3);
    g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y / 60 + i) * 4, y);
    g.stroke();
  }
});

export const mat = {
  oakDoor: new THREE.MeshStandardMaterial({ map: oakGrain, roughness: 0.55 }),
  floor: (sx, sz) => {
    const t = woodFloor.clone(); t.needsUpdate = true; t.repeat.set(sx / 1.2, sz / 0.48); // planks 12 cm wide, 1.08 m long
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
  },
  wall: new THREE.MeshStandardMaterial({ color: 0xf1ede6, roughness: 0.95 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xf6f4f0, roughness: 1, emissive: 0xfffaf2, emissiveIntensity: 0.35 }),
  oak: new THREE.MeshStandardMaterial({ color: 0xc8a27a, roughness: 0.6 }),
  sheet: new THREE.MeshStandardMaterial({ color: 0xd9d9dc, roughness: 0.5, metalness: 0.05 }),
  pillow: new THREE.MeshStandardMaterial({ color: 0xe4e4e6, roughness: 0.6 }),
  curtain: new THREE.MeshStandardMaterial({ color: 0x6e5e5a, roughness: 0.9, side: THREE.DoubleSide }),
  sheer: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
  glass: new THREE.MeshStandardMaterial({ color: 0xdff0ff, emissive: 0xfff6e0, emissiveIntensity: 0.9 }),
  ac: new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.4 }),
  tile: (sx, sz, color = '#e9e3d8') => new THREE.MeshStandardMaterial({ map: tiles(color, sx, sz), roughness: 0.35 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.95 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.3, metalness: 0.2 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.15, metalness: 0.4 }),
  white: new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.25 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.3, metalness: 0.8 }),
  counter: new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.4 }),
  cabinet: new THREE.MeshStandardMaterial({ color: 0xece7df, roughness: 0.6 }),
  showerGlass: new THREE.MeshStandardMaterial({ color: 0xcfe6ee, roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false }),
  mirror: new THREE.MeshStandardMaterial({ color: 0xdde6ea, roughness: 0.02, metalness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4f7a45, roughness: 0.8 }),
  blinds: new THREE.MeshStandardMaterial({ color: 0xdccdab, roughness: 0.7, side: THREE.DoubleSide }), // warm cream, from the scan
  blindTape: new THREE.MeshStandardMaterial({ color: 0x6e4a2e, roughness: 0.9 }),                       // brown cloth ladder tapes
  canvasTexture,
};

// Square tiles with thin grout lines, 60 cm.
function tiles(color, sx, sz) {
  const t = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
  });
  t.repeat.set(sx / 0.6, sz / 0.6);
  return t;
}
