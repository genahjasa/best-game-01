// The blessing draft: between waves the keeper chooses one of three blessings.
// Each one is a small, legible power-up with a name, a line of flavour and one
// clear mechanical effect on the player.
export const BLESSINGS = [
  {
    id: 'quiver', name: 'Swift Quiver', icon: '»»',
    desc: '+25% fire rate. Your light answers faster.',
    apply(p) { p.fireRate *= 1.25; },
  },
  {
    id: 'heavy', name: 'Heavy Light', icon: '✦',
    desc: '+1 bolt damage. Every hit lands harder.',
    apply(p) { p.damage += 1; },
  },
  {
    id: 'twin', name: 'Twin Lanterns', icon: '❖',
    desc: '+1 projectile per shot. Twice the dawn.',
    apply(p) { p.projectiles += 1; },
  },
  {
    id: 'pierce', name: 'Piercing Rays', icon: '→',
    desc: 'Bolts pierce +1 shade. Nothing hides.',
    apply(p) { p.pierce += 1; },
  },
  {
    id: 'boots', name: 'Windwalk Boots', icon: '≋',
    desc: '+15% move speed. The dark cannot catch you.',
    apply(p) { p.moveSpeed *= 1.15; },
  },
  {
    id: 'heart', name: 'Heartwood', icon: '♥',
    desc: '+1 max heart and mend 1 heart now.',
    apply(p) { p.maxHearts += 1; p.hearts = Math.min(p.maxHearts, p.hearts + 1); },
  },
  {
    id: 'magnet', name: 'Ember Magnet', icon: '◎',
    desc: 'Ember pull range doubled. The light comes to you.',
    apply(p) { p.magnet *= 2; },
  },
  {
    id: 'stone', name: 'Reinforced Stone', icon: '▣',
    desc: 'Repair the lighthouse +40. Stone remembers.',
    apply(p, world) { world.lighthouseHp = Math.min(100, world.lighthouseHp + 40); },
  },
  {
    id: 'nova', name: 'Nova Core', icon: '☀',
    desc: 'Nova beam +4 damage and +60 reach.',
    apply(p, world) { world.beamDamage += 4; world.beamRadius += 60; },
  },
  {
    id: 'deadeye', name: 'Deadeye', icon: '◉',
    desc: '+15% critical chance. Crits strike for double.',
    apply(p) { p.critChance += 0.15; },
  },
];

// Three distinct blessings, drawn from the seeded stream.
export function draftBlessings(rng) {
  const pool = BLESSINGS.slice();
  const draft = [];
  for (let i = 0; i < 3; i += 1) {
    const index = Math.floor(rng() * pool.length);
    draft.push(pool.splice(index, 1)[0]);
  }
  return draft;
}
