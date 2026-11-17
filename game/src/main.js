// Bootstrap: canvas setup, the fixed-step loop, screen transitions from input,
// and the ?shot= scenes used for the entry's screenshots.
import { VIEW } from './config.js';
import { createInput } from './input.js';
import { createWorld, STEP } from './world.js';
import { drawWorld } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const world = createWorld();
// Debug/testing handle: lets a playtest read the live state. Harmless in play.
window.__world = world;
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (shotName) {
    drawWorld(ctx, world);
    return; // shot scenes are staged once, not simulated live
  }
  acc += dt;
  while (acc >= STEP) {
    acc -= STEP;
    handleMenus();
    world.step(STEP, input, null);
  }
  drawWorld(ctx, world);
  requestAnimationFrame(frame);
}

function handleMenus() {
  if (world.screen === 'title') {
    if (input.consume('Enter') || input.mouseDown) {
      input.mouseDown = false;
      world.startGame();
    }
    return;
  }
  if (world.screen === 'paused') {
    if (input.consume('KeyP') || input.consume('Escape') || input.consume('Enter')) world.screen = 'playing';
    return;
  }
  if (world.screen === 'upgrade') {
    if (input.consume('Digit1')) world.chooseBlessing(0);
    else if (input.consume('Digit2')) world.chooseBlessing(1);
    else if (input.consume('Digit3')) world.chooseBlessing(2);
    else if (input.mouseDown) {
      input.mouseDown = false;
      const i = upgradeCardAt(input.mouseX, input.mouseY);
      if (i >= 0) world.chooseBlessing(i);
    }
    return;
  }
  if (world.screen === 'over' || world.screen === 'win') {
    if (input.consume('KeyR') || input.consume('Enter') || input.mouseDown) {
      input.mouseDown = false;
      world.startGame();
    }
  }
}

function upgradeCardAt(x, y) {
  const w = 300;
  const h = 210;
  const gap = 36;
  const total = w * 3 + gap * 2;
  const x0 = (VIEW.width - total) / 2;
  const y0 = 240;
  if (y < y0 || y > y0 + h) return -1;
  for (let i = 0; i < 3; i += 1) {
    const cx = x0 + i * (w + gap);
    if (x >= cx && x <= cx + w) return i;
  }
  return -1;
}

if (shotName) {
  // Stage the scene synchronously, draw it once, then tell the screenshot
  // runner the frame is ready. No animation loop, no wall clock.
  const staged = stageShot(shotName, world);
  world.screen = staged === 'playing' ? 'playing' : staged;
  drawWorld(ctx, world);
  window.__shotReady = true;
} else {
  window.__shotReady = true;
  requestAnimationFrame(frame);
}
