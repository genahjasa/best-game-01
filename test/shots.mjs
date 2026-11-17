// Screenshot runner for LUMENKEEPER's staged scenes.
// Serves game/ on localhost, opens each ?shot= scene in headless Chromium at
// 1280x720, waits for window.__shotReady, and saves a JPEG (<= 256 KiB).
// (The live playtest lives in test/playtest.mjs.)
// Run from the repo root:  node test/shots.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '..');
const shots = [
  { name: '1-title.jpg', query: '?shot=title&seed=1' },
  { name: '2-play.jpg', query: '?shot=play&seed=1' },
  { name: '3-upgrade.jpg', query: '?shot=upgrade&seed=1' },
  { name: '4-win.jpg', query: '?shot=win&seed=1' },
];

const server = spawn('node', ['serve.ts'], { cwd: repo, stdio: 'pipe' });
await new Promise((resolve) => setTimeout(resolve, 1200));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-angle=swiftshader'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

  for (const shot of shots) {
    console.log('staging', shot.name);
    await page.goto(`http://localhost:8080/${shot.query}`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.__shotReady === true, { timeout: 120000 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(repo, 'screenshots', shot.name), type: 'jpeg', quality: 82, timeout: 120000 });
    const size = statSync(join(repo, 'screenshots', shot.name)).size;
    console.log(`${shot.name}: ${size} bytes ${size <= 262144 ? '(OK <=256KiB)' : '(TOO BIG!)'}`);
  }

  console.log('page errors:', errors.length ? errors : 'none');
} finally {
  await browser.close();
  server.kill();
}
console.log('SHOTS DONE');
