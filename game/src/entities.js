// Everything that lives on the field: the keeper, the shades, bullets, embers and
// the two bosses. Entities are plain data plus a step function each; the world
// owns the arrays and the collisions.
import { BOSSES, ENEMIES, LIGHTHOUSE, VIEW } from './config.js';
import { angleTo, clamp, pick, range } from './random.js';

export function createPlayer(x, y) {
  return {
    x, y, radius: 14, angle: -Math.PI / 2,
    hearts: 3, maxHearts: 3,
    fireTimer: 0,
    iframe: 0,
    trail: [],
    // Upgrade stats, all multiplied in from the blessing draft.
    damage: 1, fireRate: 1, projectiles: 1, pierce: 0,
    moveSpeed: 1, critChance: 0, magnet: 1, emberWorth: 1,
  };
}

export function spawnEnemy(rng, kind, x, y, wave) {
  const def = ENEMIES[kind];
  const hpScale = 1 + Math.max(0, wave - 3) * 0.12;
  return {
    kind, x, y,
    radius: def.radius,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * range(rng, 0.9, 1.15),
    score: def.score,
    color: def.color, eye: def.eye,
    // 60% march on the lighthouse, the rest hunt the keeper.
    target: rng() < 0.6 ? 'light' : 'player',
    wobble: rng() * Math.PI * 2,
    wobbleSpeed: range(rng, 1.5, 3),
    spitTimer: range(rng, 1.5, 3),
    latched: false,
    flash: 0,
    dead: false,
  };
}

export function spawnBoss(rng, kind, wave) {
  const def = BOSSES[kind];
  const angle = rng() * Math.PI * 2;
  const boss = {
    kind, isBoss: true, name: def.name,
    x: VIEW.width / 2 + Math.cos(angle) * 520,
    y: VIEW.height / 2 + Math.sin(angle) * 300,
    radius: def.radius,
    hp: Math.round(def.hp * (1 + (wave - 5) * 0.08)),
    maxHp: Math.round(def.hp * (1 + (wave - 5) * 0.08)),
    speed: def.speed,
    score: def.score,
    color: def.color, eye: def.eye,
    target: 'player',
    wobble: 0, wobbleSpeed: 0,
    spitTimer: 2, burstTimer: 4, summonTimer: 7,
    latched: false, flash: 0, dead: false,
  };
  boss.maxHp = boss.hp;
  return boss;
}

export function enemyStep(e, dt, world) {
  e.flash = Math.max(0, e.flash - dt);
  const tx = e.target === 'light' ? LIGHTHOUSE.x : world.player.x;
  const ty = e.target === 'light' ? LIGHTHOUSE.y : world.player.y;
  const dx = tx - e.x;
  const dy = ty - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  // Wisps weave; the rest march straight, with a slow wobble for life.
  let vx = (dx / dist) * e.speed;
  let vy = (dy / dist) * e.speed;
  if (e.kind === 'wisp') {
    e.wobble += dt * e.wobbleSpeed * 2;
    const px = -dy / dist;
    const py = dx / dist;
    vx += px * Math.sin(e.wobble) * 46;
    vy += py * Math.sin(e.wobble) * 46;
  } else {
    e.wobble += dt * e.wobbleSpeed;
    vx += Math.cos(e.wobble) * 8;
    vy += Math.sin(e.wobble) * 8;
  }
  e.x += vx * dt;
  e.y += vy * dt;
  e.x = clamp(e.x, 10, VIEW.width - 10);
  e.y = clamp(e.y, 10, VIEW.height - 10);
  // Reaching the lighthouse: latch on and chew the stone in place.
  const dLight = Math.hypot(e.x - LIGHTHOUSE.x, e.y - LIGHTHOUSE.y);
  if (e.target === 'light' && dLight < LIGHTHOUSE.radius + e.radius - 2) {
    e.latched = true;
  }
  if (e.latched) {
    // Pinned against the stone: shudder, but go no further in.
    const a = Math.atan2(e.y - LIGHTHOUSE.y, e.x - LIGHTHOUSE.x);
    const hold = LIGHTHOUSE.radius + e.radius - 2;
    e.x = LIGHTHOUSE.x + Math.cos(a) * hold + Math.sin(world.time * 9 + e.wobble) * 2;
    e.y = LIGHTHOUSE.y + Math.sin(a) * hold + Math.cos(world.time * 9 + e.wobble) * 2;
  }
  if (e.kind === 'spitter') {
    e.spitTimer -= dt;
    const dPlayer = Math.hypot(world.player.x - e.x, world.player.y - e.y);
    if (e.spitTimer <= 0 && dPlayer < 520) {
      e.spitTimer = range(world.rng, 2.2, 3.2);
      const a = angleTo(e.x, e.y, world.player.x, world.player.y);
      world.enemyBullets.push({
        x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150,
        radius: 6, life: 4, damage: 1,
      });
    }
  }
}

export function bossStep(b, dt, world) {
  b.flash = Math.max(0, b.flash - dt);
  const p = world.player;
  const dPlayer = Math.hypot(p.x - b.x, p.y - b.y);
  // Keep a little distance, drift around the keeper.
  const want = 260;
  const a = angleTo(b.x, b.y, p.x, p.y);
  const radial = dPlayer > want + 40 ? 1 : dPlayer < want - 60 ? -1 : 0;
  b.x += (Math.cos(a) * radial * b.speed + Math.cos(a + Math.PI / 2) * b.speed * 0.45) * dt;
  b.y += (Math.sin(a) * radial * b.speed + Math.sin(a + Math.PI / 2) * b.speed * 0.45) * dt;
  b.x = clamp(b.x, 60, VIEW.width - 60);
  b.y = clamp(b.y, 60, VIEW.height - 60);
  // Radial burst of gloom orbs.
  b.burstTimer -= dt;
  if (b.burstTimer <= 0) {
    b.burstTimer = b.kind === 'hollow' ? 2.6 : 3.4;
    const n = b.kind === 'hollow' ? 10 : 8;
    const off = world.rng() * Math.PI * 2;
    for (let i = 0; i < n; i += 1) {
      const ang = off + (i / n) * Math.PI * 2;
      world.enemyBullets.push({
        x: b.x, y: b.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120,
        radius: 7, life: 6, damage: 1,
      });
    }
    world.audio.boss();
    world.fx.shake(4, 0.25);
  }
  // The Hollow Star also summons shades.
  if (b.kind === 'hollow') {
    b.summonTimer -= dt;
    if (b.summonTimer <= 0) {
      b.summonTimer = 8;
      for (let i = 0; i < 3; i += 1) {
        const ang = world.rng() * Math.PI * 2;
        world.enemies.push(spawnEnemy(world.rng, pick(world.rng, ['shade', 'wisp']), b.x + Math.cos(ang) * 70, b.y + Math.sin(ang) * 70, world.wave));
      }
      world.fx.burst(b.x, b.y, '#e05252', 18, 160, 3, true);
    }
  }
}

export function fireBullets(world) {
  const p = world.player;
  const n = p.projectiles;
  const base = p.angle;
  const spread = 0.13;
  for (let i = 0; i < n; i += 1) {
    const offset = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
    const a = base + offset;
    const crit = world.rng() < p.critChance;
    world.bullets.push({
      x: p.x + Math.cos(a) * (p.radius + 6),
      y: p.y + Math.sin(a) * (p.radius + 6),
      vx: Math.cos(a) * 640,
      vy: Math.sin(a) * 640,
      radius: 5,
      damage: p.damage * (crit ? 2 : 1),
      crit,
      pierce: p.pierce,
      counted: false,
      life: 1.4,
    });
  }
  world.audio.shoot();
}
