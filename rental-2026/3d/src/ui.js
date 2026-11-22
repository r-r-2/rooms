// Small UI helpers: the film-camera time stamp, room names by position.

// Seven-segment digits like a film camera's date imprint, drawn as SVG.
const SEG = { a: [2, 0, 8, 2], b: [10, 2, 2, 8], c: [10, 12, 2, 8], d: [2, 20, 8, 2], e: [0, 12, 2, 8], f: [0, 2, 2, 8], g: [2, 10, 8, 2] };
const ON = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
export function stamp(text, size = 40) {
  let x = 0, rects = '';
  for (const ch of text) {
    if (ON[ch] !== undefined) {
      for (const [k, [rx, ry, w, h]] of Object.entries(SEG)) rects += `<rect x="${x + rx}" y="${ry}" width="${w}" height="${h}" rx="0.6" opacity="${ON[ch].includes(k) ? 1 : 0.07}"/>`;
      x += 15;
    } else if (ch === ':') { rects += `<rect x="${x + 1}" y="6" width="2" height="2"/><rect x="${x + 1}" y="14" width="2" height="2"/>`; x += 6; }
    else x += 8;
  }
  const w = x + 3;
  return `<svg role="img" aria-label="${text}" width="${(w * size) / 22}" height="${size}" viewBox="0 0 ${w} 22"><g transform="skewX(-8) translate(3 0)" fill="currentColor">${rects}</g></svg>`;
}

export const fmt = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

// Which room a point is in (for the walk-mode room label and the room buttons).
const ZONES = [
  ['Kitchen', 1.08, 3.65, -3.69, -0.58], ['Living room', 1.08, 3.65, -0.58, 3.55],
  ['Bedroom', -2.13, 1.08, -2.76, 0.16], ['Dressing', -0.5, 1.08, 0.16, 0.95],
  ['Toilet', -0.5, 1.08, 0.95, 2.43], ['Shower', -0.5, 0.3, 2.43, 3.55],
  ['Wash area', -2.13, -0.5, 2.43, 3.55], ['Corridor', -2.13, -0.5, 0.16, 2.43],
];
export function roomAt(x, z) {
  for (const [name, x0, x1, z0, z1] of ZONES) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return name;
  return '';
}

// Framed dollhouse shots for the room buttons: [target x, z, camera distance].
export const ROOM_SHOTS = {
  Bedroom: [-0.5, -1.3, 7], Dressing: [0.3, 0.6, 5], Kitchen: [2.35, -2.1, 6.5],
  'Living room': [2.35, 1.5, 7], Bathroom: [-0.6, 2.5, 6],
};
