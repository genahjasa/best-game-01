// Keyboard and mouse input, kept apart from the game rules. The world reads this
// once per step; the renderer reads the mouse position for the aim reticle.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    mouseX: 640,
    mouseY: 300,
    mouseDown: false,
    mouseMoved: false,
    // Edge-triggered presses, consumed by the world each step.
    pressed: new Set(),
    axisX() {
      return (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    },
    axisY() {
      return (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    },
    consume(code) {
      if (this.pressed.has(code)) {
        this.pressed.delete(code);
        return true;
      }
      return false;
    },
  };

  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat) input.pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', (event) => {
    const p = toCanvas(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseMoved = true;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = toCanvas(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseDown = true;
    if (event.button === 2) input.pressed.add('Beam');
  });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  return input;
}
