// Live playtest for LUMENKEEPER (no ?shot staging): drives the real game with
// scripted keyboard/mouse and verifies the live state through window.__world.
// Screenshots of the continuously-animating page can stall this headless
// setup, so the screenshot is attempted once with a hard timeout and a
// failure there is reported, not fatal — the state checks are the verdict.
// Run from the repo root:  node test/playtest.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '..');
const errors = [];

const server = spawn('node', ['serve.ts'], { cwd: repo, stdio: 'pipe' });
await new Promise((resolve) => setTimeout(resolve, 1200));

const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

  const state = () => page.evaluate(() => {
    const w = window.__world;
    return w ? { screen: w.screen, wave: w.wave, score: w.score, kills: w.kills, hearts: w.player.hearts, lighthouse: Math.round(w.lighthouseHp), enemies: w.enemies.length, bullets: w.bullets.length, embers: w.embers } : null;
  });

  await page.goto('http://localhost:8080/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 10000 });
  console.log('title:', JSON.stringify(await state()));

  // Start with Enter.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  console.log('after Enter:', JSON.stringify(await state()));

  // Play 12 s: hold fire, weave, aim around.
  await page.mouse.move(800, 300);
  await page.mouse.down();
  for (let i = 0; i < 24; i += 1) {
    const key = ['KeyW', 'KeyA', 'KeyS', 'KeyD'][i % 4];
    await page.keyboard.down(key);
    await page.mouse.move(500 + (i % 5) * 120, 250 + (i % 3) * 110);
    await page.waitForTimeout(500);
    await page.keyboard.up(key);
  }
  await page.mouse.up();
  const mid = await state();
  console.log('after 12s play:', JSON.stringify(mid));
  if (!mid || mid.screen !== 'playing') throw new Error('game left playing state during playtest');
  if (mid.kills < 1) throw new Error('no kills registered in 12s of firing');

  // Nova: force full embers, press F, confirm it fires (kills jump, the
  // field clears; fresh ember drops may already refill the meter).
  const beforeNova = await state();
  await page.evaluate(() => { window.__world.embers = 12; });
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(300);
  const afterNova = await state();
  console.log('after nova:', JSON.stringify(afterNova));
  if (afterNova.kills <= beforeNova.kills && afterNova.enemies >= beforeNova.enemies) throw new Error('nova had no effect');

  // Pause and resume.
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(300);
  const paused = await state();
  console.log('paused:', JSON.stringify(paused));
  if (paused.screen !== 'paused') throw new Error('pause did not engage');
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(300);
  const resumed = await state();
  if (resumed.screen !== 'playing') throw new Error('resume did not work');

  // One bounded live-frame screenshot attempt.
  try {
    await page.screenshot({ path: join(repo, 'test', 'playtest-live.jpg'), type: 'jpeg', quality: 82, timeout: 30000 });
    console.log('live screenshot: saved');
  } catch (err) {
    console.log('live screenshot: SKIPPED (headless capture stalled:', err.message.split('\n')[0] + ')');
  }

  console.log('page errors:', errors.length ? errors : 'none');
  if (errors.length) throw new Error('page errors during playtest');
  console.log('LIVE PLAYTEST PASSED');
} finally {
  await browser.close();
  server.kill();
}
