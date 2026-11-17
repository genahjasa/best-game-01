// Deterministic screenshot scenes behind ?shot=title|play|upgrade|over|win.
// Each scene plays the real rules forward from a fresh world for a fixed number
// of steps, steered by a simple autopilot (chase the nearest shade, keep the
// lighthouse between the keeper and the pack, fire when lined up, nova when
// charged), so every frame is what a real game looks like and the same seed
// always gives the same frame. The renderer sets window.__shotReady once the
// staged scene has been drawn.
import { STEP } from './world.js';
import { VIEW } from './config.js';

const SHOT_SECONDS = { title: 6, play: 34, upgrade: 24, over: 46, win: 240 };

function autopilot(world, sloppy) {
  const p = world.player;
  const near = world.nearestEnemy();
  let mx = 0;
  let my = 0;
  let angle = p.angle;
  let fire = false;
  let beam = false;
  if (near) {
    angle = Math.atan2(near.y - p.y, near.x - p.x);
    // The screenshot pilot is sloppy on purpose: it misses, fires in bursts
    // and dawdles, so shades pile up and the frame shows a real fight.
    if (sloppy) angle += (world.rng() - 0.5) * 0.7;
    // Keep some distance from the pack: strafe sideways while firing.
    const d = Math.hypot(near.x - p.x, near.y - p.y);
    const away = Math.atan2(p.y - near.y, p.x - near.x);
    const strafe = Math.sin(world.time * 1.3) > 0 ? 1 : -1;
    if (d < 150) {
      mx = Math.cos(away) + Math.cos(away + Math.PI / 2) * strafe * 0.6;
      my = Math.sin(away) + Math.sin(away + Math.PI / 2) * strafe * 0.6;
    } else if (d > 320) {
      mx = Math.cos(angle) * 0.8;
      my = Math.sin(angle) * 0.8;
    } else {
      mx = Math.cos(angle + Math.PI / 2) * strafe;
      my = Math.sin(angle + Math.PI / 2) * strafe;
    }
    fire = !sloppy || world.rng() < 0.55;
  } else {
    // No enemy in sight: drift back toward the lighthouse.
    const a = Math.atan2(360 - p.y, 640 - p.x);
    mx = Math.cos(a) * 0.5;
    my = Math.sin(a) * 0.5;
  }
  if (world.embers >= 12 && world.enemies.length >= 4) beam = true;
  return { mx, my, angle, fire, beam };
}

/**
 * Stage the named scene in `world` and return the screen it should show.
 * Scenes run the real simulation; 'win' plays a blessed run (the autopilot
 * gets maxed stats) so the victory panel is a real one.
 */
export function stageShot(name, world) {
  const seconds = SHOT_SECONDS[name] || SHOT_SECONDS.title;
  world.reset(20261116);
  if (name === 'title') {
    for (let i = 0; i < seconds / STEP; i += 1) world.step(STEP, null, null);
    return 'title';
  }
  world.startGame(20261116);
  if (name === 'win') {
    // A charmed run: heavy damage, fast fire, twin bolts, so the pilot clears
    // all ten waves and the victory panel is earned, not staged.
    world.player.damage = 6;
    world.player.fireRate = 2.2;
    world.player.projectiles = 3;
    world.player.pierce = 2;
  }
  const steps = Math.floor(seconds / STEP);
  const sloppy = name === 'play';
  for (let i = 0; i < steps; i += 1) {
    if (world.screen === 'upgrade') {
      // Take the first blessing every draft, like a decisive player.
      world.chooseBlessing(0);
      continue;
    }
    if (world.screen !== 'playing') break;
    world.step(STEP, null, (w) => autopilot(w, sloppy));
  }
  if (name === 'win' && world.screen === 'playing') {
    // The victory run takes a while: keep playing (same charmed pilot) until
    // the Hollow Star falls, up to 400 simulated seconds.
    let extra = 0;
    while (world.screen === 'playing' && extra < 400 / STEP) {
      if (world.screen === 'upgrade') { world.chooseBlessing(0); continue; }
      world.step(STEP, null, (w) => autopilot(w, false));
      extra += 1;
    }
  }
  if (name === 'upgrade') {
    // Run until the first draft opens, then hold it for the frame.
    world.reset(20261116);
    world.startGame(20261116);
    let guard = 0;
    while (world.screen !== 'upgrade' && guard < 60 / STEP * 90) {
      world.step(STEP, null, autopilot);
      guard += 1;
      if (world.screen === 'upgrade') break;
    }
    world.draftTimer = 6.5;
    return 'upgrade';
  }
  if (name === 'over') return 'over';
  if (name === 'win') return world.screen === 'win' ? 'win' : 'over';
  return world.screen === 'playing' ? 'playing' : world.screen;
}
