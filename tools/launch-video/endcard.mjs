// Films the design system's end card (docs/personal/v1/video/end-card.html) at 30 fps with puppeteer.
import puppeteer from 'puppeteer-core'; import { spawn } from 'node:child_process';
const dir = process.env.DESIGN_VIDEO || '../../../design/docs/personal/v1/video', out = 'hf/assets/clips/endcard.mp4', fps = 30; // DESIGN_VIDEO: end card from the r-r-2/design repo
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
const p = await b.newPage(); await p.setViewport({ width: 1920, height: 1080 });
await p.goto(`file://${dir}/end-card.html?film=1&w=1920&h=1080&site=rooms&cta=${encodeURIComponent('Take a tour')}`);
await p.evaluate(() => window.ready); const dur = await p.evaluate(() => DURATION), n = Math.round(dur * fps);
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let i = 0; i < n; i++) { await p.evaluate((t) => window.render(t), i / fps); ff.stdin.write(await p.screenshot({ type: 'png' })); }
await p.evaluate((t) => window.render(t), 1.95); await p.screenshot({ path: 'endcard_blink.png' });
await p.evaluate((t) => window.render(t), dur); await p.screenshot({ path: 'endcard_last.png' });
ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await b.close(); console.log(out, n, 'frames', dur, 's');
