// Полностью процедурные пиксель-арт фоны: три биома с многослойным параллаксом.
// Никаких внешних изображений — только код, детерминированный хеш-шум и время.
// Уровень 0 «ЗЕЛЁНЫЙ РУБЕЖ» — тёплый день оригинала: квадратное солнце,
// блочные облака и деревья. Уровни 1–2 — пещеры и обсидиановый пик.
import { W, H, hash2 } from '../core/constants.js';
import { crystal } from './pixelart.js';

const B = 4; // базовый блок пиксель-арта

function R(ctx, x, y, w, h) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
}

/** Вызывает cb(ti, x0) для каждого тайла слоя, видимого на экране. */
function tiles(camera, f, TW, cb) {
  const start = Math.floor((camera * f) / TW) - 1;
  const n = Math.ceil(W / TW) + 3;
  for (let k = 0; k < n; k++) {
    const ti = start + k;
    cb(ti, ti * TW - camera * f);
  }
}

// ---------------------------------------------------------------- уровень 0

function sun(ctx, camera, time) {
  const sx = W * 0.74 - camera * 0.03;
  const sy = 96;
  const s = 56 * (1 + Math.sin(time * 1.4) * 0.03);
  // ступенчатое свечение: два квадрата с падающей прозрачностью, без жёсткой кромки
  ctx.fillStyle = 'rgba(255,236,150,0.08)';
  R(ctx, sx - s * 1.15, sy - s * 1.15, s * 2.3, s * 2.3);
  ctx.fillStyle = 'rgba(255,236,150,0.10)';
  R(ctx, sx - s * 0.85, sy - s * 0.85, s * 1.7, s * 1.7);
  ctx.fillStyle = '#ffe97a';
  R(ctx, sx - s / 2, sy - s / 2, s, s);
  ctx.fillStyle = '#fff6c4';
  R(ctx, sx - s / 4, sy - s / 4, s / 2, s / 2);
  const rl = s * (0.55 + 0.12 * Math.sin(time * 1.4));
  ctx.fillStyle = 'rgba(255,233,122,0.85)';
  R(ctx, sx - 6, sy - s / 2 - rl, 12, rl);
  R(ctx, sx - 6, sy + s / 2, 12, rl);
  R(ctx, sx - s / 2 - rl, sy - 6, rl, 12);
  R(ctx, sx + s / 2, sy - 6, rl, 12);
}

function clouds(ctx, camera, time) {
  tiles(camera, 0.12, 520, (ti, x0) => {
    const n1 = hash2(ti, 11, 1);
    if (n1 < 0.3) return;
    const cx = x0 + ((n1 * 400 + time * 6) % 520);
    const cy = 46 + hash2(ti, 12, 1) * 150;
    const cw = 90 + hash2(ti, 13, 1) * 100;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    R(ctx, cx, cy + 12, cw, 22);
    R(ctx, cx + 14, cy, cw - 40, 20);
    R(ctx, cx + 30, cy - 10, cw - 70, 14);
    ctx.fillStyle = 'rgba(186,218,244,0.9)';
    R(ctx, cx, cy + 26, cw, 8);
  });
}

function mountains(ctx, camera) {
  tiles(camera, 0.18, 640, (ti, x0) => {
    const n = hash2(ti, 21, 2);
    const mh = 130 + n * 110;
    const mw = 260 + hash2(ti, 22, 2) * 170;
    const bx = x0 + 40;
    const by = H - 56;
    const steps = 10;
    ctx.fillStyle = '#2e6b8f';
    for (let s = 0; s < steps; s++) {
      const w = mw * (1 - s / steps);
      R(ctx, bx + (mw - w) / 2, by - mh + (s * mh) / steps, w, mh / steps + 1);
    }
    ctx.fillStyle = '#3d86ad';
    for (let s = 0; s < 4; s++) {
      const w = mw * (1 - s / steps) * 0.5;
      R(ctx, bx + (mw - w) / 2 - mw * 0.12, by - mh + (s * mh) / steps, w, mh / steps + 1);
    }
    ctx.fillStyle = '#eaf5fc';
    const capW = mw * 0.3;
    R(ctx, bx + (mw - capW) / 2, by - mh, capW, mh * 0.17);
  });
}

function trees(ctx, camera, time) {
  tiles(camera, 0.35, 340, (ti, x0) => {
    const n = hash2(ti, 31, 3);
    if (n < 0.25) return;
    const tx = x0 + hash2(ti, 32, 3) * 220;
    const th = 90 + hash2(ti, 33, 3) * 70;
    const gy = H - 26;
    const sway = Math.sin(time * 0.9 + ti * 1.7) * 3;
    ctx.fillStyle = '#6b4a2f';
    R(ctx, tx, gy - th * 0.45, 14, th * 0.45);
    ctx.fillStyle = '#8a6440';
    R(ctx, tx, gy - th * 0.45, 4, th * 0.45);
    const greens = ['#2f7d3a', '#3a9145', '#2a6e33'];
    ctx.fillStyle = greens[Math.floor(hash2(ti, 34, 3) * 3) % 3];
    const cw = 64 + hash2(ti, 35, 3) * 30;
    const top = gy - th * 0.45;
    R(ctx, tx + 7 - cw / 2 + sway, top - 34, cw, 26);
    R(ctx, tx + 7 - cw * 0.38 + sway, top - 56, cw * 0.76, 24);
    R(ctx, tx + 7 - cw * 0.26 + sway, top - 74, cw * 0.52, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    R(ctx, tx + 7 - cw / 2 + sway, top - 34, cw, 6);
  });
}

function birds(ctx, time) {
  ctx.fillStyle = '#2b4a5e';
  for (let i = 0; i < 6; i++) {
    const speed = 14 + hash2(i, 41, 4) * 10;
    const bx = ((hash2(i, 42, 4) * (W + 200) + time * speed) % (W + 200)) - 100;
    const by = 70 + hash2(i, 43, 4) * 130 + Math.sin(time * 1.7 + i * 2) * 8;
    const flap = Math.sin(time * 9 + i * 1.3) > 0 ? 5 : 2;
    R(ctx, bx - 7, by, 7, 3);
    R(ctx, bx, by, 7, 3);
    R(ctx, bx - 7, by - flap, 4, flap);
    R(ctx, bx + 3, by - flap, 4, flap);
  }
}

// ---------------------------------------------------------------- уровень 1

function caveFar(ctx, camera) {
  tiles(camera, 0.15, 560, (ti, x0) => {
    const n = hash2(ti, 51, 5);
    const rw = 220 + n * 180;
    const rh = 190 + hash2(ti, 52, 5) * 130;
    ctx.fillStyle = '#0c1a29';
    R(ctx, x0 + 60, H - rh, rw, rh);
    // ступенчатый верх скалы
    for (let s = 0; s < 5; s++) {
      const w = rw * (0.5 + hash2(ti, 53 + s, 5) * 0.5);
      R(ctx, x0 + 60 + (rw - w) / 2, H - rh - (s + 1) * 14, w, 14);
    }
  });
}

function stalactites(ctx, camera) {
  tiles(camera, 0.3, 260, (ti, x0) => {
    const n = hash2(ti, 61, 6);
    const count = 1 + Math.floor(n * 2.4);
    for (let k = 0; k < count; k++) {
      const sx = x0 + 30 + hash2(ti, 62 + k, 6) * 200;
      const sw = 14 + hash2(ti, 63 + k, 6) * 16;
      const sh = 50 + hash2(ti, 64 + k, 6) * 90;
      const steps = 7;
      for (let s = 0; s < steps; s++) {
        const w = sw * (1 - (s / steps) * 0.85);
        ctx.fillStyle = s % 2 ? '#16283a' : '#1b3049';
        R(ctx, sx - w / 2, (s * sh) / steps, w, sh / steps + 1);
      }
      ctx.fillStyle = 'rgba(120,180,220,0.25)';
      R(ctx, sx - sw / 2, 0, 4, sh * 0.7);
    }
  });
}

function stalagmites(ctx, camera) {
  tiles(camera, 0.3, 300, (ti, x0) => {
    const n = hash2(ti, 71, 7);
    if (n < 0.35) return;
    const sx = x0 + 40 + hash2(ti, 72, 7) * 220;
    const sw = 18 + hash2(ti, 73, 7) * 22;
    const sh = 40 + hash2(ti, 74, 7) * 70;
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const w = sw * (0.3 + (s / steps) * 0.7);
      ctx.fillStyle = s % 2 ? '#142434' : '#18293d';
      R(ctx, sx - w / 2, H - ((s + 1) * sh) / steps, w, sh / steps + 1);
    }
  });
}

function caveCrystals(ctx, camera, time) {
  tiles(camera, 0.5, 420, (ti, x0) => {
    const n = hash2(ti, 81, 8);
    if (n < 0.45) return;
    const cx = x0 + 60 + hash2(ti, 82, 8) * 300;
    const cy = H - 60 - hash2(ti, 83, 8) * 160;
    const pulse = 0.55 + 0.4 * Math.sin(time * 2 + ti * 1.3);
    const colors = ['#57e6ff', '#b78cff', '#7dffd4'];
    const col = colors[Math.floor(n * 3) % 3];
    ctx.save();
    ctx.globalAlpha = pulse;
    const c = crystal(col, 26, 40);
    ctx.drawImage(c, cx, cy - 40, 26, 40);
    // ступенчатое свечение вместо сплошного квадрата
    ctx.fillStyle = col;
    ctx.globalAlpha = pulse * 0.10;
    R(ctx, cx - 16, cy - 56, 58, 72);
    ctx.globalAlpha = pulse * 0.16;
    R(ctx, cx - 8, cy - 48, 42, 56);
    ctx.restore();
  });
}

function lightShafts(ctx, time) {
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#bfe3ff';
  for (let i = 0; i < 3; i++) {
    const bx = W * (0.2 + i * 0.28) + Math.sin(time * 0.4 + i * 2) * 24;
    ctx.beginPath();
    ctx.moveTo(bx, -20);
    ctx.lineTo(bx + 70, -20);
    ctx.lineTo(bx + 190, H);
    ctx.lineTo(bx + 90, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function dustMotes(ctx, time) {
  ctx.fillStyle = 'rgba(180,220,255,0.5)';
  for (let i = 0; i < 22; i++) {
    const mx = hash2(i, 91, 9) * W + Math.sin(time * 0.5 + i * 1.9) * 26;
    const my = hash2(i, 92, 9) * H + Math.cos(time * 0.4 + i * 2.3) * 20;
    R(ctx, mx, my, 3, 3);
  }
}

// ---------------------------------------------------------------- уровень 2

function moon(ctx, camera) {
  const mx = W * 0.24 - camera * 0.03;
  const my = 118;
  const r = 44;
  // мягкое ступенчатое гало
  ctx.fillStyle = 'rgba(220,200,255,0.05)';
  R(ctx, mx - r * 1.9, my - r * 1.9, r * 3.8, r * 3.8);
  ctx.fillStyle = 'rgba(220,200,255,0.06)';
  R(ctx, mx - r * 1.45, my - r * 1.45, r * 2.9, r * 2.9);
  ctx.fillStyle = '#e8dff5';
  for (let yy = -r; yy <= r; yy += B) {
    const hw = Math.sqrt(Math.max(0, r * r - yy * yy));
    R(ctx, mx - hw, my + yy, hw * 2, B);
  }
  ctx.fillStyle = '#c9bce0';
  R(ctx, mx - 18, my - 8, 14, 10);
  R(ctx, mx + 8, my + 12, 10, 8);
  R(ctx, mx - 4, my - 24, 8, 6);
}

function farShards(ctx, camera) {
  tiles(camera, 0.12, 620, (ti, x0) => {
    const n = hash2(ti, 101, 10);
    if (n < 0.4) return;
    const sx = x0 + 80 + hash2(ti, 102, 10) * 460;
    const sh = 120 + n * 130;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(crystal('#3a2358', 60, 120), sx, H - sh, 60, sh);
    ctx.restore();
  });
}

function obsidianSpires(ctx, camera) {
  tiles(camera, 0.25, 560, (ti, x0) => {
    const n = hash2(ti, 111, 11);
    const sh = 170 + n * 150;
    const sw = 90 + hash2(ti, 112, 11) * 70;
    const bx = x0 + 80;
    const by = H;
    const steps = 12;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const w = sw * (1 - t) * (0.72 + 0.28 * hash2(ti, 120 + s, 11));
      ctx.fillStyle = s % 2 ? '#170d24' : '#1e1230';
      R(ctx, bx + (sw - w) / 2, by - sh + (s * sh) / steps, w, sh / steps + 1);
    }
    ctx.fillStyle = 'rgba(150,90,220,0.45)';
    for (let s = 2; s < steps; s += 2) {
      const t = s / steps;
      const w = sw * (1 - t) * 0.8;
      R(ctx, bx + (sw + w) / 2 - 6, by - sh + (s * sh) / steps, 5, sh / steps + 1);
    }
  });
}

function lavaCracks(ctx, camera, time) {
  tiles(camera, 0.5, 420, (ti, x0) => {
    const n = hash2(ti, 131, 13);
    if (n < 0.4) return;
    const pulse = 0.5 + 0.35 * Math.sin(time * 2.2 + ti * 1.7);
    ctx.fillStyle = `rgba(255,140,40,${pulse.toFixed(3)})`;
    const ly = H - 26 - hash2(ti, 132, 13) * 60;
    const lw = 120 + n * 160;
    const cx = x0 + 40;
    R(ctx, cx, ly, lw * 0.5, 6);
    R(ctx, cx + lw * 0.5, ly - 8, lw * 0.3, 6);
    R(ctx, cx + lw * 0.72, ly - 2, lw * 0.28, 6);
    ctx.fillStyle = `rgba(255,220,120,${(pulse * 0.8).toFixed(3)})`;
    R(ctx, cx + 8, ly + 1, lw * 0.4, 3);
  });
}

function embers(ctx, time) {
  for (let i = 0; i < 26; i++) {
    const speed = 24 + hash2(i, 141, 14) * 30;
    const ex = hash2(i, 142, 14) * W + Math.sin(time * 1.2 + i * 2.1) * 18;
    const ey = H + 20 - ((hash2(i, 143, 14) * (H + 60) + time * speed) % (H + 60));
    const fade = Math.max(0, 1 - ey / (H + 40));
    ctx.fillStyle = `rgba(255,${140 + Math.floor(60 * fade)},60,${(0.35 + 0.55 * fade).toFixed(3)})`;
    const s = hash2(i, 144, 14) > 0.7 ? 5 : 3;
    R(ctx, ex, ey, s, s);
  }
}

// ----------------------------------------------------------------------------

export function drawBackground(ctx, level, levelIndex, camera, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, level.sky[0]);
  sky.addColorStop(1, level.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;

  if (levelIndex === 0) {
    sun(ctx, camera, time);
    clouds(ctx, camera, time);
    birds(ctx, time);
    mountains(ctx, camera);
    trees(ctx, camera, time);
  } else if (levelIndex === 1) {
    lightShafts(ctx, time);
    caveFar(ctx, camera);
    stalactites(ctx, camera);
    stalagmites(ctx, camera);
    caveCrystals(ctx, camera, time);
    dustMotes(ctx, time);
  } else {
    moon(ctx, camera);
    farShards(ctx, camera);
    obsidianSpires(ctx, camera);
    lavaCracks(ctx, camera, time);
    embers(ctx, time);
  }
}
