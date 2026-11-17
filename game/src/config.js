// LUMENKEEPER — tuning constants. One place for every number the game balances on,
// so tuning never means hunting through the update loop.
export const VIEW = { width: 1280, height: 720 };

export const LIGHTHOUSE = {
  x: VIEW.width / 2,
  y: VIEW.height / 2,
  radius: 42,
  maxHp: 100,
  // Enemies latch on and chew the stone this fast (hp per second each).
  chewRate: 6,
};

export const PLAYER = {
  radius: 14,
  speed: 270,
  maxHearts: 3,
  fireInterval: 0.16,
  bulletSpeed: 640,
  bulletDamage: 1,
  bulletRadius: 5,
  // Seconds of invulnerability after a hit.
  iframeSeconds: 0.9,
  // How close an ember must be to be vacuumed in.
  emberRadius: 26,
};

export const BEAM = {
  embersNeeded: 12,
  radius: 270,
  damage: 6,
  cooldownSeconds: 1.2,
};

// Enemy kinds: hp, speed, radius, score, what share of a wave they may be.
export const ENEMIES = {
  shade: { hp: 2, speed: 58, radius: 14, score: 50, color: '#8b7ff0', eye: '#e8e4ff' },
  wisp: { hp: 1, speed: 118, radius: 10, score: 75, color: '#5fd4c8', eye: '#eafffb' },
  brute: { hp: 9, speed: 34, radius: 25, score: 150, color: '#e06a7a', eye: '#ffe3e8' },
  spitter: { hp: 3, speed: 46, radius: 13, score: 125, color: '#d8a04a', eye: '#fff3d6' },
};

export const BOSSES = {
  herald: { hp: 200, speed: 40, radius: 46, score: 1500, color: '#a06ae0', eye: '#f3e8ff', name: 'GLOOM HERALD' },
  hollow: { hp: 360, speed: 48, radius: 54, score: 4000, color: '#e05252', eye: '#ffe9e9', name: 'THE HOLLOW STAR' },
};

export const WAVES = {
  total: 10,
  // Seconds of calm before the first wave and between waves (the blessing draft).
  intermissionSeconds: 7,
  // Base spawn budget per wave, plus this many per wave number.
  baseBudget: 6,
  budgetPerWave: 4,
  // Spawn interval shrinks as waves climb.
  spawnInterval: (wave) => Math.max(0.35, 1.15 - wave * 0.07),
};

// Combo: kills inside this window keep the chain alive; every 8 chain adds +1x, capped.
export const COMBO = { windowSeconds: 3, perTier: 8, maxMultiplier: 5 };

// Ember drops: chance per kill, and how long an ember lives on the field.
export const EMBER = { dropChance: 0.38, lifetimeSeconds: 9, value: 1 };

export const SCORE = { bossBonus: 500 };
