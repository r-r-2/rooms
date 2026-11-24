# AGENTS.md

Instructions for AI agents working on this repo. Read this before changing anything.

## What this is

**Rooms I've lived in** (https://rooms.rr2.dev): places Rahul has stayed, rebuilt as interactive 3D in Three.js from iPhone LiDAR scans. The scans are only a reference. Every model is written by hand in code from simple boxes, so it stays light, interactive and private.

Plain static site. No build step, no framework, no bundler. Deployed by Cloudflare Pages on every push to `main`.

## Working with Rahul

- **Propose first, then wait for a go-ahead** before building anything non-trivial. Say what you'll change in plain words; mockups or a preview help.
- He reviews on his phone. Keep replies short and lead with the answer.
- He catches layout mistakes against the real place. When he corrects something, record it in `docs/<place>.md` so it isn't undone later.

## Commits

- Conventional Commits: `feat(viewer): …`, `fix(pages): …`, `chore(seo): …`, `perf(viewer): …`, `docs: …`.
- Author: `Rahul Ravikumar <10581474+r-r-2@users.noreply.github.com>`. Never another address.
- Never add a `Claude-Session:` link line to commit messages.
- Push to `main` only when Rahul has said go. Cloudflare deploys within a minute.

## Privacy (hard rules)

- Never publish where a place is: no address, building or condo name, area, street, floor, city, or exact dates. A place is labelled only by type and year, e.g. "Short-term rental, 2026". A `city` field exists in `places.json` but stays `null` unless Rahul asks.
- Exception, Rahul's call (Nov 2026): the rental-2026 view outside the windows is built from real map data (OpenStreetMap, Overture), so the building can be found from it. Still never name it, the area, the bank, the train line or the floor in text, comments, UI or commit messages; the tower is "the tall building" and the train "the skytrain". Keep the map credit in the menu (ODbL).
- Never commit raw scans (`.glb`, `.ply`, `.usdz`, scan photos or video). They contain real photos, including people. `.gitignore` blocks the common formats.
- Wall art, prints and screens are drawn in code. No family photos, nameplates or recognisable people.
- Link previews (`og:image`) use an eye-level still, never the layout from above: the layout is meant to be a surprise.

## Layout

```
index.html               front page (generated, don't edit by hand)
places.json              the list of places
style.css                styles for the front and place pages
scripts/build.mjs        writes index.html and each <slug>/index.html from places.json
analytics.js             GA4, loaded by every page (see Analytics)
robots.txt, sitemap.xml
vendor/three/            Three.js r187: three.module.js, three.core.js, OrbitControls, RoomEnvironment
<slug>/index.html        place page (generated)
<slug>/stills/           teaser.jpg (front page), og.jpg (1200x630 link preview), above.jpg, one still per room
<slug>/media/launch.mp4  small copy of the launch video, used by og:video
<slug>/3d/               the interactive viewer for that place
docs/<slug>.md           what the real place looks like: Rahul's corrections, room by room
tools/launch-video/      how the launch video was made (scripts, HyperFrames project)
```

After editing `places.json`, `style.css` or `scripts/build.mjs`, run `node scripts/build.mjs` and commit the generated HTML with it.

## The 3D viewer (`<slug>/3d/`)

`index.html` holds the UI markup; Three.js loads through an import map from `../../vendor/three/`. Modules in `src/`:

| File | What it does |
|---|---|
| `main.js` | Scene, renderer, modes (`intro`, `orbit` = from above, `walk`, `tour` = walkthrough), UI wiring, menus, deep links, calm (fade when idle) |
| `build.js` | Helpers: `box`, `wall` (outer walls tagged for cutaway), `floor`; ceiling height `H = 2.6` |
| `materials.js` | Shared materials and canvas textures |
| `rooms/*.js` | One file per area; each exports a group. Room bounds are constants at the top of each file |
| `interact.js` | Tap targets, tweens, `hingedDoor`, `slider`, `slidingGlass`; doors can `autoOpen` when walked into |
| `lights.js` | Ceiling downlights per room, tap to toggle |
| `daylight.js` | Sun, sky and window glow by hour (Morning, Midday, Evening, Night) |
| `sound.js` | Room tone and effects, synthesised with Web Audio. Off by default |
| `walk.js` | First-person walking: drag to look, keys or touch pad, collisions |
| `tour.js` | The walkthrough: one smooth path with head bob, stops that look around, skip by room |
| `view.js` | The view outside: buildings, roads, trees and skytrain from map data (`view-data.js`, `view-overture*.js`), sky by hour, the lit tall building (tap or the bulb button to change its lights), sunset glint on glass. Coordinates are metres from the building, never lat/lon |
| `intro.js` | LiDAR-style scan sweep that reveals the place, then the lights ripple on |
| `ui.js` | Room zones (`roomAt`) and camera shots per room |

Coordinates are metres. `x` runs west → east, `z` runs north → south (the front door is on the south side), `y` is up. Outer walls facing the camera hide in the view from above.

Deep links: `#walk=<room>` (living, kitchen, bedroom, dressing, bathroom), `#walkthrough`, `#above`. `#nointro,nowelcome` skips the intro and welcome sheet, useful for testing. `window.__app` exposes the camera, modes, items and tour for scripted checks.

## Design

- Viewer and site: "first light, last look". Haze `#dce3e8`, paper `#f7f8f7`, ink `#2e2620`, muted `#4a423c`, one orange accent `#ff6a13`.
- Type: Literata for titles, Atkinson Hyperlegible Next for everything you read (15–17px minimum).
- Minimal: one row of controls per mode; the rest lives in the ⋯ menu and the Rooms sheet. Controls fade after 3 s idle.
- Rahul's own brand (raspberry, Fraunces, his avatar) appears only on video end cards, from the `r-r-2/design` repo.

## Checking your work

```sh
python3 -m http.server 8000      # then open http://localhost:8000
```

Headless Chrome with SwiftShader works for smoke tests and screenshots (slow, about 1 s a frame at 1080p). Check: no page errors, the intro ends on the welcome sheet, each deep link lands in the right room, and phone-sized screenshots (390x844) aren't crowded. Compare changed rooms against `docs/<slug>.md`.

## Adding a place

1. Make `<slug>/3d/` (copy an existing viewer, replace `src/rooms/` and the room lists in `main.js`, `tour.js`, `ui.js`).
2. Render stills into `<slug>/stills/`: `teaser.jpg` (eye level, no layout), `og.jpg` (1200x630 crop of it), `above.jpg`, one per room.
3. Add the entry to `places.json`, run `node scripts/build.mjs`, add the page to `sitemap.xml`.
4. Write `docs/<slug>.md` as Rahul confirms details.
5. Slugs are type and year: `rental-2026`, `airbnb-2027`, `hotel-2027-2`.

## Analytics

`analytics.js` loads GA4 (`G-5WBF3XZCB1`) only on `rooms.rr2.dev`, with consent mode set to denied for everything. **Known issue:** with consent always denied, GA4 records cookieless pings only, which don't show up as users or sessions, so reports stay empty. Rahul hasn't yet picked a fix (consent banner, Cloudflare Web Analytics, both, or GA with cookies). Custom events: `welcome_choice`, `choose_view`, `room_open`, `use_object`, `walkthrough_complete`, `room_sound`, `replay_intro`, `share`.
