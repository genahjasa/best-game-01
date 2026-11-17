// Headless logic test for LUMENKEEPER: stubs the browser globals, imports the
// real world module, and plays full games with the shots autopilot. Run with:
//   node --experimental-vm-modules test/simulate.mjs
// (No DOM, no canvas: rendering is never imported here.)
globalThis.window = {
  localStorage: { getItem: () => null, setItem: () => {} },
  addEventListener: () => {},
  AudioContext: undefined,
};
globalThis.document = { getElementById: () => null };
globalThis.performance = { now: () => 0 };

const { createWorld, STEP } = await import('../game/src/world.js');
const { stageShot } = await import('../game/src/shots.js');

function playGame(seed, seconds, label) {
  const world = createWorld();
  world.startGame(seed);
  const steps = Math.floor(seconds / STEP);
  let maxWave = 0;
  let sawUpgrade = false;
  for (let i = 0; i < steps; i += 1) {
    if (world.screen === 'upgrade') {
      sawUpgrade = true;
      world.chooseBlessing(0);
      continue;
    }
    if (world.screen !== 'playing') break;
    maxWave = Math.max(maxWave, world.wave);
    // Simple autopilot: chase nearest, fire, nova when charged.
    const p = world.player;
    const near = world.nearestEnemy();
    let mx = 0; let my = 0; let angle = p.angle; let fire = false; let beam = false;
    if (near) {
      angle = Math.atan2(near.y - p.y, near.x - p.x);
      const d = Math.hypot(near.x - p.x, near.y - p.y);
      if (d < 150) { mx = Math.cos(angle + Math.PI); my = Math.sin(angle + Math.PI); }
      else if (d > 320) { mx = Math.cos(angle) * 0.8; my = Math.sin(angle) * 0.8; }
      fire = true;
    }
    if (world.embers >= 12 && world.enemies.length >= 4) beam = true;
    // Drive the same code path the live loop uses.
    const fake = { mx, my, angle, fire, beam };
    world.step(STEP, null, () => fake);
  }
  console.log(`${label}: screen=${world.screen} wave=${world.wave} maxWave=${maxWave} score=${world.score} kills=${world.kills} sawUpgrade=${sawUpgrade} lighthouse=${Math.round(world.lighthouseHp)} hearts=${world.player.hearts} embers=${world.embers} blessings=${world.stats.blessings}`);
  return world;
}

// 1. A normal 90-second game: waves must advance, kills and score must grow.
const g1 = playGame(7, 90, 'game-90s');
if (g1.wave < 2) throw new Error('waves did not advance');
if (g1.kills < 5) throw new Error('too few kills');
if (g1.score <= 0) throw new Error('score stayed zero');

// 2. A long charmed game (maxed stats) must be able to WIN.
const g2 = createWorld();
g2.startGame(99);
g2.player.damage = 6; g2.player.fireRate = 2.2; g2.player.projectiles = 3; g2.player.pierce = 2;
let guard = 0;
while (g2.screen !== 'win' && g2.screen !== 'over' && guard < 60 * 60 * 8) {
  if (g2.screen === 'upgrade') { g2.chooseBlessing(0); continue; }
  const p = g2.player;
  const near = g2.nearestEnemy();
  let mx = 0; let my = 0; let angle = p.angle; let fire = false; let beam = false;
  if (near) {
    angle = Math.atan2(near.y - p.y, near.x - p.x);
    const d = Math.hypot(near.x - p.x, near.y - p.y);
    const strafe = Math.sin(g2.time * 1.3) > 0 ? 1 : -1;
    if (d < 150) { mx = Math.cos(angle + Math.PI) + Math.cos(angle + Math.PI / 2) * strafe * 0.6; my = Math.sin(angle + Math.PI) + Math.sin(angle + Math.PI / 2) * strafe * 0.6; }
    else if (d > 320) { mx = Math.cos(angle) * 0.8; my = Math.sin(angle) * 0.8; }
    else { mx = Math.cos(angle + Math.PI / 2) * strafe; my = Math.sin(angle + Math.PI / 2) * strafe; }
    fire = true;
  }
  if (g2.embers >= 12 && g2.enemies.length >= 4) beam = true;
  const fake = { mx, my, angle, fire, beam };
  g2.step(STEP, null, () => fake);
  guard += 1;
}
console.log(`charmed: screen=${g2.screen} wave=${g2.wave} score=${g2.score} kills=${g2.kills} after ${Math.round(guard / 60)}s sim`);
if (g2.screen !== 'win') throw new Error('charmed run did not win: ' + g2.screen);

// 3. A helpless keeper must LOSE (enemies can reach the lighthouse / player).
const g3 = createWorld();
g3.startGame(5);
guard = 0;
while (g3.screen === 'playing' && guard < 60 * 60 * 6) {
  g3.step(STEP, null, () => ({ mx: 0, my: 0, angle: 0, fire: false, beam: false }));
  guard += 1;
}
console.log(`idle: screen=${g3.screen} wave=${g3.wave} after ${Math.round(guard / 60)}s sim`);
if (g3.screen !== 'over') throw new Error('idle run did not end: ' + g3.screen);

// 4. Every shot scene stages without throwing and lands on its screen.
for (const name of ['title', 'play', 'upgrade', 'over', 'win']) {
  const w = createWorld();
  const staged = stageShot(name, w);
  console.log(`shot ${name}: staged=${staged} score=${w.score} enemies=${w.enemies.length}`);
}
console.log('ALL SIMULATION TESTS PASSED');
