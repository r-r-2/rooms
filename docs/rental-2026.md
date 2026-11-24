# Short-term rental, 2026

What the real place looks like, as Rahul confirmed it against his scan. When the model and this file disagree, this file wins. Don't "fix" any of these back.

Coordinates in metres, `x` east, `z` south, ceiling `H = 2.6`. Bounds live at the top of each file in `3d/src/rooms/`.

## Rooms

- **Living + kitchen** (`kitchen_living.js`): `x 1.08 → 3.65`, `z -3.69 → 3.55`, split at `z -0.58` (kitchen north, living south).
- **Bedroom** (`bedroom.js`): `x -2.13 → 1.03`, `z -2.76 → 0.16`.
- **Dressing + bath** (`baths.js`): `x -2.13 → 1.08`, `z 0.16 → 3.55`. Toilet room `x -0.5 → 1.08`, `z 0.95 → 2.43`, with the shower south of it.
- Front door on the south wall, `z = 3.55`.

## Living

- Sofa without a chaise.
- Centre table has a **glass top**.
- TV unit along the wall; the laundry and toilet doors are to the left of the TV.
- Shoe cabinet by the entrance.
- Three-panel mountain print on the wall, drawn in code.
- TV shows a short, light screen of its own (no streaming logos, no real shows).
- Balcony sliding door with a grill.

## Kitchen

- Window goes **down to the floor**. The blinds go to the floor too, tilt, and can close the window fully.
- Counter on the east wall (from the scan): white top from z -3.11 to -1.51 with a raised back lip, oak base cabinets
  (drawers on the north side, two doors on the south). The oak corner north of it (-3.59 to -3.11) is where the desk wraps round.
- **Black induction hob on the north side (-2.76 to -2.46), steel sink on the south side (-2.28 to -1.87)** with the tap behind it.
- Above the counter, north to south: open white shelves with the microwave on the bottom one, a tall black glass hood over the hob,
  cream cabinets over the sink and the fridge with a top row to 2.56 m, and an open shelf under the cabinet above the sink.
  Beige tiled splashback.
- Fridge at z -1.43 to -0.88 (it opens; it's also a shot in the launch video).
- Desk with two white chairs, offset from the table.
- Glass partition between kitchen and bedroom side: two halves, the west half open.

## Bedroom

- Bedroom door is hinged and can be closed.
- **Almirah**: two hinged doors, oak wood texture, a **mirror covering each door fully** (silver-grey). Open shelves on the outside right side, **facing the bed** (not the other way).

## Dressing and bath

- Dressing table.
- Toilet door: frosted glass, full width, two panels, about 90% opaque.
- Wash area has a sliding door.
- Toilet room basin on the north wall, with a full-width mirror above it.
- **Beside the wash basin is a dark tiled wall, not wood** (`z 2.4 → 2.468`).
- Shower: tiles below, glass above.
- Niche in the wall stays solid below its lowest shelf.

## Walkthrough

- Order: living, kitchen, bedroom, dressing, bathroom. The bathroom is one stop with glimpses of basin, toilet and shower.
- Walks at a set pace, like a person, with a barely-there head bob.
- Skip to the next room instead of a seek bar.

## Intro and UI

- Intro is a LiDAR-style scan line sweeping across the whole place at once (not floors appearing one by one), then lights ripple on.
- Order everywhere: **From above, Walkthrough, Walk**.
- Minimal and calm: few things on screen, controls fade when idle, sound off by default (in the ⋯ menu).
- Share links share the place, not a single room.
