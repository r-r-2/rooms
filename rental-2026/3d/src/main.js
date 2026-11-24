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
import { setupPointer, updateTweens, tween, items, events } from './interact.js';
import { makeDaylight } from './daylight.js';
import { Tour, ROOMS } from './tour.js';
import { Intro } from './intro.js';
import { roomAt, ROOM_SHOTS } from './ui.js';
import { cityView, landmark } from './view.js';

const $ = (id) => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches;

// Renderer, scene, lights
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, logarithmicDepthBuffer: true }); // the city view spans 5 cm to 5 km: a normal depth buffer flickers far away
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
const city = cityView(); scene.add(city); backdrops.push(city); window.__city = city; window.__landmark = landmark;
// Tap the tall building to change its lights 
const landmarkRay = new THREE.Raycaster(), lightsToast = Object.assign(document.createElement('div'), { className: 'pill' });
Object.assign(lightsToast.style, { position: 'fixed', left: '50%', bottom: '84px', transform: 'translateX(-50%)', transition: 'opacity .4s', opacity: 0, pointerEvents: 'none' });
document.body.append(lightsToast); let toastT;
renderer.domElement.addEventListener('click', (e) => {
  if (!city.visible || !landmark.meshes) return;
  const r = renderer.domElement.getBoundingClientRect(); landmarkRay.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  if (landmarkRay.intersectObjects(landmark.meshes, false).length) nextLook();
}); // the view outside
const toast = (text, ms) => { lightsToast.textContent = text; lightsToast.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => (lightsToast.style.opacity = 0), ms); };
const setLook = (i) => { landmark.mode = i; landmark.u.mode.value = i; };
function nextLook() { setLook((landmark.mode + 1) % landmark.MODES.length); toast(`Building lights: ${landmark.MODES[landmark.mode]}`, 1600); }
// The first time the tower lights come on: say it can be tapped, and flick through the looks once
let lightsOn = false, hintTimer;
function towerHint() {
  try { if (localStorage.getItem('towerHint')) return; localStorage.setItem('towerHint', '1'); } catch (e) { if (towerHint.done) return; }
  towerHint.done = true; const keep = landmark.mode; let i = 0;
  toast('Tap the tall building to change its lights', 4000);
  clearInterval(hintTimer); hintTimer = setInterval(() => { i++; if (i < landmark.MODES.length) setLook((keep + i) % landmark.MODES.length); else { setLook(keep); clearInterval(hintTimer); } }, 450);
}
const ceilings = [], colliders = [], walls = [];
home.updateMatrixWorld(true); // door leaves sit inside hinge pivots: their boxes need world positions
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
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 5000);
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
const TIMES = [[7, 'Morning'], [12.5, 'Midday'], [17.75, 'Evening'], [22, 'Night']];
let timeIdx = 0;
// One tap to the next time of day: sunrise, sun, sunset, moon
const TIME_ICONS = [
  '<path d="M3 17h18M7 17a5 5 0 0 1 10 0M12 7V4M5.6 10.6 3.8 8.8M18.4 10.6l1.8-1.8"/>',
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  '<path d="M3 17h18M7 17a5 5 0 0 1 10 0M12 10V7M9 4l3 3 3-3"/>',
  '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
];
function showTimeButton(i) {
  $('btn-time').innerHTML = `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${TIME_ICONS[i]}</svg>`;
  $('btn-time').setAttribute('aria-label', `Time of day: ${TIMES[i][1]}. Tap for the next`);
}
$('btn-lights').onclick = nextLook;
$('btn-time').onclick = () => applyTime((timeIdx + 1) % TIMES.length);
function applyTime(i) {
  timeIdx = i; showTimeButton(i);
  const [h, label] = TIMES[i], { night } = setHour(h);
  city.setTime(h, night); scene.fog = new THREE.Fog(city.fogColor || scene.background.clone(), 900, 5000);
  lightsOn = night; const towerOn = lightsOn && mode !== 'intro'; // (mode is only read once the lights are on, after start-up)
  $('btn-lights').hidden = !towerOn; if (towerOn) setTimeout(towerHint, 600);
  for (const [name, l] of Object.entries(roomLights)) l.set(night || (h > 17 && ['living', 'kitchen'].includes(name)));
  $('times').querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
}
$('times').innerHTML = TIMES.map(([, label]) => `<button aria-pressed="false">${label}</button>`).join('');
$('times').querySelectorAll('button').forEach((b, k) => (b.onclick = () => applyTime(k)));
applyTime(0);

// Modes
let mode = 'intro';
// The walkthrough opens doors it walks up to, the same ones walking into would open
const nearDoors = (x, z) => { for (const c of colliders) { const b = c.box; if (c.obj.userData.autoOpen && x > b.min.x - 0.9 && x < b.max.x + 0.9 && z > b.min.z - 0.9 && z < b.max.z + 0.9) c.obj.userData.autoOpen(); } };
let tourRoom = -1;
const onTourProgress = (f, r) => {
  $('progress').style.transform = `scaleX(${f})`;
  if (r === tourRoom) return; tourRoom = r;
  $('tour-room').innerHTML = `${ROOMS[r][0]} <small>${r + 1} of ${ROOMS.length}</small>`;
  $('btn-nextroom').textContent = r === ROOMS.length - 1 ? 'Finish' : 'Next room';
};
const tour = new Tour(camera, nearDoors, onTourProgress, () => { track('walkthrough_complete'); setMode('orbit'); });
$('btn-nextroom').onclick = () => { setPaused(false); tour.nextRoom(); };
const show = (id, on) => ($(id).hidden = !on);
function setMode(m, pose) {
  const prev = mode; mode = m;
  if (m !== prev && m !== 'intro' && prev !== 'intro' && prev !== 'none') track('choose_view', { view: { orbit: 'above', tour: 'walkthrough', walk: 'walk' }[m] });
  if (prev === 'tour' && m !== 'tour') tour.stop();
  ['btn-orbit', 'btn-walk', 'btn-day'].forEach((id) => $(id).setAttribute('aria-pressed', String({ orbit: 'btn-orbit', walk: 'btn-walk', tour: 'btn-day' }[m] === id)));
  show('bottom', m === 'orbit' || m === 'walk'); show('modes', m === 'orbit'); show('title', m === 'orbit'); show('btn-more', m !== 'intro'); show('btn-time', m !== 'intro'); show('btn-lights', m !== 'intro' && lightsOn);
  show('btn-close', m === 'walk' || m === 'tour'); show('roompill', m === 'walk'); show('pad', m === 'walk' && touch); show('aim', m === 'walk');
  $('btn-close').setAttribute('aria-label', m === 'tour' ? 'Stop the walkthrough' : 'Back to the view from above');
  document.body.classList.toggle('walking', m === 'walk'); wake();
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

// Rooms sheet: from above it flies the camera to the room, in walk mode it puts you there, in the walkthrough it skips there
const WALK_SPOTS = { Bedroom: { x: -0.3, z: -0.9, yaw: 0.35 }, Dressing: { x: 0.55, z: -0.35, yaw: Math.PI }, Kitchen: { x: 2.3, z: -1.6, yaw: 0 }, 'Living room': { x: 1.6, z: 2.9, yaw: -0.5 }, Bathroom: { x: -1.3, z: 1.2, yaw: Math.PI } };
const roomsheet = $('roomsheet');
$('rooms').innerHTML = ROOMS.map(([name]) => `<button>${name}</button>`).join('');
[...$('rooms').children].forEach((b, k) => (b.onclick = () => {
  roomsheet.close();
  const name = b.textContent;
  track('room_open', { room: name, view: mode });
  if (mode === 'tour') { setPaused(false); tour.jump(ROOMS[k][1]); return; }
  if (mode === 'walk') { walk.enable(WALK_SPOTS[name]); return; }
  const [x, z, d] = ROOM_SHOTS[name];
  tween(orbit.target, 'x', x, 1.1); tween(orbit.target, 'z', z, 1.1);
  tween(camera.position, 'x', x + d * 0.45, 1.1); tween(camera.position, 'y', d * 0.95, 1.1); tween(camera.position, 'z', z + d * 0.6, 1.1);
}));
const openRooms = () => {
  const here = mode === 'tour' ? ROOMS[tourRoom]?.[0] : mode === 'walk' ? shownRoom : '';
  [...$('rooms').children].forEach((b) => b.setAttribute('aria-current', String(b.textContent === here)));
  roomsheet.showModal();
};
$('btn-rooms').onclick = openRooms;
$('tour-room').onclick = openRooms;

$('btn-orbit').onclick = () => setMode('orbit');
$('btn-walk').onclick = () => setMode('walk');
$('btn-day').onclick = () => setMode('tour');
$('btn-close').onclick = () => setMode('orbit');
$('btn-pause').onclick = togglePause;
let soundOn = false;
const setSound = (on) => { if (on !== soundOn) { soundOn = toggleSound(); track('room_sound', { on: soundOn }); } $('w-sound').setAttribute('aria-pressed', String(soundOn)); $('m-sound').setAttribute('aria-checked', String(soundOn)); };
$('w-sound').onclick = () => setSound(!soundOn);
$('m-sound').onclick = () => setSound(!soundOn);
$('btn-use').onclick = () => aimed?.tap();

// Sheets close when you tap outside them
for (const d of document.querySelectorAll('dialog.sheet')) d.addEventListener('click', (e) => { if (e.target === d) d.close(); });

// Welcome sheet: what this is and three choices. The model is nudged up so the sheet doesn't cover it.
const welcome = $('welcome');
const showWelcome = () => {
  welcome.showModal();
  const h = welcome.getBoundingClientRect().height;
  camera.setViewOffset(innerWidth, innerHeight, 0, Math.min(h * 0.5, innerHeight * 0.3), innerWidth, innerHeight);
};
welcome.addEventListener('close', () => camera.clearViewOffset());
welcome.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { welcome.close(); track('welcome_choice', { view: { orbit: 'above', tour: 'walkthrough', walk: 'walk' }[b.dataset.go] }); if (b.dataset.go !== mode) setMode(b.dataset.go); }));

// Menu: light, sound, replay, share, help
const menu = $('menu');
$('btn-more').onclick = () => menu.showModal();
$('m-help').onclick = () => { menu.close(); if (mode !== 'orbit') setMode('orbit'); showWelcome(); };

// Intro: walls rise and furniture settles in; skippable
['bottom', 'title', 'btn-more'].forEach((id) => show(id, false));
fixtures.visible = false; backdrops.forEach((o) => (o.visible = false));
// Deep links from the place page: #walk=kitchen (stand in a room), #walkthrough, #above. These skip the intro and the card.
const ROOM_KEYS = { living: 'Living room', kitchen: 'Kitchen', bedroom: 'Bedroom', dressing: 'Dressing', bathroom: 'Bathroom' };
const hash = new URLSearchParams(location.hash.slice(1).replace(/,/g, '&'));
let deep = hash.has('walk') ? () => setMode('walk', WALK_SPOTS[ROOM_KEYS[hash.get('walk')]] || undefined)
  : hash.has('walkthrough') ? () => setMode('tour') : hash.has('above') ? () => {} : null;
let intro = matchMedia('(prefers-reduced-motion: reduce)').matches || location.hash.includes('nointro') || deep ? null : new Intro(home, camera, centre, dollhousePose, roomLights, fixtures);
// Prepare every material up front, including the lights and sky the intro reveals later, so nothing compiles mid-intro
fixtures.visible = true; backdrops.forEach((o) => (o.visible = true));
renderer.compile(scene, camera);
fixtures.visible = false; backdrops.forEach((o) => (o.visible = false));
const endIntro = () => { intro?.finish(); intro = null; renderer.shadowMap.autoUpdate = true; fixtures.visible = true; show('btn-skip', false); camera.position.copy(dollhousePose); setMode('orbit'); if (deep) { const go = deep; deep = null; go(); } else if (!location.hash.includes('nowelcome')) showWelcome(); };
if (intro) { show('btn-skip', true); $('btn-skip').onclick = endIntro; } else { mode = 'none'; endIntro(); }

// Replay the intro from the welcome card: back to an empty site, then build it again
function replayIntro() {
  menu.close(); welcome.close();
  if (mode !== 'orbit') setMode('orbit');
  mode = 'intro'; orbit.enabled = false;
  ['bottom', 'title', 'btn-more'].forEach((id) => show(id, false));
  fixtures.visible = false; backdrops.forEach((o) => (o.visible = false));
  intro = new Intro(home, camera, centre, dollhousePose, roomLights, fixtures);
  show('btn-skip', true); $('btn-skip').onclick = endIntro;
}
$('m-replay').onclick = () => { track('replay_intro'); replayIntro(); };
// Share the whole place (not a room): share sheet on phones, otherwise copy the link
$('m-share').onclick = async () => {
  const url = 'https://rooms.rr2.dev/rental-2026/', b = $('m-share');
  track('share', { place: 'rental-2026', from: 'viewer' });
  if (navigator.share) { try { await navigator.share({ title: document.title, url }); } catch {} return; }
  try { await navigator.clipboard.writeText(url); b.textContent = 'Link copied'; } catch { b.textContent = url; }
  setTimeout(() => (b.textContent = 'Share this place'), 2500);
};

// Calm: after 3 s untouched the controls fade; any touch, click, key or mouse move brings them back
var lastInput = performance.now(); // var: setMode can call wake() before this line runs
function wake() { lastInput = performance.now(); document.body.classList.remove('idle'); }
for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, wake, { passive: true });
const calm = () => {
  const busy = mode === 'intro' || document.querySelector('dialog[open]') || walk.keys.size;
  document.body.classList.toggle('idle', !busy && performance.now() - lastInput > 3000);
};

// Tapping things in the flat (doors, lights, curtains, TV...)
events.addEventListener('sound', (e) => track('use_object', { kind: e.detail.kind, view: mode }));

// Frame loop
const clock = new THREE.Clock();
let introDt = 1 / 60, frame = 0;
let shownRoom = '';
renderer.setAnimationLoop(() => {
  const w = innerWidth, h = innerHeight;
  if (renderer.domElement.width !== Math.floor(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const dt = Math.min(clock.getDelta(), 0.05);
  updateTweens(dt);
  if (intro) {
    // smooth out uneven frame times so the sweep and camera glide, and redraw shadows every other frame
    introDt = introDt * 0.8 + dt * 0.2;
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = (frame++ % 2) === 0;
    if (!intro.update(introDt)) endIntro();
  }
  if (mode === 'orbit') orbit.update();
  if (mode === 'walk') { walk.update(dt); pointer.centreGlow(); }
  if (mode === 'tour') tour.update(dt);
  if (city.visible) city.update(dt);
  if (mode === 'walk' || mode === 'tour') {
    const r = roomAt(camera.position.x, camera.position.z);
    if (r && r !== shownRoom) { $('roompill').textContent = shownRoom = r; }
  }
  updateSound(camera.position, mode === 'walk' || mode === 'tour');
  cutaway(mode === 'orbit' || mode === 'intro');
  calm();
  renderer.render(scene, camera);
});
window.__app = { setMode, camera, items, tour, applyTime, get intro() { return intro; } };
