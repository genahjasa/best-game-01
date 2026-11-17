// Particles, floating score text and screen shake. One fixed-size pool, no
// allocation during play, so the frame rate stays flat when the screen is full.
import { range } from './random.js';

const MAX_PARTICLES = 420;
const MAX_TEXTS = 24;

export function createParticles(rng) {
  const pool = [];
  for (let i = 0; i < MAX_PARTICLES; i += 1) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0.9, glow: false });
  }
  const texts = [];
  for (let i = 0; i < MAX_TEXTS; i += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 14 });
  }
  const fx = {
    shakeTime: 0,
    shakePower: 0,
    shakeX: 0,
    shakeY: 0,
    burst(x, y, color, count, speed, size, glow) {
      let made = 0;
      for (let i = 0; i < MAX_PARTICLES && made < count; i += 1) {
        const p = pool[i];
        if (p.active) continue;
        const a = rng() * Math.PI * 2;
        const v = range(rng, speed * 0.3, speed);
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(a) * v;
        p.vy = Math.sin(a) * v;
        p.life = p.maxLife = range(rng, 0.35, 0.8);
        p.size = range(rng, size * 0.6, size * 1.4);
        p.color = color;
        p.drag = 0.88;
        p.glow = !!glow;
        made += 1;
      }
    },
    ring(x, y, color, count, speed) {
      for (let i = 0; i < count; i += 1) {
        const a = (i / count) * Math.PI * 2;
        for (let j = 0; j < MAX_PARTICLES; j += 1) {
          const p = pool[j];
          if (p.active) continue;
          p.active = true;
          p.x = x;
          p.y = y;
          p.vx = Math.cos(a) * speed;
          p.vy = Math.sin(a) * speed;
          p.life = p.maxLife = 0.55;
          p.size = 3;
          p.color = color;
          p.drag = 0.94;
          p.glow = true;
          break;
        }
      }
    },
    text(x, y, str, color, size) {
      for (let i = 0; i < MAX_TEXTS; i += 1) {
        const t = texts[i];
        if (t.active) continue;
        t.active = true;
        t.x = x;
        t.y = y;
        t.life = t.maxLife = 0.9;
        t.text = str;
        t.color = color;
        t.size = size || 15;
        return;
      }
    },
    shake(power, seconds) {
      this.shakePower = Math.max(this.shakePower, power);
      this.shakeTime = Math.max(this.shakeTime, seconds);
    },
    update(dt) {
      for (let i = 0; i < MAX_PARTICLES; i += 1) {
        const p = pool[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) { p.active = false; continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
      }
      for (let i = 0; i < MAX_TEXTS; i += 1) {
        const t = texts[i];
        if (!t.active) continue;
        t.life -= dt;
        t.y -= 34 * dt;
        if (t.life <= 0) t.active = false;
      }
      if (this.shakeTime > 0) {
        this.shakeTime -= dt;
        this.shakeX = (Math.random() * 2 - 1) * this.shakePower;
        this.shakeY = (Math.random() * 2 - 1) * this.shakePower;
        if (this.shakeTime <= 0) { this.shakePower = 0; this.shakeX = 0; this.shakeY = 0; }
      }
    },
    draw(ctx) {
      for (let i = 0; i < MAX_PARTICLES; i += 1) {
        const p = pool[i];
        if (!p.active) continue;
        const a = p.life / p.maxLife;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.glow) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.6 + a), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      for (let i = 0; i < MAX_TEXTS; i += 1) {
        const t = texts[i];
        if (!t.active) continue;
        ctx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 1.6);
        ctx.font = `bold ${t.size}px "Trebuchet MS", sans-serif`;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
  };
  return fx;
}
