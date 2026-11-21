// Midnight Archive — keyboard and mouse input.
// One job: turn keys and clicks into one plain state object the game reads.

export function makeInput() {
  return {
    up: false, down: false, left: false, right: false,
    sneak: false, sprint: false,
    clicked: false, clickX: 0, clickY: 0,
    anyKey: false,
  };
}

export function bindInput(input, canvas, onFirstGesture) {
  const keys = {};
  let gestureDone = false;
  function gesture() {
    if (!gestureDone) { gestureDone = true; onFirstGesture(); }
  }

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    input.anyKey = true;
    gesture();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    sync();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    sync();
  });
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.clicked = true;
    input.clickX = e.clientX - rect.left;
    input.clickY = e.clientY - rect.top;
    gesture();
  });
  canvas.addEventListener('mouseup', () => { input.clicked = false; });

  function sync() {
    input.up = !!(keys.KeyW || keys.ArrowUp);
    input.down = !!(keys.KeyS || keys.ArrowDown);
    input.left = !!(keys.KeyA || keys.ArrowLeft);
    input.right = !!(keys.KeyD || keys.ArrowRight);
    input.sneak = !!keys.ShiftLeft || !!keys.ShiftRight || !!keys.KeyC;
    input.sprint = !!keys.Space;
  }
  return keys;
}
