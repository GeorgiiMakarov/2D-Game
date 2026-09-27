// Базовые константы мира. Разрешение рендера фиксировано (пиксель-арт),
// шелл масштабирует канвас средствами CSS.
export const W = 960;
export const H = 540;
export const TILE = 48;
export const WORLD = 3264;
export const GROUND = 444;

export const GRAVITY = 1120;
export const PLAYER_ACCEL_GROUND = 1250;
export const PLAYER_ACCEL_AIR = 750;
export const PLAYER_SPEED = 205;
export const PLAYER_SPEED_BOOST = 225;
export const JUMP_V = -435;
export const DOUBLE_JUMP_V = -405;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b = 0) => b + Math.random() * (a - b);

// Детерминированный шум значения — используется процедурным пиксель-артом.
export function hash2(x, y, seed = 1) {
  let h = x * 374761393 + y * 668265263 + seed * 2246822519;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
