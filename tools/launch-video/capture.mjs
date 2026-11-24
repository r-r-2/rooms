// Renders one scene of the launch video, frame by frame on a fake clock, so motion is perfectly even.
// node capture.mjs <scene> [test]   -> frames/<scene>/f_0001.jpg ...
import puppeteer from 'puppeteer-core';
import { mkdirSync, rmSync } from 'node:fs';
const [scene, test] = process.argv.slice(2);
const FPS = 30, W = 1920, H = 1080;
const CUTS = [0, 120, 238, 300, 356, 418, 455, 617]; // cut frames, on kicks in the track // frame numbers of the beat-synced cuts
const S = { A: [0, 1], B: [1, 2], BN: [1, 2], C1: [2, 3], C2: [3, 4], C3: [4, 5], C4: [5, 6], D: [6, 7] }[scene];
const N = CUTS[S[1]] - CUTS[S[0]] + 6; // a few spare frames past each cut
const out = `frames/${scene}`; rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });

const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.setViewport({ width: W, height: H });
await p.evaluateOnNewDocument(() => {
  let t = 1000; const q = [];
  performance.now = () => t; Date.now = () => 1.7e12 + t;
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.__step = (ms) => { t += ms; const cbs = q.splice(0); for (const cb of cbs) cb(t); };
});
await p.goto('http://localhost:8780/rental/3d/index.html' + (scene === 'A' ? '#nowelcome' : '#nointro,nowelcome'), { waitUntil: 'load' });
await p.waitForFunction(() => window.__app, { timeout: 120000 });
await p.addStyleTag({ content: '.top,.bottom,.tourbar,.pad,.aim,.use,.hint,#btn-skip,dialog{display:none!important}' });
const step = (n = 1) => p.evaluate((n) => { for (let i = 0; i < n; i++) window.__step(1000 / 30); }, n);
await step(2);

const L = (a, b, k) => a + (b - a) * k, ease = (k) => k * k * (3 - 2 * k);
const shot = (pos0, pos1, look, y = 1.5, fov = 60) => (i) => p.evaluate((x, z, y, look, fov) => {
  const c = window.__app.camera; c.fov = fov; c.updateProjectionMatrix(); c.position.set(x, y, z); c.lookAt(...look);
}, L(pos0[0], pos1[0], ease(i / N)), L(pos0[1], pos1[1], ease(i / N)), y, look, fov);
const tapNear = (action, near) => p.evaluate((action, near) => {
  const v = { x: 0, y: 0, z: 0 }; let best = null, bd = 1e9;
  for (const it of window.__app.items) { if (it.action !== action) continue;
    for (const m of it.meshes) { m.updateWorldMatrix(true, false); const e = m.matrixWorld.elements, d = near ? Math.hypot(e[12] - near[0], e[14] - near[1], near[2] === undefined ? 0 : e[13] - near[2]) : 0; if (d < bd) { bd = d; best = it; } } }
  best?.tap(); return !!best;
}, action, near);

let perFrame = async () => {}, at = {};
const C = [0.76, 0, -0.07], END = { r: +(process.env.R || 13), phi: 0.8, theta: 0.55 };
const spiral = (k) => { const e = k * k * (3 - 2 * k); return { r: L(END.r * 1.5, END.r, e), phi: L(0.12, END.phi, e), theta: L(END.theta - 1.4, END.theta, e) }; };
const place = (sp) => p.evaluate((C, sp) => { const c = window.__app.camera; const s = Math.sin(sp.phi);
  c.position.set(C[0] + sp.r * s * Math.sin(sp.theta), C[1] + sp.r * Math.cos(sp.phi), C[2] + sp.r * s * Math.cos(sp.theta)); c.lookAt(C[0], C[1], C[2]); c.updateMatrixWorld(); }, C, sp);
if (scene === 'A') {
  await step(6);
  // keep the intro's sweep and lights, but fly our own tighter, centred camera path
  await p.evaluate(() => { const I = window.__app.intro; const u = I.update.bind(I); I.update = (dt) => { const r = u(dt); window.__cam?.(); return r; }; });
  perFrame = async (i) => { const sp = spiral(Math.min(1, i / (N - 8))); await p.evaluate((C, sp) => { window.__cam = () => { const c = window.__app.camera; const s = Math.sin(sp.phi);
    c.position.set(C[0] + sp.r * s * Math.sin(sp.theta), C[1] + sp.r * Math.cos(sp.phi), C[2] + sp.r * s * Math.cos(sp.theta)); c.lookAt(C[0], C[1], C[2]); }; }, C, sp); };
}
if (scene === 'B' || scene === 'BN') { await p.evaluate((night) => { if (night) window.__app.applyTime(3); window.__app.setMode('orbit'); const o = window.__app.orbit; o.autoRotate = true; o.autoRotateSpeed = -2.2; }, scene === 'BN'); await place(END); await p.evaluate((C) => { const o = window.__app.orbit; o.target.set(...C); o.enableDamping = false; o.update(); }, C); }
if (!['A', 'B', 'BN'].includes(scene)) await p.evaluate(() => { window.__noGlow = true; window.__app.setMode('walk', { x: 0, z: 0, yaw: 0 }); });
if (scene === 'C1') perFrame = shot([2.25, 3.3], [2.3, 2.45], [2.4, 1.2, -2.6]);
if (scene === 'C2') { perFrame = shot([2.3, -0.95], [2.25, -1.35], [2.15, 1.3, -3.69]); at[6] = () => tapNear('Tilt the blinds'); }
if (scene === 'C3') { perFrame = shot([0.55, -0.6], [0.3, -0.95], [-1.1, 1.3, -2.76]); at[6] = () => tapNear('Draw the curtains'); }
if (scene === 'C4') { perFrame = shot([1.75, -1.2], [1.95, -1.15], [3.1, 1.0, -0.9], 1.45, 68); at[1] = () => tapNear('Open or close', [3.05, -0.85, 0.6]); } // the fridge door
if (scene === 'D') { await p.evaluate(() => window.__app.applyTime(3)); at[62] = () => tapNear('Turn the TV on or off'); perFrame = shot([3.05, 2.95], [2.75, 2.45], [1.15, 1.2, 0.9]); }

const only = test ? test.split(',').map(Number) : null;
const t0 = Date.now();
const LAST = only ? Math.max(...only) + 1 : N;
for (let i = 0; i < LAST; i++) {
  if (at[i]) await at[i]();
  await perFrame(i);
  await step();
  if (!only || only.includes(i)) await p.screenshot({ path: `${out}/f_${String(i + 1).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
}
await b.close();
if (!only) { const { execFileSync } = await import('node:child_process'); execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '30', '-i', `${out}/f_%04d.jpg`, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `hf/assets/clips/${scene}.tmp.mp4`]); execFileSync('mv', [`hf/assets/clips/${scene}.tmp.mp4`, `hf/assets/clips/${scene}.mp4`]); }
console.log(scene, N, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's', errs);
