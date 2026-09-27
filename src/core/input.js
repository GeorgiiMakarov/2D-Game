// Клавиатура + тач. keys.* — состояние удержания, *Pressed — одиночное нажатие.
export const keys = {
  left: false,
  right: false,
  down: false,
  jump: false,
  attack: false,
  goo: false,
};

const listeners = { pause: [], diag: [], settings: [] };
export const on = (evt, fn) => listeners[evt].push(fn);
const emit = (evt) => listeners[evt].forEach((f) => f());

function mapKey(e, down) {
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') keys.left = down;
  if (k === 'arrowright' || k === 'd') keys.right = down;
  if (k === 'arrowdown') keys.down = down;
  if (k === 'arrowup' || k === 'w' || k === ' ') {
    if (down && !e.repeat) keys.jump = true;
    if (!down) keys.jump = false;
  }
  if ((k === 'x' || k === 'k' || k === 'j') && down && !e.repeat) keys.attack = true;
  if (k === 's' && down && !e.repeat) keys.goo = true;
  if ((k === 'escape' || k === 'p') && down) emit('pause');
  if (k === 'f3' && down) emit('diag');
  if (k === 'f2' && down) emit('settings');
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'f3'].includes(k)) e.preventDefault();
}

export function initInput() {
  addEventListener('keydown', (e) => mapKey(e, true));
  addEventListener('keyup', (e) => mapKey(e, false));

  document.querySelectorAll('[data-key]').forEach((btn) => {
    const k = btn.dataset.key;
    const down = (e) => {
      e.preventDefault();
      btn.classList.add('active');
      keys[k] = true;
    };
    const up = (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      if (k === 'left' || k === 'right') keys[k] = false;
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
  });
}
