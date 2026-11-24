# Launch video

How the 24.6 s launch video for `rental` was made (1920x1080, 30 fps). The final file lives in the notes repo at `worklog/rooms-ive-lived-in/rooms-launch.mp4`; a small copy is at `rental/media/launch.mp4` for `og:video`.

Nothing heavy is committed here: no frames, clips, renders or music.

## Music

"Trap Banger" by Alex Morgan on Pixabay: https://pixabay.com/music/trap-trap-banger-591329/ (Pixabay licence). Download it as `hf/assets/track.mp3`. The video uses 0:49 → 1:13.6. `kicks.json` holds the kick times found in that track; the cuts land on them.

## Steps

1. **Serve a patched copy of the site.** Copy the repo to `site/`, apply `main.js.patch` to `site/rental/3d/src/main.js` (it adds `window.__noGlow` and exposes `orbit` on `window.__app`), then serve it:
   ```sh
   cd site && python3 -m http.server 8780
   ```
2. **Install:** `npm install` here and in `hf/`. Copy `hf/node_modules/gsap/dist/gsap.min.js` to `hf/assets/`.
3. **Film each scene** on a fake clock, so motion is perfectly even. One at a time (two cores can't render in parallel):
   ```sh
   for s in A B BN C1 C2 C3 C4 D; do node capture.mjs $s; done
   ```
   Each writes `hf/assets/clips/<scene>.mp4`. `node capture.mjs C2 0,30,60` renders only those frames to `frames/C2/` for a quick look.
   - A: the scan reveal, spiralling down from above
   - B, BN: orbit from above, day then night (crossfade at 6.06 s)
   - C1–C3: walk shots tapping things in the rooms; C4: the fridge
   - D: closing walk
4. **Film the end card** from the `r-r-2/design` repo (Rahul's brand, CTA "Take a tour"):
   ```sh
   DESIGN_VIDEO=/path/to/design/docs/personal/v1/video node endcard.mjs
   ```
5. **Compose** with HyperFrames:
   ```sh
   cd hf && npx hyperframes lint && npx hyperframes render -o renders/rooms-launch.mp4
   ```
   `index.html` places the clips and music; `compositions/scan.html` draws the orange scan line wiping across each cut. The small punch-zoom on the beat is limited to the reveal from above (before 7.9 s).
6. **Fix the loudness.** HyperFrames lowers the music, so remix it with ffmpeg, video copied:
   ```sh
   ffmpeg -i renders/rooms-launch.mp4 -ss 49 -t 24.6 -i assets/track.mp3 -map 0:v -map 1:a -c:v copy \
     -af "afade=t=in:d=0.15,afade=t=out:st=23:d=1.6,alimiter=limit=0.95" -c:a aac -b:a 192k renders/rooms-launch-final.mp4
   ```

## Cut times

0, 4.0, 7.93, 10.0, 11.86, 13.93, 15.17, 20.55 (end card), 24.6 s. Frame numbers are in `CUTS` at the top of `capture.mjs`.
