# Rooms I've lived in

Places I've stayed, modelled in Three.js from iPhone LiDAR scans taken on the way out. Live at [rooms.rr2.dev](https://rooms.rr2.dev).

Plain static site, no build step to serve it. Deployed on Cloudflare Pages from `main`.

## Layout

```
index.html            front page (generated)
places.json           the list of places
style.css             shared styles for the front and place pages
scripts/build.mjs     writes index.html and each <slug>/index.html from places.json
<slug>/index.html     place page (generated)
<slug>/stills/        teaser.jpg (front page, no layout), og.jpg (1200x630 link preview), above.jpg, one still per room
<slug>/3d/            the interactive 3D model
vendor/three/         Three.js r187 (just the files the viewers use)
```

## Adding a place

1. Put its viewer in `<slug>/3d/` and its stills in `<slug>/stills/`.
2. Add an entry to `places.json` (type, year, optional city, blurb, teaser alt text, rooms).
3. Run `node scripts/build.mjs`, add the page to `sitemap.xml`, commit.

Room links: `/<slug>/#kitchen` opens the 3D in that room. The viewer also takes `#walkthrough` and `#above`.

## Run locally

```
python3 -m http.server 8000
```

Developed by Rahul ([rr2.dev](https://rr2.dev)).
