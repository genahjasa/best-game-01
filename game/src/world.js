// The world: every rule of LUMENKEEPER in one place. Screens: title, playing,
// upgrade (the blessing draft), paused, over, win. The update loop is a fixed
// step so the simulation is stable and the screenshot scenes are repeatable.
import { BEAM, COMBO, EMBER, LIGHTHOUSE, PLAYER, SCORE, VIEW, WAVES } from './config.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import { bossStep, createPlayer, enemyStep, fireBullets } from './entities.js';
import { makeRng, clamp, range } from './random.js';
import { createDirector } from './waves.js';
import { draftBlessings } from './upgrades.js';

export const STEP = 1 / 60;

export function createWorld() {
  const world = {
    rng: makeRng(20261116),
    audio: createAudio(),
    fx: null,
    screen: 'title',
    waveState: 'idle', // idle | fighting | intermission
    wave: 0,
    score: 0,
    best: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    embers: 0,
    beamDamage: BEAM.damage,
    beamRadius: BEAM.radius,
    beamCooldown: 0,
    beamFlash: 0,
    lighthouseHp: LIGHTHOUSE.maxHp,
    lighthouseFlash: 0,
    player: createPlayer(VIEW.width / 2, VIEW.height / 2 + 150),
    enemies: [],
    bullets: [],
    enemyBullets: [],
    emberList: [],
    draft: [],
    draftTimer: 0,
    bannerText: '',
    bannerColor: '#ffe9a8',
    bannerTimer: 0,
    time: 0,
    titleTime: 0,
    stats: { shots: 0, volleyHits: 0, beams: 0, blessings: 0 },
    director: null,
    overReason: '',
    winStats: null,
  };
  world.fx = createParticles(world.rng);
  world.director = createDirector(world);
  try {
    world.best = Number(window.localStorage.getItem('lumenkeeper-best') || 0) || 0;
  } catch (err) { world.best = 0; }

  world.banner = function banner(text, color) {
    this.bannerText = text;
    this.bannerColor = color || '#ffe9a8';
    this.bannerTimer = 2.4;
  };

  world.saveBest = function saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try { window.localStorage.setItem('lumenkeeper-best', String(this.best)); } catch (err) { /* storage is a bonus */ }
    }
  };

  world.reset = function reset(seed) {
    this.rng = makeRng(seed === undefined ? (Date.now() % 2147483647) : seed);
    this.fx = createParticles(this.rng);
    this.director = createDirector(this);
    this.screen = 'title';
    this.waveState = 'idle';
    this.wave = 0;
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.embers = 0;
    this.beamDamage = BEAM.damage;
    this.beamRadius = BEAM.radius;
    this.beamCooldown = 0;
    this.beamFlash = 0;
    this.lighthouseHp = LIGHTHOUSE.maxHp;
    this.lighthouseFlash = 0;
    this.player = createPlayer(VIEW.width / 2, VIEW.height / 2 + 150);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.emberList = [];
    this.draft = [];
    this.bannerTimer = 0;
    this.time = 0;
    this.titleTime = 0;
    this.stats = { shots: 0, volleyHits: 0, beams: 0, blessings: 0 };
    this.overReason = '';
    this.winStats = null;
  };

  world.startGame = function startGame(seed) {
    this.reset(seed);
    this.screen = 'playing';
    this.nextWave();
    this.audio.ensure();
    this.audio.horn();
  };

  world.nextWave = function nextWave() {
    this.wave += 1;
    this.waveState = 'fighting';
    this.director.startWave(this.wave);
    this.banner(`WAVE ${this.wave}  —  ${this.wave === 10 ? 'THE LAST NIGHT' : this.wave === 5 ? 'SOMETHING STIRS' : 'THE SHADES COME'}`, '#ffe9a8');
    this.audio.horn();
  };

  world.waveCleared = function waveCleared() {
    const bonus = 100 * this.wave;
    this.score += bonus;
    this.fx.text(LIGHTHOUSE.x, LIGHTHOUSE.y - 70, `WAVE CLEAR  +${bonus}`, '#ffe9a8', 22);
    if (this.wave >= WAVES.total) {
      this.winGame();
      return;
    }
    this.waveState = 'intermission';
    this.draft = draftBlessings(this.rng);
    this.draftTimer = WAVES.intermissionSeconds;
    this.screen = 'upgrade';
    this.audio.bless();
  };

  world.chooseBlessing = function chooseBlessing(index) {
    const b = this.draft[index];
    if (!b) return;
    b.apply(this.player, this);
    this.stats.blessings += 1;
    this.fx.burst(this.player.x, this.player.y, '#ffe9a8', 26, 220, 3, true);
    this.fx.text(this.player.x, this.player.y - 30, b.name.toUpperCase(), '#ffe9a8', 18);
    this.audio.bless();
    this.draft = [];
    this.screen = 'playing';
    this.nextWave();
  };

  world.fireBeam = function fireBeam() {
    if (this.embers < BEAM.embersNeeded || this.beamCooldown > 0 || this.screen !== 'playing') return false;
    this.embers = 0;
    this.beamCooldown = BEAM.cooldownSeconds;
    this.beamFlash = 0.5;
    this.stats.beams += 1;
    const p = this.player;
    this.fx.ring(p.x, p.y, '#ffd76a', 26, 420);
    this.fx.shake(7, 0.35);
    this.audio.beam();
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < this.beamRadius + e.radius) {
        this.damageEnemy(e, this.beamDamage, true);
      }
    }
    return true;
  };

  world.damageEnemy = function damageEnemy(e, dmg, silent) {
    e.hp -= dmg;
    e.flash = 0.12;
    if (!silent) this.audio.hit();
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      this.killEnemy(e);
    }
  };

  world.killEnemy = function killEnemy(e) {
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = COMBO.windowSeconds;
    this.multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(this.combo / COMBO.perTier));
    const gained = e.score * this.multiplier;
    this.score += gained;
    this.fx.text(e.x, e.y - e.radius - 6, `+${gained}`, '#ffe9a8', this.multiplier > 1 ? 18 : 14);
    this.fx.burst(e.x, e.y, e.color, e.isBoss ? 60 : 14, e.isBoss ? 320 : 180, 3, true);
    this.audio.kill();
    if (e.isBoss) {
      this.score += SCORE.bossBonus;
      this.fx.text(e.x, e.y - 60, `BOSS FELLED  +${SCORE.bossBonus}`, '#ff9d9d', 22);
      this.fx.shake(10, 0.5);
      this.fx.ring(e.x, e.y, e.color, 40, 520);
    }
    if (this.rng() < EMBER.dropChance) {
      this.emberList.push({
        x: e.x, y: e.y, vx: range(this.rng, -30, 30), vy: range(this.rng, -30, 30),
        life: EMBER.lifetimeSeconds, value: EMBER.value, bob: this.rng() * Math.PI * 2,
      });
    }
  };

  world.hurtPlayer = function hurtPlayer() {
    const p = this.player;
    if (p.iframe > 0 || this.screen !== 'playing') return;
    p.hearts -= 1;
    p.iframe = PLAYER.iframeSeconds;
    this.combo = 0;
    this.multiplier = 1;
    this.fx.burst(p.x, p.y, '#ff6a6a', 22, 240, 3, true);
    this.fx.shake(8, 0.35);
    this.audio.hurt();
    if (p.hearts <= 0) this.endGame('The shades took the keeper.');
  };

  world.damageLighthouse = function damageLighthouse(amount) {
    this.lighthouseHp -= amount;
    this.lighthouseFlash = 0.25;
    if (this.lighthouseHp <= 0) {
      this.lighthouseHp = 0;
      this.endGame('The lighthouse went dark.');
    }
  };

  world.endGame = function endGame(reason) {
    this.screen = 'over';
    this.overReason = reason;
    this.saveBest();
    this.audio.over();
    this.fx.shake(9, 0.6);
  };

  world.winGame = function winGame() {
    this.screen = 'win';
    this.saveBest();
    this.winStats = {
      score: this.score, kills: this.kills,
      accuracy: this.stats.shots ? Math.round((this.stats.volleyHits / this.stats.shots) * 100) : 0,
      beams: this.stats.beams, blessings: this.stats.blessings,
    };
    this.audio.win();
    this.fx.ring(LIGHTHOUSE.x, LIGHTHOUSE.y, '#ffd76a', 48, 560);
  };

  // One fixed step. `input` may be null in screenshot mode (autopilot drives).
  world.step = function step(dt, input, autopilot) {
    this.time += dt;
    this.fx.update(dt);
    this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    this.beamFlash = Math.max(0, this.beamFlash - dt);
    this.beamCooldown = Math.max(0, this.beamCooldown - dt);
    this.lighthouseFlash = Math.max(0, this.lighthouseFlash - dt);
    this.audio.musicTick(dt);

    if (this.screen === 'title') {
      this.titleTime += dt;
      // The title swims: shades drift behind the menu so it is alive.
      if (this.enemies.length < 9 && Math.random() < dt * 2) {
        const a = this.rng() * Math.PI * 2;
        this.enemies.push({
          kind: 'shade', x: VIEW.width / 2 + Math.cos(a) * range(this.rng, 260, 520),
          y: VIEW.height / 2 + Math.sin(a) * range(this.rng, 200, 320),
          radius: 14, hp: 99, maxHp: 99, speed: range(this.rng, 14, 30),
          score: 0, color: '#8b7ff0', eye: '#e8e4ff', target: 'light',
          wobble: 0, wobbleSpeed: 1, spitTimer: 9, latched: false, flash: 0, dead: false,
        });
      }
      for (const e of this.enemies) {
        const a = Math.atan2(LIGHTHOUSE.y - e.y, LIGHTHOUSE.x - e.x);
        e.x += Math.cos(a) * e.speed * dt;
        e.y += Math.sin(a) * e.speed * dt;
        const d = Math.hypot(e.x - LIGHTHOUSE.x, e.y - LIGHTHOUSE.y);
        if (d < LIGHTHOUSE.radius + 60) {
          const ang = this.rng() * Math.PI * 2;
          e.x = VIEW.width / 2 + Math.cos(ang) * 520;
          e.y = VIEW.height / 2 + Math.sin(ang) * 300;
        }
      }
      return;
    }

    if (this.screen === 'upgrade') {
      this.draftTimer -= dt;
      if (this.draftTimer <= 0) this.chooseBlessing(Math.floor(this.rng() * this.draft.length));
      return;
    }

    if (this.screen !== 'playing') return;

    const p = this.player;
    // --- input: move, aim, fire, beam, pause ---
    let mx = 0;
    let my = 0;
    if (autopilot) {
      const ap = autopilot(this);
      mx = ap.mx; my = ap.my;
      p.angle = ap.angle;
      if (ap.fire) this.tryFire();
      if (ap.beam) this.fireBeam();
    } else if (input) {
      mx = input.axisX();
      my = input.axisY();
      if (input.mouseMoved) {
        p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);
      } else {
        const near = this.nearestEnemy();
        if (near) p.angle = Math.atan2(near.y - p.y, near.x - p.x);
      }
      if (input.mouseDown || input.keys.has('Space')) this.tryFire();
      if (input.consume('KeyF') || input.consume('Beam')) this.fireBeam();
      if (input.consume('KeyP') || input.consume('Escape')) { this.screen = 'paused'; return; }
      if (input.consume('KeyM')) this.audio.toggleMute();
    }
    const len = Math.hypot(mx, my) || 1;
    const speed = 270 * p.moveSpeed;
    p.x = clamp(p.x + (mx / len) * speed * dt * (mx || my ? 1 : 0), 20, VIEW.width - 20);
    p.y = clamp(p.y + (my / len) * speed * dt * (mx || my ? 1 : 0), 20, VIEW.height - 20);
    p.fireTimer = Math.max(0, p.fireTimer - dt);
    p.iframe = Math.max(0, p.iframe - dt);
    p.trail.unshift({ x: p.x, y: p.y });
    if (p.trail.length > 14) p.trail.pop();

    // --- combo decay ---
    this.comboTimer -= dt;
    if (this.comboTimer <= 0 && this.combo > 0) {
      this.combo = 0;
      this.multiplier = 1;
    }

    // --- director, enemies, bullets ---
    this.director.update(dt);
    for (const e of this.enemies) {
      if (e.isBoss) bossStep(e, dt, this);
      else enemyStep(e, dt, this);
      if (e.latched) this.damageLighthouse(LIGHTHOUSE.chewRate * dt);
    }
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    for (const b of this.enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }

    // --- bullet vs enemy ---
    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d < e.radius + b.radius) {
          // Accuracy counts volleys that hit something, not stray bolts.
          if (!b.counted) { b.counted = true; this.stats.volleyHits += 1; }
          this.damageEnemy(e, b.damage);
          this.fx.burst(b.x, b.y, '#ffe9a8', 3, 120, 2, true);
          if (b.pierce > 0) { b.pierce -= 1; } else { b.life = 0; }
          break;
        }
      }
    }
    // --- enemy vs player, enemy bullets vs player / lighthouse ---
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < e.radius + p.radius - 2) {
        this.hurtPlayer();
        this.damageEnemy(e, 1, true);
      }
    }
    for (const b of this.enemyBullets) {
      if (b.life <= 0) continue;
      const dP = Math.hypot(b.x - p.x, b.y - p.y);
      if (dP < p.radius + b.radius) {
        b.life = 0;
        this.hurtPlayer();
        continue;
      }
      const dL = Math.hypot(b.x - LIGHTHOUSE.x, b.y - LIGHTHOUSE.y);
      if (dL < LIGHTHOUSE.radius + b.radius) {
        b.life = 0;
        this.damageLighthouse(2);
        this.fx.burst(b.x, b.y, '#ff9d9d', 5, 120, 2, true);
      }
    }
    // --- embers: drift, expire, vacuum ---
    for (const em of this.emberList) {
      em.life -= dt;
      em.bob += dt * 4;
      const d = Math.hypot(p.x - em.x, p.y - em.y);
      const pull = 26 * p.magnet;
      if (d < 130 * p.magnet) {
        const a = Math.atan2(p.y - em.y, p.x - em.x);
        const pullSpeed = 340 * (1 - d / (130 * p.magnet)) + 60;
        em.x += Math.cos(a) * pullSpeed * dt;
        em.y += Math.sin(a) * pullSpeed * dt;
      } else {
        em.x += em.vx * dt;
        em.y += em.vy * dt;
      }
      if (d < pull) {
        em.life = 0;
        this.embers += em.value * p.emberWorth;
        this.audio.ember();
        this.fx.burst(em.x, em.y, '#ffd76a', 4, 100, 2, true);
      }
    }

    // --- sweep the dead ---
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.bullets = this.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < VIEW.width + 20 && b.y > -20 && b.y < VIEW.height + 20);
    this.enemyBullets = this.enemyBullets.filter((b) => b.life > 0 && b.x > -20 && b.x < VIEW.width + 20 && b.y > -20 && b.y < VIEW.height + 20);
    this.emberList = this.emberList.filter((em) => em.life > 0);
  };

  world.tryFire = function tryFire() {
    const p = this.player;
    if (p.fireTimer > 0) return;
    p.fireTimer = (PLAYER.fireInterval) / p.fireRate;
    this.stats.shots += 1; // one volley, however many bolts it holds
    fireBullets(this);
  };

  world.nearestEnemy = function nearestEnemy() {
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  };

  return world;
}
