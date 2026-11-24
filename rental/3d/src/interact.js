// Tap-to-use objects: a registry, a tiny tween helper, and builders for doors, sliders and toggles.
import * as THREE from 'three';

export const items = [];          // { meshes: Mesh[], tap: () => void, room }
const tweens = [];
export const events = new EventTarget(); // 'sound' events: { detail: { kind, at } }

// Register meshes (or groups) as one tappable thing. Materials are cloned so the hover glow stays per object.
const ACTIONS = { door: 'Open or close', slide: 'Slide open or shut', curtain: 'Draw the curtains', blinds: 'Tilt the blinds', tv: 'Turn the TV on or off', switch: 'Switch the light', ac: 'Switch the AC', click: 'Use' };
export function interactive(roots, tap, kind = 'click') {
  const meshes = [];
  for (const r of [].concat(roots)) r.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); meshes.push(o); } });
  const item = { meshes, action: ACTIONS[kind] || 'Use', tap: () => { tap(); events.dispatchEvent(new CustomEvent('sound', { detail: { kind, at: meshes[0].getWorldPosition(new THREE.Vector3()) } })); } };
  meshes.forEach((m) => (m.userData.item = item));
  items.push(item);
  return item;
}

// Animate obj[prop] (a number, or one axis of a vector via 'rotation.y' style paths) to a value.
export function tween(obj, path, to, dur = 0.6, done) {
  const keys = path.split('.'), last = keys.pop(), target = keys.reduce((o, k) => o[k], obj);
  for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].target === target && tweens[i].last === last) tweens.splice(i, 1);
  tweens.push({ target, last, from: target[last], to, t: 0, dur, done });
}

export function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t = Math.min(1, tw.t + dt / tw.dur);
    const e = 1 - Math.pow(1 - tw.t, 3); // ease-out
    tw.target[tw.last] = tw.from + (tw.to - tw.from) * e;
    if (tw.t === 1) { tweens.splice(i, 1); tw.done?.(); }
  }
}

// A door leaf hinged at (x, z). along: 'x' or 'z' = direction the closed leaf runs from the hinge; dir = ±1.
// openAngle: rotation about y when open. The leaf's collider follows it after each swing.
export function hingedDoor(parent, { x, z, along, dir, width, height = 2.08, thick = 0.04, material, openAngle, open = false, handle = true, y0 = 0, auto = false, dress }) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y0, z);
  const geo = along === 'x' ? new THREE.BoxGeometry(width, height, thick) : new THREE.BoxGeometry(thick, height, width);
  const leaf = new THREE.Mesh(geo, material);
  leaf.position.set(along === 'x' ? dir * width / 2 : 0, height / 2, along === 'z' ? dir * width / 2 : 0);
  leaf.castShadow = leaf.receiveShadow = true;
  leaf.userData.collide = true;
  pivot.add(leaf);
  if (handle) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(along === 'x' ? 0.02 : thick + 0.05, 0.16, along === 'z' ? 0.02 : thick + 0.05), new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.8, roughness: 0.3 }));
    h.position.set(along === 'x' ? dir * (width - 0.07) : 0, height > 1.2 ? 1.0 : height * 0.3, along === 'z' ? dir * (width - 0.07) : 0); // short doors (the freezer) keep it on the door
    pivot.add(h);
  }
  dress?.(pivot); // extra parts that swing with the door (a mirror, say)
  pivot.rotation.y = open ? openAngle : 0;
  parent.add(pivot);
  let isOpen = open;
  const item = interactive(pivot, () => {
    isOpen = !isOpen;
    tween(pivot, 'rotation.y', isOpen ? openAngle : 0, 0.7, () => leaf.userData.box?.setFromObject(leaf));
  }, 'door');
  if (auto) leaf.userData.autoOpen = () => { if (!isOpen) item.tap(); }; // walking into it opens it
  if (auto) leaf.userData.autoClose = () => { if (isOpen) item.tap(); }; // the walkthrough can shut it to see past it
  return pivot;
}

// Something that slides along x or z between two offsets when tapped.
export function slider(obj, axis, closedAt, openAt, open = false, kind = 'slide', auto = false) {
  obj.position[axis] = open ? openAt : closedAt;
  let isOpen = open;
  const item = interactive(obj, () => {
    isOpen = !isOpen;
    tween(obj.position, axis, isOpen ? openAt : closedAt, 0.8, () => obj.traverse((o) => o.userData.box?.setFromObject(o)));
  }, kind);
  if (auto) obj.traverse((o) => { if (o.userData.collide) o.userData.autoOpen = () => { if (!isOpen) item.tap(); }; });
  return obj;
}

// Pointer handling: a tap (short, barely moving press) hits the object under it, or under the screen centre in walk mode.
// Hover (desktop) or the centre ray (walk) gives a soft glow on whatever can be used.
export function setupPointer(canvas, camera, isWalking, onAim, onEmptyTap) {
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null, hovered = null;
  const pick = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    ray.far = isWalking() ? 3 : 100;
    const meshes = items.flatMap((i) => i.meshes).filter((m) => m.visible);
    const hit = ray.intersectObjects(meshes, false)[0];
    return hit?.object.userData.item || null;
  };
  const glow = (item) => {
    if (hovered === item) return;
    hovered?.meshes.forEach((m) => m.material.emissive?.setHex(m.userData.baseEmissive ?? 0));
    hovered = item;
    hovered?.meshes.forEach((m) => {
      if (!m.material.emissive) return;
      m.userData.baseEmissive ??= m.material.emissive.getHex();
      if (m.userData.baseEmissive === 0) m.material.emissive.setHex(0x2a1d10); // only glow things that aren't already lit
    });
    canvas.style.cursor = item ? 'pointer' : '';
    onAim?.(item);
  };
  canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY, t: e.timeStamp }));
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); // a tap = a press that barely moves
    down = null;
    if (moved < 8) { const it = pick(e.clientX, e.clientY); if (it) it.tap(); else onEmptyTap?.(); }
  });
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !down) glow(pick(e.clientX, e.clientY)); });
  return { centreGlow: () => { const r = canvas.getBoundingClientRect(); glow(pick(r.left + r.width / 2, r.top + r.height / 2)); } };
}

// Two-panel sliding glass door in a wall. axis 'x' = the wall runs along x at z = at; 'z' = runs along z at x = at.
// The panel at `from` slides behind the other one when tapped. frameColor for the slim aluminium frame.
// single: one panel the full width, sliding along the wall face by `slide` metres (sign = direction).
export function slidingGlass(parent, { axis, at, from, to, height = 2.3, glass, open = false, frameColor = 0x9a9fa4, single = false, slide = 0, face = -0.07, swap = false }) {
  const frame = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.4, metalness: 0.6 });
  const half = (to - from) / 2, f = 0.035;
  const put = (grp, a, b, off, y0, y1, mat, collide) => {
    const w = b - a, m = new THREE.Mesh(axis === 'x' ? new THREE.BoxGeometry(w, y1 - y0, 0.03) : new THREE.BoxGeometry(0.03, y1 - y0, w), mat);
    if (axis === 'x') m.position.set((a + b) / 2, (y0 + y1) / 2, at + off); else m.position.set(at + off, (y0 + y1) / 2, (a + b) / 2);
    m.castShadow = false; m.receiveShadow = true; if (collide) m.userData.collide = true;
    grp.add(m);
  };
  const panel = (grp, a, b, off) => {
    put(grp, a + f, b - f, off, f, height - f, glass, true);
    put(grp, a, b, off, 0, f, frame); put(grp, a, b, off, height - f, height, frame);
    put(grp, a, a + f, off, 0, height, frame); put(grp, b - f, b, off, 0, height, frame);
    put(grp, a + 0.06, a + 0.08, off - 0.03, 0.95, 1.15, frame); // pull handle
  };
  const moving = new THREE.Group(); parent.add(moving);
  if (single) {
    panel(moving, from, to, face);                  // one panel on the wall face
    slider(moving, axis === 'x' ? 'x' : 'z', 0, slide, open, 'slide', true);
    return moving;
  }
  if (swap) { // the panel at the 'to' end slides, back over the fixed one at the 'from' end
    panel(parent, from, from + half, 0.035);
    panel(moving, from + half, to, -0.035);
    slider(moving, axis === 'x' ? 'x' : 'z', 0, -(half - 0.06), open, 'slide', true);
    return moving;
  }
  panel(parent, from + half, to, 0.035);           // fixed panel
  panel(moving, from, from + half, -0.035);         // sliding panel
  slider(moving, axis === 'x' ? 'x' : 'z', 0, half - 0.06, open, 'slide', true);
  return moving;
}
