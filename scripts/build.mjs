// Writes the front page list and each place page from places.json. Run: node scripts/build.mjs
// Adding a place: put its viewer in <slug>/3d/ and its stills in <slug>/stills/ (teaser.jpg for the front page, which
// shouldn't give the layout away, above.jpg for the place page, one per room), add an entry, run this.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname, SITE = 'https://rooms.rr2.dev';
const places = JSON.parse(readFileSync(root + 'places.json', 'utf8')).sort((a, b) => b.year - a.year);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const title = (p) => `${p.type}, ${p.year}`;
const head = (t, desc, img, path) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:title" content="${esc(t)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}${img}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,500&family=Schibsted+Grotesk:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${path === '/' ? '' : '../'}style.css">
</head>`;
const foot = `  <footer><span>Modelled in Three.js from iPhone LiDAR scans.</span><span>Developed by Rahul (<a href="https://rr2.dev">rr2.dev</a>)</span></footer>`;

const intro = "Places I've stayed, rebuilt in 3D from iPhone LiDAR scans I take on the way out. Walk through them, open the doors, switch on the lights.";
writeFileSync(root + 'index.html', `${head("Rooms I've lived in", intro, `/${places[0].slug}/stills/teaser.jpg`, '/')}
<body>
<main class="page">
  <h1>Rooms I've lived in</h1>
  <p class="lede">${esc(intro)}</p>
  <ul class="places">
${places.map((p) => `    <li><a class="place" href="${p.slug}/3d/index.html">
      <img src="${p.slug}/stills/teaser.jpg" alt="${esc(p.teaser)}" width="1600" height="1000">
      <div><h3>${esc(title(p))}</h3>${p.city ? `<p>${esc(p.city)}</p>` : ''}<span class="go">Step inside</span></div>
    </a></li>`).join('\n')}
  </ul>
${foot}
</main>
</body>
</html>
`);

for (const p of places) {
  mkdirSync(root + p.slug, { recursive: true });
  writeFileSync(root + p.slug + '/index.html', `${head(`${title(p)} · Rooms I've lived in`, p.blurb, `/${p.slug}/stills/above.jpg`, `/${p.slug}/`)}
<body>
<script>/* old-style room links (/${p.slug}/#kitchen) open the 3D in that room */
const k = location.hash.slice(1); if (${JSON.stringify(p.rooms.map((r) => r[0]))}.includes(k)) location.replace('3d/index.html#walk=' + k);</script>
<main class="page">
  <a class="crumb" href="../index.html">Rooms I've lived in</a>
  <h1>${esc(title(p))}</h1>
  <p class="lede">${esc(p.blurb)} Doors, lights, curtains and the TV all work.</p>
  <a class="hero" href="3d/index.html#above"><img src="stills/above.jpg" alt="The whole place from above, walls cut away" width="1600" height="1000"></a>
  <div class="actions">
    <a class="btn dark" href="3d/index.html#above">Look around from above</a>
    <a class="btn" href="3d/index.html#walkthrough">Take the walkthrough</a>
    <button class="btn share" id="share" data-url="${SITE}/${p.slug}/" data-title="${esc(title(p))}">Share</button>
  </div>
  <p class="copied" id="copied" role="status" aria-live="polite"></p>
  <h2>Rooms</h2>
  <ul class="rooms">
${p.rooms.map(([k, n]) => `    <li><a href="3d/index.html#walk=${k}"><img src="stills/${k}.jpg" alt="${esc(n)}" width="1200" height="900" loading="lazy"><span>${esc(n)}</span></a></li>`).join('\n')}
  </ul>
  <p class="note">Each room opens at eye level. Drag to look around, walk with the arrow keys or the on-screen pad, and tap things to use them.</p>
${foot}
</main>
<script>
// Share the place: the phone's share sheet where there is one, otherwise copy the link
const b = document.getElementById('share'), out = document.getElementById('copied');
b.onclick = async () => {
  const { url, title } = b.dataset;
  if (navigator.share) { try { await navigator.share({ title, url }); } catch {} return; }
  try { await navigator.clipboard.writeText(url); out.textContent = 'Link copied'; } catch { out.textContent = url; }
  setTimeout(() => (out.textContent = ''), 2500);
};
</script>
</body>
</html>
`);
}
console.log('built', places.length, 'place(s)');
