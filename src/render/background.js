// Многослойный параллакс: нейросетевой фон + процедурные силуэты + слой тумана.
import { W, H } from '../core/constants.js';
import { assets } from './assets.js';

export function drawBackground(ctx, level, levelIndex, camera, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, level.sky[0]);
  sky.addColorStop(1, level.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const img = assets.backgrounds[levelIndex];
  if (img && img.width) {
    const scale = H / img.height;
    const iw = img.width * scale;
    const off = -((camera * 0.22) % iw);
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.imageSmoothingEnabled = false;
    for (let x = off - iw; x < W + iw; x += iw) ctx.drawImage(img, x, 0, iw, H);
    ctx.restore();
  }

  // дальние силуэты
  ctx.fillStyle = levelIndex === 0 ? '#1d4a63' : levelIndex === 1 ? '#0e2436' : '#22102f';
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(-40, H);
  for (let i = 0; i <= 12; i++) {
    const x = -40 + i * 92;
    const y = 300 + Math.sin(i * 1.7 + camera * 0.0006) * 52 + (i % 3) * 18;
    ctx.lineTo(x - (camera * 0.1) % 92, y);
  }
  ctx.lineTo(W + 60, H);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // ближние силуэты
  ctx.fillStyle = levelIndex === 0 ? '#123243' : levelIndex === 1 ? '#081827' : '#170a20';
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(-40, H);
  for (let i = 0; i <= 10; i++) {
    const x = -40 + i * 118 - (camera * 0.2) % 118;
    const y = 372 + Math.cos(i * 2.1) * 40;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 60, H);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}
