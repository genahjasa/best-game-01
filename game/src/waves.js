// The wave director: what spawns, when, and which boss closes waves 5 and 10.
// Waves are a budget of enemies spent over time; the mix shifts toward faster,
// tougher kinds as the night deepens.
import { ENEMIES, VIEW, WAVES } from './config.js';
import { pick, range } from './random.js';
import { spawnBoss, spawnEnemy } from './entities.js';

const MIX = [
  ['shade'],
  ['shade', 'shade', 'wisp'],
  ['shade', 'wisp', 'wisp', 'spitter'],
  ['shade', 'wisp', 'spitter', 'brute'],
  ['wisp', 'spitter', 'brute', 'shade'],
  ['spitter', 'brute', 'wisp', 'wisp'],
  ['brute', 'spitter', 'wisp', 'shade'],
  ['brute', 'brute', 'spitter', 'wisp'],
  ['brute', 'spitter', 'wisp', 'shade'],
  ['brute', 'spitter', 'wisp', 'wisp'],
];

export function createDirector(world) {
  return {
    world,
    remaining: 0,
    spawnTimer: 0,
    bossSpawned: false,
    startWave(wave) {
      this.remaining = WAVES.baseBudget + WAVES.budgetPerWave * wave;
      this.spawnTimer = 0.4;
      this.bossSpawned = false;
    },
    edgePoint(rng) {
      const side = Math.floor(rng() * 4);
      const m = 30;
      if (side === 0) return { x: range(rng, m, VIEW.width - m), y: -m };
      if (side === 1) return { x: range(rng, m, VIEW.width - m), y: VIEW.height + m };
      if (side === 2) return { x: -m, y: range(rng, m, VIEW.height - m) };
      return { x: VIEW.width + m, y: range(rng, m, VIEW.height - m) };
    },
    update(dt) {
      const world = this.world;
      if (world.screen !== 'playing') return;
      if (world.waveState !== 'fighting') return;
      // Boss waves: the boss arrives first, shades trickle in behind it.
      if ((world.wave === 5 || world.wave === 10) && !this.bossSpawned) {
        this.bossSpawned = true;
        const kind = world.wave === 5 ? 'herald' : 'hollow';
        world.enemies.push(spawnBoss(world.rng, kind, world.wave));
        world.banner(`${ENEMIES_BOSS_NAME(kind)} AWAKENS`, '#ff9d9d');
        world.audio.boss();
        world.fx.shake(6, 0.4);
      }
      this.spawnTimer -= dt;
      if (this.remaining > 0 && this.spawnTimer <= 0) {
        this.spawnTimer = WAVES.spawnInterval(world.wave);
        const wave = Math.min(world.wave, MIX.length);
        const kind = pick(world.rng, MIX[wave - 1]);
        const at = this.edgePoint(world.rng);
        world.enemies.push(spawnEnemy(world.rng, kind, at.x, at.y, world.wave));
        this.remaining -= 1;
      }
      // Wave cleared: no enemies left and budget spent.
      if (this.remaining <= 0 && world.enemies.length === 0 && world.enemyBullets.length === 0) {
        world.waveCleared();
      }
    },
  };
}

function ENEMIES_BOSS_NAME(kind) {
  return kind === 'herald' ? 'THE GLOOM HERALD' : 'THE HOLLOW STAR';
}
