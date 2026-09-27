// Пиксельные враги рисуются прямоугольниками — никаких внешних атласов.
// Каждая функция рисует существо в локальных координатах (0,0 — левый верх бокса).

const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

export function drawCreeper(ctx, w, h, t) {
  const sway = Math.sin(t * 4) * 1.5;
  R(ctx, 4, 8 + sway, w - 8, h - 12, '#4c9c4a');
  R(ctx, 6, 10 + sway, w - 14, h - 22, '#63bd58');
  R(ctx, 8, 14 + sway, 7, 7, '#101a12');
  R(ctx, w - 15, 14 + sway, 7, 7, '#101a12');
  R(ctx, 12, 24 + sway, w - 24, 12, '#101a12');
  R(ctx, 10, 28 + sway, 5, 8, '#101a12');
  R(ctx, w - 15, 28 + sway, 5, 8, '#101a12');
  R(ctx, 4, h - 6, 9, 6, '#3c7f3b');
  R(ctx, w - 13, h - 6, 9, 6, '#3c7f3b');
}

export function drawZombie(ctx, w, h, t) {
  const step = Math.sin(t * 6) * 2;
  R(ctx, 6, 0, w - 12, 16, '#4e8d5c');
  R(ctx, 9, 5, 4, 4, '#14202a');
  R(ctx, w - 13, 5, 4, 4, '#14202a');
  R(ctx, 4, 16, w - 8, 26, '#3f7bb4');
  R(ctx, 0, 18, 6, 18, '#4e8d5c');
  R(ctx, w - 6, 18, 6, 18, '#4e8d5c');
  R(ctx, 7, 42, 8, h - 42 + step, '#2f4f78');
  R(ctx, w - 15, 42, 8, h - 42 - step, '#2f4f78');
}

export function drawSkeleton(ctx, w, h, t) {
  const step = Math.sin(t * 5) * 2;
  R(ctx, 6, 0, w - 12, 15, '#d8dcd0');
  R(ctx, 9, 5, 4, 5, '#20252a');
  R(ctx, w - 13, 5, 4, 5, '#20252a');
  R(ctx, 12, 15, w - 24, 5, '#b9bdb2');
  R(ctx, 10, 20, w - 20, 20, '#d8dcd0');
  R(ctx, 13, 24, w - 26, 3, '#a7aba1');
  R(ctx, 13, 31, w - 26, 3, '#a7aba1');
  R(ctx, 2, 20, 6, 16, '#cdd1c6');
  R(ctx, w - 8, 20, 6, 16, '#cdd1c6');
  R(ctx, 12, 40, 6, h - 40 + step, '#cdd1c6');
  R(ctx, w - 18, 40, 6, h - 40 - step, '#cdd1c6');
}

export function drawEnderman(ctx, w, h, t) {
  const bob = Math.sin(t * 2.2) * 2;
  R(ctx, 8, 0 + bob, w - 16, 14, '#100f16');
  R(ctx, 10, 5 + bob, 7, 3, '#c98bff');
  R(ctx, w - 17, 5 + bob, 7, 3, '#c98bff');
  R(ctx, 12, 14 + bob, w - 24, 34, '#17141f');
  R(ctx, 5, 16 + bob, 6, 34, '#100f16');
  R(ctx, w - 11, 16 + bob, 6, 34, '#100f16');
  R(ctx, 14, 48 + bob, 6, h - 48, '#100f16');
  R(ctx, w - 20, 48 + bob, 6, h - 48, '#100f16');
}

export function drawPig(ctx, w, h) {
  R(ctx, 0, 10, w - 12, 22, '#e87676');
  R(ctx, 6, 3, 20, 14, '#f28b88');
  R(ctx, w - 14, 12, 14, 18, '#dc646a');
  R(ctx, 3, 32, 8, 8, '#a8444e');
  R(ctx, 22, 32, 8, 8, '#a8444e');
  R(ctx, 10, 8, 4, 4, '#3a2527');
  R(ctx, 19, 8, 4, 4, '#3a2527');
  R(ctx, 6, 14, 13, 8, '#f6a2a0');
  R(ctx, 9, 17, 3, 3, '#8f4147');
  R(ctx, 15, 17, 3, 3, '#8f4147');
}

export const CREATURES = {
  creeper: drawCreeper,
  zombie: drawZombie,
  skeleton: drawSkeleton,
  enderman: drawEnderman,
};
