// First-person walking, built for first-timers.
// Desktop: drag to look around, arrow keys or WASD to walk. Touch: left thumb pad to walk, drag on the right to look.
// Walking into a closed door opens it.
const R = 0.18, EYE = 1.6, SPEED = 1.4, LOOK = 0.004, TOUCH_LOOK = 0.006;

export class Walk {
  // colliders: [{ box: Box3, obj: Mesh }]
  constructor(camera, el, bounds, hint, colliders = [], pad = null) {
    Object.assign(this, { camera, el, bounds, hint, colliders, pad, on: false, yaw: 0, pitch: 0, keys: new Set(), move: null, look: null, drag: null });
    this.touch = matchMedia('(pointer: coarse)').matches;
    this.hintText = this.touch ? 'Drag on the right to look around. Use the pad to walk.' : 'Drag to look around. Walk with the arrow keys or W A S D.';
    addEventListener('keydown', (e) => { if (this.on) this.keys.add(e.code); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    el.addEventListener('mousedown', (e) => { if (this.on) this.drag = { x: e.clientX, y: e.clientY }; });
    addEventListener('mouseup', () => (this.drag = null));
    addEventListener('mousemove', (e) => {
      if (!this.on || !this.drag) return;
      this.turn((e.clientX - this.drag.x) * LOOK, (e.clientY - this.drag.y) * LOOK);
      this.drag = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('touchstart', (e) => this.onTouch(e, 'start'), { passive: false });
    el.addEventListener('touchmove', (e) => this.onTouch(e, 'move'), { passive: false });
    el.addEventListener('touchend', (e) => this.onTouch(e, 'end'));
    el.addEventListener('touchcancel', (e) => this.onTouch(e, 'end'));
  }

  enable(pose) {
    this.on = true;
    this.camera.position.set(pose.x, EYE, pose.z);
    this.yaw = pose.yaw || 0; this.pitch = 0; this.apply();
    this.hint.textContent = this.hintText; this.hint.hidden = false;
    clearTimeout(this.hintTimer); this.hintTimer = setTimeout(() => (this.hint.hidden = true), 7000);
  }

  disable() { this.on = false; this.hint.hidden = true; this.keys.clear(); this.move = this.look = this.drag = null; this.thumb(0, 0); }

  turn(dx, dy) {
    this.yaw -= dx;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch - dy));
    this.apply();
  }

  apply() { this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ'); }

  // The visible pad's thumb follows the drag, so it's clear what's happening
  thumb(dx, dy) { if (this.pad) this.pad.firstElementChild.style.transform = `translate(${dx}px, ${dy}px)`; }

  onTouch(e, phase) {
    if (!this.on) return;
    e.preventDefault?.();
    for (const t of e.changedTouches) {
      const left = t.clientX < innerWidth / 2;
      if (phase === 'start') {
        if (left && !this.move) this.move = { id: t.identifier, x: t.clientX, y: t.clientY, dx: 0, dy: 0 };
        else if (!left && !this.look) this.look = { id: t.identifier, x: t.clientX, y: t.clientY };
      } else if (phase === 'move') {
        if (this.move?.id === t.identifier) {
          const dx = t.clientX - this.move.x, dy = t.clientY - this.move.y, k = Math.min(1, 40 / (Math.hypot(dx, dy) || 1));
          this.move.dx = dx; this.move.dy = dy; this.thumb(dx * k, dy * k);
        }
        if (this.look?.id === t.identifier) {
          this.turn((t.clientX - this.look.x) * TOUCH_LOOK, (t.clientY - this.look.y) * TOUCH_LOOK);
          this.look.x = t.clientX; this.look.y = t.clientY;
        }
      } else {
        if (this.move?.id === t.identifier) { this.move = null; this.thumb(0, 0); }
        if (this.look?.id === t.identifier) this.look = null;
      }
    }
  }

  // The first thing (below head height) a body of radius R at (x, z) would bump into, or null.
  hit(x, z) {
    return this.colliders.find(({ box: b }) => b.min.y < 1.2 && b.max.y > 0.15 && x > b.min.x - R && x < b.max.x + R && z > b.min.z - R && z < b.max.z + R) || null;
  }

  update(dt) {
    if (!this.on) return;
    const k = this.keys;
    let fwd = (k.has('KeyW') || k.has('ArrowUp')) - (k.has('KeyS') || k.has('ArrowDown'));
    let side = (k.has('KeyD') || k.has('ArrowRight')) - (k.has('KeyA') || k.has('ArrowLeft'));
    if (this.move) { fwd = Math.max(-1, Math.min(1, -this.move.dy / 40)); side = Math.max(-1, Math.min(1, this.move.dx / 40)); }
    if (!fwd && !side) return;
    this.hint.hidden = true;
    const s = SPEED * dt, sin = Math.sin(this.yaw), cos = Math.cos(this.yaw), p = this.camera.position, b = this.bounds;
    const dx = (-sin * fwd + cos * side) * s, dz = (-cos * fwd - sin * side) * s;
    const stuck = this.hit(p.x, p.z); // started inside something: let them walk out
    for (const [ax, d] of [['x', dx], ['z', dz]]) { // slide along walls: each axis on its own
      const nx = ax === 'x' ? p.x + d : p.x, nz = ax === 'z' ? p.z + d : p.z, h = stuck ? null : this.hit(nx, nz);
      if (!h) p[ax] += d;
      else h.obj.userData.autoOpen?.(); // bumping into a closed door opens it
    }
    p.x = Math.max(b.min.x + R, Math.min(b.max.x - R, p.x));
    p.z = Math.max(b.min.z + R, Math.min(b.max.z - R, p.z));
  }
}
