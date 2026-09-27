// Процедурный пиксель-арт: тайлы, иконки и кристаллы генерируются кодом
// (детерминированный хеш-шум), поэтому игра не тянет за собой тяжёлые атласы.
import { hash2 } from '../core/constants.js';

const cache = new Map();

function make(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  draw(x, w, h);
  return c;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

const PALETTES = {
  grass: { base: '#3f7d3a', top: '#5ec254', speck: '#2b5a2a', soil: '#6b4a2f' },
  stone: { base: '#5c6a72', top: '#74848c', speck: '#414d54', soil: '#48555c' },
  coal: { base: '#3a3f47', top: '#4a515a', speck: '#15181c', soil: '#2b3036' },
  obsidian: { base: '#2c1c3c', top: '#4a2c5e', speck: '#160d20', soil: '#241631' },
  dirt: { base: '#6b4a2f', top: '#7d5838', speck: '#4d3421', soil: '#5a3d26' },
};

/** Тайл 48×48 с процедурной крошкой и кромкой сверху. */
export function tile(kind, seed = 7) {
  const key = `tile:${kind}:${seed}`;
  if (cache.has(key)) return cache.get(key);
  const p = PALETTES[kind] || PALETTES.stone;
  const c = make(48, 48, (x) => {
    x.fillStyle = p.base;
    x.fillRect(0, 0, 48, 48);
    for (let j = 0; j < 12; j++) {
      for (let i = 0; i < 12; i++) {
        const n = hash2(i, j, seed);
        if (n > 0.82) x.fillStyle = shade(p.base, 16);
        else if (n < 0.2) x.fillStyle = p.speck;
        else continue;
        x.fillRect(i * 4, j * 4, 4, 4);
      }
    }
    if (kind === 'grass') {
      x.fillStyle = p.soil;
      x.fillRect(0, 12, 48, 36);
      for (let i = 0; i < 12; i++) {
        const n = hash2(i, 99, seed);
        x.fillStyle = p.soil;
        if (n > 0.6) x.fillRect(i * 4, 8, 4, 8);
      }
      x.fillStyle = p.base;
      x.fillRect(0, 0, 48, 12);
      x.fillStyle = p.top;
      x.fillRect(0, 0, 48, 5);
      for (let i = 0; i < 12; i++) if (hash2(i, 3, seed) > 0.55) x.fillRect(i * 4, 5, 4, 4);
    } else {
      x.fillStyle = shade(p.base, 22);
      x.fillRect(0, 0, 48, 4);
      x.fillStyle = shade(p.base, -26);
      x.fillRect(0, 44, 48, 4);
    }
    if (kind === 'coal') {
      x.fillStyle = '#0e1013';
      for (const [cx, cy] of [[10, 12], [30, 8], [20, 30], [36, 32]]) x.fillRect(cx, cy, 8, 8);
      x.fillStyle = '#2a2e35';
      for (const [cx, cy] of [[10, 12], [30, 8], [20, 30], [36, 32]]) x.fillRect(cx + 2, cy + 2, 3, 3);
    }
    if (kind === 'obsidian') {
      x.fillStyle = '#7b46a0';
      x.fillRect(6, 18, 3, 12);
      x.fillRect(28, 10, 3, 14);
      x.fillRect(38, 30, 3, 10);
    }
  });
  cache.set(key, c);
  return c;
}

/** Кристалл-осколок / кристалл силы. */
export function crystal(color, w = 28, h = 42) {
  const key = `crystal:${color}:${w}x${h}`;
  if (cache.has(key)) return cache.get(key);
  const c = make(w, h, (x) => {
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(w / 2, 0);
    x.lineTo(w, h * 0.34);
    x.lineTo(w * 0.72, h);
    x.lineTo(w * 0.28, h);
    x.lineTo(0, h * 0.34);
    x.closePath();
    x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)';
    x.beginPath();
    x.moveTo(w / 2, 2);
    x.lineTo(w * 0.72, h * 0.36);
    x.lineTo(w / 2, h * 0.92);
    x.closePath();
    x.fill();
    x.fillStyle = 'rgba(0,0,0,.28)';
    x.beginPath();
    x.moveTo(w / 2, 2);
    x.lineTo(w * 0.28, h * 0.36);
    x.lineTo(w * 0.42, h * 0.9);
    x.closePath();
    x.fill();
  });
  cache.set(key, c);
  return c;
}

export function torch() {
  const key = 'torch';
  if (cache.has(key)) return cache.get(key);
  const c = make(16, 40, (x) => {
    x.fillStyle = '#6b4a2f';
    x.fillRect(6, 12, 4, 28);
    x.fillStyle = '#8a6440';
    x.fillRect(6, 12, 2, 28);
    x.fillStyle = '#ffb347';
    x.fillRect(4, 4, 8, 10);
    x.fillStyle = '#ffe680';
    x.fillRect(6, 2, 4, 8);
  });
  cache.set(key, c);
  return c;
}

const ICONS = {
  heart: (x) => {
    x.fillStyle = '#e8515c';
    for (const [cx, cy, w, h] of [[2, 3, 4, 2], [8, 3, 4, 2], [1, 5, 12, 3], [2, 8, 10, 2], [4, 10, 6, 2], [6, 12, 2, 1]]) x.fillRect(cx, cy, w, h);
    x.fillStyle = '#ff9aa2';
    x.fillRect(3, 5, 3, 2);
  },
  pickaxe: (x) => {
    x.fillStyle = '#8a6440';
    x.fillRect(6, 4, 2, 10);
    x.fillStyle = '#b9c7cf';
    x.fillRect(2, 2, 10, 2);
    x.fillRect(1, 3, 3, 2);
    x.fillRect(10, 3, 3, 2);
    x.fillStyle = '#eef7fb';
    x.fillRect(3, 2, 4, 1);
  },
  jump: (x) => {
    x.fillStyle = '#65ead8';
    x.fillRect(6, 1, 2, 10);
    x.fillRect(4, 3, 6, 2);
    x.fillRect(2, 11, 10, 2);
    x.fillStyle = '#d7fff7';
    x.fillRect(6, 1, 1, 6);
  },
  power: (x) => {
    x.fillStyle = '#ffc85c';
    x.fillRect(7, 1, 3, 6);
    x.fillRect(4, 6, 6, 2);
    x.fillRect(5, 8, 3, 6);
    x.fillStyle = '#fff2c2';
    x.fillRect(7, 1, 1, 5);
  },
  shield: (x) => {
    x.fillStyle = '#d88cff';
    x.fillRect(2, 2, 10, 6);
    x.fillRect(3, 8, 8, 3);
    x.fillRect(5, 11, 4, 2);
    x.fillStyle = '#f4d9ff';
    x.fillRect(3, 3, 3, 4);
  },
  shard: (x) => {
    x.fillStyle = '#62ead8';
    x.fillRect(5, 1, 4, 12);
    x.fillRect(3, 4, 8, 6);
    x.fillStyle = '#d7fff7';
    x.fillRect(6, 2, 2, 8);
  },
};

export function icon(name, scale = 2) {
  const key = `icon:${name}:${scale}`;
  if (cache.has(key)) return cache.get(key);
  const c = make(14 * scale, 14 * scale, (x) => {
    x.scale(scale, scale);
    (ICONS[name] || ICONS.shard)(x);
  });
  cache.set(key, c);
  return c;
}

export const iconURL = (name, scale = 2) => icon(name, scale).toDataURL();
