/**
 * Диффузионное освещение. Свет считается не лучами, а уравнением диффузии
 * (тот же оператор, что и в уравнении теплопроводности / в forward-процессе
 * диффузионных моделей):
 *
 *   ∂L/∂t = D∇²L − σ_a L + S(x,y)
 *
 * Источники S — факелы, кристаллы, портал, взрывы и фонарь героя.
 * Камень поглощает сильнее воздуха (σ_a больше), поэтому свет мягко
 * обтекает выступы и не проходит сквозь толстую породу.
 * Поле накапливается между кадрами и сдвигается вместе с камерой.
 */
import { W, H, clamp } from '../core/constants.js';

export class LightField {
  constructor(cell = 12) {
    this.configure(cell);
    this.ambient = [0.22, 0.26, 0.34];
    this.decay = 0.86;
  }

  configure(cell) {
    this.cell = cell;
    this.nx = Math.ceil(W / cell) + 2;
    this.ny = Math.ceil(H / cell) + 2;
    const n = this.nx * this.ny;
    this.r = new Float32Array(n);
    this.g = new Float32Array(n);
    this.b = new Float32Array(n);
    this.tr = new Float32Array(n).fill(1);
    this.tmp = new Float32Array(n);
    this.buf = document.createElement('canvas');
    this.buf.width = this.nx;
    this.buf.height = this.ny;
    this.bctx = this.buf.getContext('2d');
    this.img = this.bctx.createImageData(this.nx, this.ny);
    this.shiftAcc = 0;
  }

  setAmbient(rgb) { this.ambient = rgb; }

  markOccluders(cb) {
    const { nx, ny, cell, tr } = this;
    for (let j = 1; j < ny - 1; j++) {
      const y = (j - 0.5) * cell;
      for (let i = 1; i < nx - 1; i++) {
        tr[i + j * nx] = cb((i - 0.5) * cell, y) ? 0.32 : 1;
      }
    }
  }

  shiftByCamera(dx) {
    this.shiftAcc += dx / this.cell;
    const shift = Math.trunc(this.shiftAcc);
    if (!shift) return;
    this.shiftAcc -= shift;
    const { nx, ny } = this;
    for (const a of [this.r, this.g, this.b]) {
      if (shift > 0) {
        for (let j = 0; j < ny; j++) {
          const row = j * nx;
          a.copyWithin(row, row + shift, row + nx);
          a.fill(0, row + nx - shift, row + nx);
        }
      } else {
        const s = -shift;
        for (let j = 0; j < ny; j++) {
          const row = j * nx;
          a.copyWithin(row + s, row, row + nx - s);
          a.fill(0, row, row + s);
        }
      }
    }
  }

  addLight(x, y, r, g, b, radius = 1.5, power = 1) {
    const { cell, nx, ny } = this;
    const ci = Math.floor(x / cell) + 1;
    const cj = Math.floor(y / cell) + 1;
    const rr = Math.max(1, Math.round(radius));
    for (let j = cj - rr; j <= cj + rr; j++) {
      if (j < 1 || j >= ny - 1) continue;
      for (let i = ci - rr; i <= ci + rr; i++) {
        if (i < 1 || i >= nx - 1) continue;
        const d = Math.hypot(i - ci, j - cj);
        if (d > rr) continue;
        const w = (1 - d / (rr + 0.001)) * power;
        const k = i + j * nx;
        this.r[k] += r * w;
        this.g[k] += g * w;
        this.b[k] += b * w;
      }
    }
  }

  diffuseChannel(a, iters, d) {
    const { nx, ny, tr, tmp } = this;
    for (let it = 0; it < iters; it++) {
      tmp.set(a);
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const k = i + j * nx;
          const avg = (tmp[k - 1] + tmp[k + 1] + tmp[k - nx] + tmp[k + nx]) * 0.25;
          a[k] = (tmp[k] + (avg - tmp[k]) * d) * tr[k];
        }
      }
      // края — свободный выход энергии
      for (let i = 0; i < nx; i++) { a[i] = a[i + nx] * 0.7; a[i + (ny - 1) * nx] = a[i + (ny - 2) * nx] * 0.7; }
      for (let j = 0; j < ny; j++) { a[j * nx] = a[1 + j * nx] * 0.7; a[nx - 1 + j * nx] = a[nx - 2 + j * nx] * 0.7; }
    }
  }

  step(dt, iters = 2) {
    const d = clamp(dt * 44, 0.2, 0.9);
    this.diffuseChannel(this.r, iters, d);
    this.diffuseChannel(this.g, iters, d);
    this.diffuseChannel(this.b, iters, d);
    const k = Math.pow(this.decay, dt * 60);
    for (let i = 0; i < this.r.length; i++) {
      this.r[i] *= k; this.g[i] *= k; this.b[i] *= k;
    }
  }

  /** Освещённость в точке — используется для подсветки спрайтов. */
  sample(x, y) {
    const { cell, nx, ny } = this;
    const i = clamp(Math.floor(x / cell) + 1, 0, nx - 1);
    const j = clamp(Math.floor(y / cell) + 1, 0, ny - 1);
    const k = i + j * nx;
    return [this.r[k] + this.ambient[0], this.g[k] + this.ambient[1], this.b[k] + this.ambient[2]];
  }

  render(ctx) {
    const { nx, ny, img, ambient } = this;
    const px = img.data;
    for (let k = 0; k < this.r.length; k++) {
      const o = k * 4;
      px[o] = clamp((this.r[k] + ambient[0]) * 255, 0, 255);
      px[o + 1] = clamp((this.g[k] + ambient[1]) * 255, 0, 255);
      px[o + 2] = clamp((this.b[k] + ambient[2]) * 255, 0, 255);
      px[o + 3] = 255;
    }
    this.bctx.putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.buf, -this.cell * 1.5, -this.cell * 1.5, nx * this.cell, ny * this.cell);
    ctx.restore();
  }
}
