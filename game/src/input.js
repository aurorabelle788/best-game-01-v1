// Mouse and keyboard input, translated into game coordinates. The canvas
// scales to the window; this module maps client pixels back to the
// 1280x720 logical view so clicks land where the player aimed.

export function createInput(canvas) {
  const input = {
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    clicked: null, // {x, y} set once per click, consumed by the game
    keys: new Set(),
    pressed: new Set(), // keys pressed since last consume
  };

  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    const sx = 1280 / r.width;
    const sy = 720 / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }

  canvas.addEventListener('mousemove', (e) => {
    const p = toGame(e);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toGame(e);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseDown = true;
    input.clicked = p;
  });
  canvas.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    input.keys.add(e.key.toLowerCase());
    input.pressed.add(e.key.toLowerCase());
    if ([' ', 'arrowup', 'arrowdown'].includes(e.key.toLowerCase())) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.key.toLowerCase());
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });

  input.consumeClick = function () {
    const c = input.clicked;
    input.clicked = null;
    return c;
  };

  input.consumeKey = function (key) {
    const k = key.toLowerCase();
    if (input.pressed.has(k)) {
      input.pressed.delete(k);
      return true;
    }
    return false;
  };

  input.clearPressed = function () {
    input.pressed.clear();
  };

  return input;
}
