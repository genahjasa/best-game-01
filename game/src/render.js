// Every pixel LUMENKEEPER draws: the night sea, the lighthouse, the shades, the
// keeper, the HUD and every screen. Canvas 2D only, no image assets — the art
// is gradients, glow and shape, drawn fresh every frame.
import { BEAM, LIGHTHOUSE, VIEW } from './config.js';
import { clamp } from './random.js';

const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function glowCircle(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawWorld(ctx, world) {
  ctx.save();
  if (world.fx.shakeX || world.fx.shakeY) ctx.translate(world.fx.shakeX, world.fx.shakeY);
  drawSea(ctx, world);
  drawLighthouse(ctx, world);
  drawEmbers(ctx, world);
  drawEnemies(ctx, world);
  drawBullets(ctx, world);
  drawPlayer(ctx, world);
  world.fx.draw(ctx);
  ctx.restore();
  if (world.screen === 'playing' || world.screen === 'paused' || world.screen === 'upgrade') drawHud(ctx, world);
  if (world.bannerTimer > 0) drawBanner(ctx, world);
  if (world.screen === 'title') drawTitle(ctx, world);
  if (world.screen === 'upgrade') drawUpgrade(ctx, world);
  if (world.screen === 'paused') drawPaused(ctx, world);
  if (world.screen === 'over') drawOver(ctx, world);
  if (world.screen === 'win') drawWin(ctx, world);
}

function drawSea(ctx, world) {
  // Deep indigo water with slow drifting swell lines.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, '#0b1030');
  g.addColorStop(0.55, '#0d1440');
  g.addColorStop(1, '#080c26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.strokeStyle = 'rgba(96, 140, 255, 0.10)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i += 1) {
    const yBase = 90 + i * 110;
    ctx.beginPath();
    for (let x = 0; x <= VIEW.width; x += 32) {
      const y = yBase + Math.sin(x * 0.008 + world.time * 0.7 + i * 1.7) * 9;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Faint stars above the water.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 40; i += 1) {
    const x = (i * 331) % VIEW.width;
    const y = (i * 197) % 150;
    const tw = 0.25 + 0.25 * Math.sin(world.time * 1.5 + i);
    ctx.globalAlpha = Math.max(0.08, tw);
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawLighthouse(ctx, world) {
  const { x, y, radius } = LIGHTHOUSE;
  const hpFrac = world.lighthouseHp / LIGHTHOUSE.maxHp;
  // Warm halo that breathes.
  const breathe = 150 + Math.sin(world.time * 1.8) * 12;
  glowCircle(ctx, x, y, breathe, 'rgba(255, 205, 110, 0.30)', 0.55);
  // Rotating beam sweep.
  const sweep = world.time * 0.9;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sweep);
  const beam = ctx.createLinearGradient(0, 0, 420, 0);
  beam.addColorStop(0, 'rgba(255, 220, 130, 0.20)');
  beam.addColorStop(1, 'rgba(255, 220, 130, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(420, -26);
  ctx.lineTo(420, 26);
  ctx.closePath();
  ctx.fill();
  ctx.rotate(Math.PI);
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(420, -26);
  ctx.lineTo(420, 26);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Stone tower.
  ctx.fillStyle = '#2c2f4a';
  ctx.strokeStyle = '#4a4f78';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 26, y + 34);
  ctx.lineTo(x - 16, y - 30);
  ctx.lineTo(x + 16, y - 30);
  ctx.lineTo(x + 26, y + 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3a3f66';
  ctx.fillRect(x - 26, y + 8, 52, 8);
  // Lamp room.
  glowCircle(ctx, x, y - 38, 30, 'rgba(255, 214, 106, 0.85)', 0.9);
  ctx.fillStyle = '#ffd76a';
  circle(ctx, x, y - 38, 13);
  ctx.fillStyle = '#fff3c4';
  circle(ctx, x, y - 38, 7);
  // Roof.
  ctx.fillStyle = '#e05252';
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 48);
  ctx.lineTo(x, y - 64);
  ctx.lineTo(x + 18, y - 48);
  ctx.closePath();
  ctx.fill();
  // HP ring: the stone cracks as it falls.
  ctx.strokeStyle = hpFrac > 0.5 ? '#7ee2a0' : hpFrac > 0.25 ? '#ffd76a' : '#ff6a6a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpFrac);
  ctx.stroke();
  if (world.lighthouseFlash > 0) {
    ctx.globalAlpha = world.lighthouseFlash * 2;
    ctx.strokeStyle = '#ff6a6a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawEmbers(ctx, world) {
  for (const em of world.emberList) {
    const bob = Math.sin(em.bob) * 3;
    const fade = clamp(em.life / 2, 0.25, 1);
    ctx.globalAlpha = fade;
    glowCircle(ctx, em.x, em.y + bob, 16, 'rgba(255, 190, 80, 0.7)', 0.8);
    ctx.fillStyle = '#ffd76a';
    ctx.save();
    ctx.translate(em.x, em.y + bob);
    ctx.rotate(em.bob * 0.4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function drawEnemies(ctx, world) {
  for (const e of world.enemies) {
    const flash = e.flash > 0;
    // Shadow body.
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.globalAlpha = 0.92;
    if (e.kind === 'brute') {
      // Spiked brute: a square with horns.
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.sin(world.time * 2 + e.wobble) * 0.12);
      ctx.fillRect(-e.radius * 0.8, -e.radius * 0.8, e.radius * 1.6, e.radius * 1.6);
      ctx.restore();
    } else if (e.kind === 'wisp') {
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.radius * 1.25, e.radius * 0.8, Math.sin(e.wobble) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.isBoss) {
      // Boss: big ringed crown of dark petals.
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 + world.time * 0.4;
        ctx.beginPath();
        ctx.arc(e.x + Math.cos(a) * e.radius * 0.85, e.y + Math.sin(a) * e.radius * 0.85, e.radius * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      circle(ctx, e.x, e.y, e.radius * 0.8);
    } else {
      circle(ctx, e.x, e.y, e.radius);
    }
    ctx.globalAlpha = 1;
    // Glowing eyes, always watching.
    const look = Math.atan2((e.target === 'light' ? LIGHTHOUSE.y : world.player.y) - e.y, (e.target === 'light' ? LIGHTHOUSE.x : world.player.x) - e.x);
    const eyeOff = e.radius * 0.34;
    const eyeR = Math.max(2, e.radius * 0.16);
    ctx.fillStyle = e.eye;
    for (const s of [-1, 1]) {
      const ex = e.x + Math.cos(look) * eyeOff * 0.6 + Math.cos(look + Math.PI / 2) * eyeOff * s;
      const ey = e.y + Math.sin(look) * eyeOff * 0.6 + Math.sin(look + Math.PI / 2) * eyeOff * s;
      circle(ctx, ex, ey, eyeR);
    }
    // Boss health bar + name.
    if (e.isBoss) {
      ctx.textAlign = 'center';
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillStyle = '#ff9d9d';
      ctx.fillText(e.name, e.x, e.y - e.radius - 26);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - 52, e.y - e.radius - 20, 104, 8);
      ctx.fillStyle = '#e05252';
      ctx.fillRect(e.x - 52, e.y - e.radius - 20, 104 * clamp(e.hp / e.maxHp, 0, 1), 8);
    } else if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - 14, e.y - e.radius - 10, 28, 4);
      ctx.fillStyle = '#ff8d8d';
      ctx.fillRect(e.x - 14, e.y - e.radius - 10, 28 * clamp(e.hp / e.maxHp, 0, 1), 4);
    }
  }
}

function drawBullets(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of world.bullets) {
    glowCircle(ctx, b.x, b.y, 12, b.crit ? 'rgba(255, 170, 60, 0.9)' : 'rgba(255, 230, 150, 0.9)', 0.9);
    ctx.fillStyle = b.crit ? '#ffb13d' : '#fff3c4';
    circle(ctx, b.x, b.y, b.crit ? 6 : b.radius);
  }
  for (const b of world.enemyBullets) {
    glowCircle(ctx, b.x, b.y, 14, 'rgba(200, 80, 220, 0.8)', 0.8);
    ctx.fillStyle = '#c86ae0';
    circle(ctx, b.x, b.y, b.radius);
  }
  ctx.restore();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (world.screen !== 'playing' && world.screen !== 'paused' && world.screen !== 'upgrade') return;
  // Trail of fading light.
  for (let i = 0; i < p.trail.length; i += 1) {
    const t = p.trail[i];
    ctx.globalAlpha = (1 - i / p.trail.length) * 0.25;
    ctx.fillStyle = '#ffd76a';
    circle(ctx, t.x, t.y, p.radius * (1 - i / p.trail.length) * 0.8);
  }
  ctx.globalAlpha = 1;
  const blink = p.iframe > 0 && Math.floor(world.time * 14) % 2 === 0;
  if (!blink) {
    glowCircle(ctx, p.x, p.y, 44, 'rgba(255, 214, 106, 0.55)', 0.8);
    // The keeper: a little lantern-orb with a bright core.
    ctx.fillStyle = '#ffe9a8';
    circle(ctx, p.x, p.y, p.radius);
    ctx.fillStyle = '#fffbe8';
    circle(ctx, p.x, p.y, p.radius * 0.55);
    // Aim: a small flame pointing where the next bolt goes.
    const ax = p.x + Math.cos(p.angle) * (p.radius + 12);
    const ay = p.y + Math.sin(p.angle) * (p.radius + 12);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.moveTo(ax + Math.cos(p.angle) * 10, ay + Math.sin(p.angle) * 10);
    ctx.lineTo(ax + Math.cos(p.angle + 2.5) * 6, ay + Math.sin(p.angle + 2.5) * 6);
    ctx.lineTo(ax + Math.cos(p.angle - 2.5) * 6, ay + Math.sin(p.angle - 2.5) * 6);
    ctx.closePath();
    ctx.fill();
  }
  // Nova ready: a pulsing ring around the keeper.
  if (world.embers >= BEAM.embersNeeded) {
    ctx.strokeStyle = `rgba(255, 215, 106, ${0.5 + 0.4 * Math.sin(world.time * 6)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 12 + Math.sin(world.time * 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Beam flash.
  if (world.beamFlash > 0) {
    ctx.globalAlpha = world.beamFlash * 0.9;
    glowCircle(ctx, p.x, p.y, world.beamRadius, 'rgba(255, 220, 130, 0.5)', 0.7);
    ctx.globalAlpha = 1;
  }
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.textAlign = 'left';
  // Score, big and top-left.
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillStyle = '#fff3c4';
  ctx.fillText(`SCORE ${world.score.toLocaleString('en-US')}`, 24, 44);
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = 'rgba(255,243,196,0.7)';
  ctx.fillText(`BEST ${world.best.toLocaleString('en-US')}`, 24, 68);
  // Wave, top-centre.
  ctx.textAlign = 'center';
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(`WAVE ${Math.max(1, world.wave)} / 10`, VIEW.width / 2, 40);
  const left = world.waveState === 'fighting' ? world.director.remaining + world.enemies.length : 0;
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = 'rgba(255,233,168,0.75)';
  ctx.fillText(world.waveState === 'fighting' ? `${left} shades remain` : 'choose a blessing', VIEW.width / 2, 62);
  // Hearts, top-right.
  ctx.textAlign = 'right';
  ctx.font = `26px ${FONT}`;
  let hearts = '';
  for (let i = 0; i < p.maxHearts; i += 1) hearts += i < p.hearts ? '♥' : '♡';
  ctx.fillStyle = '#ff7d7d';
  ctx.fillText(hearts, VIEW.width - 24, 44);
  // Ember meter + beam hint.
  const frac = Math.min(1, world.embers / BEAM.embersNeeded);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(VIEW.width - 224, 58, 200, 12);
  ctx.fillStyle = frac >= 1 ? '#ffd76a' : '#c98f2e';
  ctx.fillRect(VIEW.width - 224, 58, 200 * frac, 12);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(frac >= 1 ? 'NOVA READY — press F' : `EMBERS ${world.embers}/${BEAM.embersNeeded}`, VIEW.width - 24, 92);
  // Combo.
  if (world.multiplier > 1) {
    ctx.textAlign = 'left';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillStyle = '#ffb13d';
    ctx.fillText(`COMBO x${world.multiplier}  (${world.combo})`, 24, 100);
  }
  // Lighthouse HP, bottom-left.
  ctx.textAlign = 'left';
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = 'rgba(255,243,196,0.85)';
  ctx.fillText('LIGHTHOUSE', 24, VIEW.height - 42);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(24, VIEW.height - 34, 180, 10);
  ctx.fillStyle = world.lighthouseHp > 50 ? '#7ee2a0' : world.lighthouseHp > 25 ? '#ffd76a' : '#ff6a6a';
  ctx.fillRect(24, VIEW.height - 34, 180 * clamp(world.lighthouseHp / 100, 0, 1), 10);
  // Controls hint, bottom-right.
  ctx.textAlign = 'right';
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = 'rgba(255,243,196,0.55)';
  ctx.fillText('WASD move · mouse aim · hold click to fire · F nova · P pause · M mute', VIEW.width - 24, VIEW.height - 24);
}

function drawBanner(ctx, world) {
  const a = clamp(world.bannerTimer / 0.6, 0, 1);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillStyle = world.bannerColor;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.fillText(world.bannerText, VIEW.width / 2, 150);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 12, 38, 0.82)';
  ctx.strokeStyle = 'rgba(255, 215, 106, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(5, 8, 26, 0.45)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a';
  ctx.font = `bold 76px ${FONT}`;
  ctx.shadowColor = 'rgba(255, 180, 60, 0.8)';
  ctx.shadowBlur = 30;
  ctx.fillText('LUMENKEEPER', VIEW.width / 2, 210);
  ctx.shadowBlur = 0;
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('The last lighthouse. Ten waves of night. One keeper of the light.', VIEW.width / 2, 252);
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = 'rgba(255,243,196,0.85)';
  ctx.fillText('Defend the lighthouse. Slay the shades. Gather embers. Choose your blessings.', VIEW.width / 2, 292);
  ctx.fillText('Survive all 10 waves — and what waits at the end of the tenth.', VIEW.width / 2, 318);
  // Start button.
  const pulse = 0.75 + 0.25 * Math.sin(world.titleTime * 3);
  ctx.globalAlpha = pulse;
  panel(ctx, VIEW.width / 2 - 190, 370, 380, 62);
  ctx.globalAlpha = 1;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillStyle = '#fff3c4';
  ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', VIEW.width / 2, 409);
  ctx.font = `15px ${FONT}`;
  ctx.fillStyle = 'rgba(255,243,196,0.7)';
  ctx.fillText('WASD / arrows to move · mouse to aim · hold click or Space to fire · F for nova', VIEW.width / 2, 470);
  ctx.fillText('Nova charges with embers dropped by fallen shades.', VIEW.width / 2, 494);
  if (world.best > 0) {
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(`BEST SCORE  ${world.best.toLocaleString('en-US')}`, VIEW.width / 2, 540);
  }
}

function drawUpgrade(ctx, world) {
  ctx.fillStyle = 'rgba(5, 8, 26, 0.85)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.font = `bold 34px ${FONT}`;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('THE DAWN OFFERS A BLESSING', VIEW.width / 2, 150);
  ctx.font = `17px ${FONT}`;
  ctx.fillStyle = 'rgba(255,243,196,0.85)';
  ctx.fillText(`Wave ${world.wave} cleared — choose one. Next wave in ${Math.ceil(world.draftTimer)}s (press 1, 2 or 3).`, VIEW.width / 2, 184);
  const w = 300;
  const h = 210;
  const gap = 36;
  const total = w * 3 + gap * 2;
  const x0 = (VIEW.width - total) / 2;
  const y0 = 240;
  world.draft.forEach((b, i) => {
    const x = x0 + i * (w + gap);
    panel(ctx, x, y0, w, h);
    ctx.fillStyle = '#ffd76a';
    ctx.font = `40px ${FONT}`;
    ctx.fillText(b.icon, x + w / 2, y0 + 62);
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillStyle = '#fff3c4';
    ctx.fillText(b.name, x + w / 2, y0 + 104);
    ctx.font = `15px ${FONT}`;
    ctx.fillStyle = 'rgba(255,243,196,0.85)';
    wrapText(ctx, b.desc, x + w / 2, y0 + 136, w - 36, 22);
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillStyle = 'rgba(255,215,106,0.8)';
    ctx.fillText(`[ ${i + 1} ]`, x + w / 2, y0 + h - 18);
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

function drawPaused(ctx, world) {
  ctx.fillStyle = 'rgba(5, 8, 26, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.font = `bold 48px ${FONT}`;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('PAUSED', VIEW.width / 2, 330);
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = 'rgba(255,243,196,0.85)';
  ctx.fillText('Press P or Esc to return to the light.', VIEW.width / 2, 372);
}

function endPanel(ctx, world, title, titleColor, lines, accent) {
  ctx.fillStyle = 'rgba(5, 8, 26, 0.85)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const h = 190 + lines.length * 36 + 70;
  panel(ctx, VIEW.width / 2 - 300, 140, 600, h);
  ctx.textAlign = 'center';
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillStyle = titleColor;
  ctx.fillText(title, VIEW.width / 2, 220);
  ctx.font = `17px ${FONT}`;
  ctx.fillStyle = 'rgba(255,243,196,0.9)';
  ctx.fillText(accent, VIEW.width / 2, 256);
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = '#fff3c4';
  let y = 310;
  for (const [label, value] of lines) {
    ctx.textAlign = 'left';
    ctx.fillText(label, VIEW.width / 2 - 220, y);
    ctx.textAlign = 'right';
    ctx.fillText(value, VIEW.width / 2 + 220, y);
    y += 36;
  }
  ctx.textAlign = 'center';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = '#ffd76a';
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', VIEW.width / 2, 140 + h - 24);
}

function drawOver(ctx, world) {
  const acc = world.stats.shots ? Math.round((world.stats.volleyHits / world.stats.shots) * 100) : 0;
  endPanel(ctx, world, 'THE LIGHT FADES', '#ff8d8d', [
    ['Score', world.score.toLocaleString('en-US')],
    ['Best', world.best.toLocaleString('en-US')],
    ['Wave reached', `${world.wave} / 10`],
    ['Shades slain', String(world.kills)],
    ['Accuracy', `${acc}%`],
  ], world.overReason);
}

function drawWin(ctx, world) {
  const s = world.winStats || { score: world.score, kills: world.kills, accuracy: 0, beams: 0, blessings: 0 };
  endPanel(ctx, world, 'DAWN BREAKS', '#ffd76a', [
    ['Final score', s.score.toLocaleString('en-US')],
    ['Best', world.best.toLocaleString('en-US')],
    ['Shades slain', String(s.kills)],
    ['Accuracy', `${s.accuracy}%`],
    ['Novas unleashed', String(s.beams)],
    ['Blessings taken', String(s.blessings)],
  ], 'All ten waves are done. The lighthouse stands — because you stood with it.');
}

export { drawHud, drawTitle, drawUpgrade, drawOver, drawWin };
