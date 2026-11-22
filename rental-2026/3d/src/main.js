// Scene setup and the four modes: intro, dollhouse (orbit), walk, and the walkthrough (tour).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Walk } from './walk.js';
import { bedroom } from './rooms/bedroom.js';
import { kitchen, living } from './rooms/kitchen_living.js';
import { corridor, toilet } from './rooms/baths.js';
import { downlights, roomLights } from './lights.js';
import { toggleSound, updateSound } from './sound.js';
import { setupPointer, updateTweens, tween, items } from './interact.js';
import { makeDaylight } from './daylight.js';
import { Tour, ROOMS } from './tour.js';
import { Intro } from './intro.js';
import { roomAt, ROOM_SHOTS } from './ui.js';

const $ = (id) => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches;

// Renderer, scene, lights
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.localClippingEnabled = true; // the intro's scan sweep
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
const hemi = new THREE.HemisphereLight(0xfffaf0, 0xd8c8b4, 1.1), ambient = new THREE.AmbientLight(0xffffff, 0.35);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; // normalBias stops shadow acne shimmer
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 25 });
scene.add(hemi, ambient, sun, sun.target);

// The apartment
const home = new THREE.Group();
home.add(bedroom(), kitchen(), living(), corridor(), toilet());
const backdrops = []; home.traverse((o) => { if (o.userData.backdrop) backdrops.push(o); });
backdrops.forEach((o) => scene.attach(o)); // sky planes outside the home's bounds
scene.add(home);
const ceilings = [], colliders = [], walls = [];
home.traverse((o) => {
  if (o.userData.ceiling) ceilings.push(o);
  if (o.userData.collide) { o.userData.box = new THREE.Box3().setFromObject(o); colliders.push({ box: o.userData.box, obj: o }); }
  if (o.userData.wall) walls.push(o);
});
ceilings.forEach((o) => (o.visible = false));
const bounds = new THREE.Box3().setFromObject(home), centre = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
centre.y = 0;
// Dollhouse cutaway: outer walls facing the camera are hidden; walls shared by two rooms always show.
for (const w of walls) {
  const alongX = w.userData.wall === 'x', p = alongX ? w.position.z : w.position.x;
  const edge = alongX ? [bounds.min.z, bounds.max.z] : [bounds.min.x, bounds.max.x];
  const outer = Math.min(Math.abs(p - edge[0]), Math.abs(p - edge[1])) < 0.25;
  w.userData.out = !outer ? null : alongX ? new THREE.Vector3(0, 0, Math.sign(p - centre.z)) : new THREE.Vector3(Math.sign(p - centre.x), 0, 0);
}
const toCam = new THREE.Vector3();
const cutaway = (on) => { for (const w of walls) w.visible = !on || !w.userData.out || toCam.subVectors(camera.position, w.position).dot(w.userData.out) < 0; };
const fixtures = downlights(scene);

// Cameras and controls
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI * 0.49; orbit.enabled = false;
const walk = new Walk(camera, renderer.domElement, bounds, $('hint'), colliders, $('pad'));
// In walk mode, whatever is under the centre dot can be used with the button below it
let aimed = null;
const onAim = (item) => {
  if (mode !== 'walk') return;
  aimed = item; $('aim').classList.toggle('on', !!item); show('btn-use', !!item);
  if (item) $('btn-use').textContent = item.action;
};
const pointer = setupPointer(renderer.domElement, camera, () => mode === 'walk' || mode === 'tour', onAim, () => { if (mode === 'tour') togglePause(); });
const setHour = makeDaylight({ scene, renderer, sun, hemi, ambient, centre });
// Dollhouse camera: further back on a tall phone screen so the whole flat fits
const dollhousePose = new THREE.Vector3();
const fitDollhouse = () => { const k = innerWidth < innerHeight ? 2.1 : 1; dollhousePose.set(centre.x + size.x * 0.6 * k, size.y * 4.5 * k, centre.z + size.z * 0.9 * k); };
fitDollhouse();

// Time of day for the dollhouse and walk views (the sun button cycles through these)
const TIMES = [[7, 'Morning'], [12.5, 'Midday'], [18.5, 'Evening'], [22, 'Night']];
let timeIdx = 0;
function applyTime(i) {
  timeIdx = i;
  const [h, label] = TIMES[i], { night } = setHour(h);
  for (const [name, l] of Object.entries(roomLights)) l.set(night || (h > 18 && ['living', 'kitchen'].includes(name)));
  $('sun-label').textContent = label;
  $('btn-sun').setAttribute('aria-label', `Change the time of day. Now: ${label.toLowerCase()}`);
}
applyTime(0);

// Modes
let mode = 'intro';
// The walkthrough opens doors it walks up to, the same ones walking into would open
const nearDoors = (x, z) => { for (const c of colliders) { const b = c.box; if (c.obj.userData.autoOpen && x > b.min.x - 0.9 && x < b.max.x + 0.9 && z > b.min.z - 0.9 && z < b.max.z + 0.9) c.obj.userData.autoOpen(); } };
let tourRoom = -1;
const onTourProgress = (f, r) => {
  if (r === tourRoom) return; tourRoom = r;
  [...$('tour-rooms').querySelectorAll('button')].forEach((b, k) => { b.setAttribute('aria-current', String(k === r)); b.classList.toggle('done', k < r); if (k === r) b.scrollIntoView({ inline: 'nearest', block: 'nearest' }); });
  $('btn-nextroom').textContent = r === ROOMS.length - 1 ? 'Finish' : 'Next room';
};
const tour = new Tour(camera, nearDoors, onTourProgress, () => setMode('orbit'));
$('tour-rooms').innerHTML = ROOMS.map(([name]) => `<li><button>${name}</button></li>`).join('');
$('tour-rooms').querySelectorAll('button').forEach((b, k) => (b.onclick = () => { setPaused(false); tour.jump(ROOMS[k][1]); }));
$('btn-nextroom').onclick = () => { setPaused(false); tour.nextRoom(); };
const show = (id, on) => ($(id).hidden = !on);
function setMode(m, pose) {
  const prev = mode; mode = m;
  if (prev === 'tour' && m !== 'tour') tour.stop();
  ['btn-orbit', 'btn-walk', 'btn-day'].forEach((id) => $(id).setAttribute('aria-pressed', String({ orbit: 'btn-orbit', walk: 'btn-walk', tour: 'btn-day' }[m] === id)));
  show('bottom', m === 'orbit' || m === 'walk'); show('modes', m === 'orbit'); show('title', m === 'orbit'); show('btn-sun', m !== 'intro');
  show('btn-back', m === 'walk'); show('roompill', m === 'walk' || m === 'tour'); show('pad', m === 'walk' && touch); show('aim', m === 'walk');
  show('btn-help', m !== 'intro'); document.body.classList.toggle('walking', m === 'walk');
  if (m !== 'walk') { aimed = null; show('btn-use', false); }
  show('tourbar', m === 'tour'); setPaused(false);
  ceilings.forEach((o) => (o.visible = m !== 'orbit'));
  backdrops.forEach((o) => (o.visible = m !== 'orbit'));
  orbit.enabled = m === 'orbit';
  if (m !== 'walk') walk.disable();
  camera.fov = m === 'orbit' ? 45 : 70; camera.updateProjectionMatrix();
  if (m === 'orbit') {
    if (prev !== 'intro') camera.position.copy(dollhousePose);
    orbit.target.copy(centre); orbit.update();
  } else if (m === 'walk') {
    walk.enable(pose || { x: 1.9, z: 3.0, yaw: 0 }); // just inside the front door, facing the kitchen
  } else if (m === 'tour') {
    tourRoom = -1; tour.start(); onTourProgress(0, 0);
  }
}

// Walkthrough controls: pause (or tap anywhere), stop
function setPaused(p) { tour.paused = p; $('btn-pause').setAttribute('aria-pressed', String(p)); $('btn-pause').setAttribute('aria-label', p ? 'Carry on walking' : 'Pause'); }
const togglePause = () => setPaused(!tour.paused);

// Room buttons fly the dollhouse camera to a framed view of each room
$('rooms').innerHTML = Object.keys(ROOM_SHOTS).map((r) => `<button>${r}</button>`).join('');
// In walk mode the same buttons take you to a standing spot in that room
const WALK_SPOTS = { Bedroom: { x: -0.3, z: -0.9, yaw: 0.35 }, Dressing: { x: 0.55, z: -0.35, yaw: Math.PI }, Kitchen: { x: 2.3, z: -1.6, yaw: 0 }, 'Living room': { x: 1.6, z: 2.9, yaw: -0.5 }, Bathroom: { x: -1.3, z: 1.2, yaw: Math.PI } };
[...$('rooms').children].forEach((b) => (b.onclick = () => {
  if (mode === 'walk') { walk.enable(WALK_SPOTS[b.textContent]); return; }
  const [x, z, d] = ROOM_SHOTS[b.textContent];
  tween(orbit.target, 'x', x, 1.1); tween(orbit.target, 'z', z, 1.1);
  tween(camera.position, 'x', x + d * 0.45, 1.1); tween(camera.position, 'y', d * 0.95, 1.1); tween(camera.position, 'z', z + d * 0.6, 1.1);
}));

$('btn-orbit').onclick = () => setMode('orbit');
$('btn-walk').onclick = () => setMode('walk');
$('btn-day').onclick = () => setMode('tour');
$('btn-back').onclick = () => setMode('orbit');
$('btn-stop').onclick = () => setMode('orbit');
$('btn-pause').onclick = togglePause;
$('btn-sun').onclick = () => applyTime((timeIdx + 1) % TIMES.length);
let soundOn = false;
const setSound = (on) => { if (on !== soundOn) soundOn = toggleSound(); $('btn-sound').setAttribute('aria-pressed', String(soundOn)); $('w-sound').checked = soundOn; };
$('btn-sound').onclick = () => setSound(!soundOn);
$('btn-use').onclick = () => aimed?.tap();

// Welcome card: what this is, and three plain choices. The ? button brings it back.
const welcome = $('welcome');
$('w-sound').onchange = (e) => setSound(e.target.checked);
welcome.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { welcome.close(); if (b.dataset.go !== mode) setMode(b.dataset.go); }));
$('btn-help').onclick = () => welcome.showModal();

// Intro: walls rise and furniture settles in; skippable
['bottom', 'title', 'btn-sun', 'btn-sound'].forEach((id) => show(id, false));
fixtures.visible = false; backdrops.forEach((o) => (o.visible = false));
// Deep links from the place page: #walk=kitchen (stand in a room), #walkthrough, #above. These skip the intro and the card.
const ROOM_KEYS = { living: 'Living room', kitchen: 'Kitchen', bedroom: 'Bedroom', dressing: 'Dressing', bathroom: 'Bathroom' };
const hash = new URLSearchParams(location.hash.slice(1).replace(/,/g, '&'));
let deep = hash.has('walk') ? () => setMode('walk', WALK_SPOTS[ROOM_KEYS[hash.get('walk')]] || undefined)
  : hash.has('walkthrough') ? () => setMode('tour') : hash.has('above') ? () => {} : null;
let intro = matchMedia('(prefers-reduced-motion: reduce)').matches || location.hash.includes('nointro') || deep ? null : new Intro(home, camera, centre, dollhousePose, roomLights, fixtures);
renderer.compile(scene, camera); // prepare every material (with the sweep's clipping) up front so the intro doesn't stutter
const endIntro = () => { intro?.finish(); intro = null; fixtures.visible = true; show('btn-skip', false); show('btn-sound', true); camera.position.copy(dollhousePose); setMode('orbit'); if (deep) { const go = deep; deep = null; go(); } else if (!location.hash.includes('nowelcome')) welcome.showModal(); };
if (intro) { show('btn-skip', true); $('btn-skip').onclick = endIntro; } else { mode = 'none'; endIntro(); }

// Replay the intro from the welcome card: back to an empty site, then build it again
function replayIntro() {
  welcome.close();
  if (mode !== 'orbit') setMode('orbit');
  mode = 'intro'; orbit.enabled = false;
  ['bottom', 'title', 'btn-sun', 'btn-sound', 'btn-help'].forEach((id) => show(id, false));
  fixtures.visible = false; backdrops.forEach((o) => (o.visible = false));
  intro = new Intro(home, camera, centre, dollhousePose, roomLights, fixtures);
  show('btn-skip', true); $('btn-skip').onclick = endIntro;
}
$('btn-replay').onclick = replayIntro;
// Share the whole place (not a room): share sheet on phones, otherwise copy the link
$('btn-share').onclick = async () => {
  const url = 'https://rooms.rr2.dev/rental-2026/', b = $('btn-share');
  if (navigator.share) { try { await navigator.share({ title: document.title, url }); } catch {} return; }
  try { await navigator.clipboard.writeText(url); b.textContent = 'Link copied'; } catch { b.textContent = url; }
  setTimeout(() => (b.textContent = 'Share this place'), 2500);
};

// Frame loop
const clock = new THREE.Clock();
let shownRoom = '';
renderer.setAnimationLoop(() => {
  const w = innerWidth, h = innerHeight;
  if (renderer.domElement.width !== Math.floor(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const dt = Math.min(clock.getDelta(), 0.05);
  updateTweens(dt);
  if (intro && !intro.update(dt)) endIntro();
  if (mode === 'orbit') orbit.update();
  if (mode === 'walk') { walk.update(dt); pointer.centreGlow(); }
  if (mode === 'tour') tour.update(dt);
  if (mode === 'walk' || mode === 'tour') {
    const r = roomAt(camera.position.x, camera.position.z);
    if (r && r !== shownRoom) { $('roompill').textContent = shownRoom = r; }
  }
  updateSound(camera.position, mode === 'walk' || mode === 'tour');
  cutaway(mode === 'orbit' || mode === 'intro');
  renderer.render(scene, camera);
});
window.__app = { setMode, camera, items, tour, applyTime, get intro() { return intro; } };
