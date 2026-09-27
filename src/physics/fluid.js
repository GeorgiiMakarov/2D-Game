/**
 * Навье–Стокс для несжимаемой жидкости на регулярной сетке — «Stable Fluids»
 * (полу-лагранжев перенос + решение уравнения Пуассона для давления методом Гаусса–Зейделя),
 * плюс vorticity confinement, плавучесть и препятствия-воксели из геометрии уровня.
 *
 *   ∂u/∂t = -(u·∇)u - ∇p/ρ + ν∇²u + f,   ∇·u = 0
 *   ∂d/∂t = -(u·∇)d + κ∇²d - αd        (перенос дыма/пара)
 *
 * Сетка живёт в экранных координатах; при движении камеры поля сдвигаются
 * на целое число ячеек, чтобы дым «оставался» в мире.
 */
import { W, H, clamp } from '../core/constants.js';

export class FluidSim {
  constructor(cell = 10) {
    this.configure(cell);
    this.visc = 0.00002;      // кинематическая вязкость
    this.diff = 0.00004;      // диффузия плотности
    this.dissipation = 0.28;  // затухание дыма, 1/с
    this.buoyancy = 46;       // подъёмная сила тёплого пара
    this.vortEps = 3.2;       // сила vorticity confinement
    this.iters = 6;
  }

  configure(cell) {
    this.cell = cell;
    this.nx = Math.ceil(W / cell) + 2;
    this.ny = Math.ceil(H / cell) + 2;
    const n = this.nx * this.ny;
    const f = () => new Float32Array(n);
    this.u = f(); this.v = f(); this.u0 = f(); this.v0 = f();
    this.dr = f(); this.dg = f(); this.db = f(); this.da = f();
    this.tr = f(); this.tg = f(); this.tb = f(); this.ta = f();
    this.p = f(); this.div = f(); this.curl = f();
    this.solid = new Uint8Array(n);
    this.img = null;
    this.buf = document.createElement('canvas');
    this.buf.width = this.nx;
    this.buf.height = this.ny;
    this.bctx = this.buf.getContext('2d', { willReadFrequently: true });
    this.img = this.bctx.createImageData(this.nx, this.ny);
    this.shiftAcc = 0;
  }

  idx(i, j) { return i + j * this.nx; }

  /** Экранные пиксели → индекс ячейки. */
  cellAt(x, y) {
    const i = clamp(Math.floor(x / this.cell) + 1, 0, this.nx - 1);
    const j = clamp(Math.floor(y / this.cell) + 1, 0, this.ny - 1);
    return i + j * this.nx;
  }

  clear() {
    for (const a of [this.u, this.v, this.dr, this.dg, this.db, this.da]) a.fill(0);
  }

  /** Импульс силы в точке (экранные координаты). */
  addVelocity(x, y, ax, ay, radius = 1) {
    const { cell, nx, ny } = this;
    const ci = Math.floor(x / cell) + 1;
    const cj = Math.floor(y / cell) + 1;
    const r = Math.max(1, Math.round(radius));
    for (let j = cj - r; j <= cj + r; j++) {
      if (j < 1 || j >= ny - 1) continue;
      for (let i = ci - r; i <= ci + r; i++) {
        if (i < 1 || i >= nx - 1) continue;
        const d2 = (i - ci) ** 2 + (j - cj) ** 2;
        if (d2 > r * r) continue;
        const w = 1 - Math.sqrt(d2) / (r + 0.001);
        const k = i + j * nx;
        this.u[k] += ax * w;
        this.v[k] += ay * w;
      }
    }
  }

  /** Вброс окрашенной плотности (дым, пар, пыль, искры). */
  addDensity(x, y, r, g, b, amount, radius = 1) {
    const { cell, nx, ny } = this;
    const ci = Math.floor(x / cell) + 1;
    const cj = Math.floor(y / cell) + 1;
    const rr = Math.max(1, Math.round(radius));
    for (let j = cj - rr; j <= cj + rr; j++) {
      if (j < 1 || j >= ny - 1) continue;
      for (let i = ci - rr; i <= ci + rr; i++) {
        if (i < 1 || i >= nx - 1) continue;
        const d2 = (i - ci) ** 2 + (j - cj) ** 2;
        if (d2 > rr * rr) continue;
        const w = (1 - Math.sqrt(d2) / (rr + 0.001)) * amount;
        const k = i + j * nx;
        if (this.solid[k]) continue;
        this.dr[k] += r * w;
        this.dg[k] += g * w;
        this.db[k] += b * w;
        this.da[k] += w;
      }
    }
  }

  /** Отметить непроходимые ячейки: cb(xPixel, yPixel) => true, если твёрдое тело. */
  markSolids(cb) {
    const { nx, ny, cell, solid } = this;
    for (let j = 1; j < ny - 1; j++) {
      const y = (j - 0.5) * cell;
      for (let i = 1; i < nx - 1; i++) {
        const k = i + j * nx;
        solid[k] = cb((i - 0.5) * cell, y) ? 1 : 0;
      }
    }
  }

  /** Сдвиг полей вслед за камерой (в пикселях). */
  shiftByCamera(dxPixels) {
    this.shiftAcc += dxPixels / this.cell;
    const shift = Math.trunc(this.shiftAcc);
    if (!shift) return;
    this.shiftAcc -= shift;
    const { nx, ny } = this;
    const arrs = [this.u, this.v, this.dr, this.dg, this.db, this.da];
    for (const a of arrs) {
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

  setBnd(b, x) {
    const { nx, ny } = this;
    for (let i = 1; i < nx - 1; i++) {
      x[i] = b === 2 ? -x[i + nx] : x[i + nx];
      x[i + (ny - 1) * nx] = b === 2 ? -x[i + (ny - 2) * nx] : x[i + (ny - 2) * nx];
    }
    for (let j = 1; j < ny - 1; j++) {
      x[j * nx] = b === 1 ? -x[1 + j * nx] : x[1 + j * nx];
      x[nx - 1 + j * nx] = b === 1 ? -x[nx - 2 + j * nx] : x[nx - 2 + j * nx];
    }
    x[0] = 0.5 * (x[1] + x[nx]);
    x[(ny - 1) * nx] = 0.5 * (x[1 + (ny - 1) * nx] + x[(ny - 2) * nx]);
    x[nx - 1] = 0.5 * (x[nx - 2] + x[nx - 1 + nx]);
    x[nx - 1 + (ny - 1) * nx] = 0.5 * (x[nx - 2 + (ny - 1) * nx] + x[nx - 1 + (ny - 2) * nx]);
  }

  linSolve(b, x, x0, a, c, iters) {
    const { nx, ny, solid } = this;
    const invC = 1 / c;
    for (let it = 0; it < iters; it++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const k = i + j * nx;
          if (solid[k]) { x[k] = 0; continue; }
          x[k] = (x0[k] + a * (x[k - 1] + x[k + 1] + x[k - nx] + x[k + nx])) * invC;
        }
      }
      this.setBnd(b, x);
    }
  }

  advect(b, d, d0, velU, velV, dt) {
    const { nx, ny, solid } = this;
    const dt0x = dt / this.cell;
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const k = i + j * nx;
        if (solid[k]) { d[k] = 0; continue; }
        let x = i - dt0x * velU[k];
        let y = j - dt0x * velV[k];
        x = clamp(x, 0.5, nx - 1.5);
        y = clamp(y, 0.5, ny - 1.5);
        const i0 = Math.floor(x), j0 = Math.floor(y);
        const s1 = x - i0, s0 = 1 - s1, t1 = y - j0, t0 = 1 - t1;
        const k00 = i0 + j0 * nx;
        d[k] = s0 * (t0 * d0[k00] + t1 * d0[k00 + nx]) + s1 * (t0 * d0[k00 + 1] + t1 * d0[k00 + nx + 1]);
      }
    }
    this.setBnd(b, d);
  }

  project() {
    const { nx, ny, u, v, p, div, solid, cell } = this;
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const k = i + j * nx;
        div[k] = solid[k] ? 0 : -0.5 * cell * (u[k + 1] - u[k - 1] + v[k + nx] - v[k - nx]) / cell;
        p[k] = 0;
      }
    }
    this.setBnd(0, div);
    this.setBnd(0, p);
    this.linSolve(0, p, div, 1, 4, this.iters);
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const k = i + j * nx;
        if (solid[k]) { u[k] = 0; v[k] = 0; continue; }
        u[k] -= 0.5 * (p[k + 1] - p[k - 1]);
        v[k] -= 0.5 * (p[k + nx] - p[k - nx]);
      }
    }
    this.setBnd(1, u);
    this.setBnd(2, v);
  }

  /** Vorticity confinement — возвращает мелкие вихри, съеденные численной диффузией. */
  vorticityConfinement(dt) {
    const { nx, ny, u, v, curl, solid } = this;
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const k = i + j * nx;
        curl[k] = 0.5 * ((v[k + 1] - v[k - 1]) - (u[k + nx] - u[k - nx]));
      }
    }
    const eps = this.vortEps;
    for (let j = 2; j < ny - 2; j++) {
      for (let i = 2; i < nx - 2; i++) {
        const k = i + j * nx;
        if (solid[k]) continue;
        const gx = 0.5 * (Math.abs(curl[k + 1]) - Math.abs(curl[k - 1]));
        const gy = 0.5 * (Math.abs(curl[k + nx]) - Math.abs(curl[k - nx]));
        const len = Math.hypot(gx, gy) + 1e-5;
        u[k] += eps * dt * (gy / len) * curl[k] * 60;
        v[k] += eps * dt * (-gx / len) * curl[k] * 60;
      }
    }
  }

  step(dt) {
    dt = Math.min(dt, 1 / 50);
    const { nx, ny, u, v, u0, v0, solid } = this;

    // плавучесть: тёплый пар всплывает пропорционально плотности
    for (let k = 0; k < u.length; k++) {
      if (!solid[k]) v[k] -= this.buoyancy * this.da[k] * dt;
    }
    if (this.vortEps > 0) this.vorticityConfinement(dt);

    // вязкая диффузия скорости
    const a = dt * this.visc * (nx - 2) * (ny - 2);
    u0.set(u); v0.set(v);
    this.linSolve(1, u, u0, a, 1 + 4 * a, 2);
    this.linSolve(2, v, v0, a, 1 + 4 * a, 2);
    this.project();

    // самоперенос скорости
    u0.set(u); v0.set(v);
    this.advect(1, u, u0, u0, v0, dt);
    this.advect(2, v, v0, u0, v0, dt);
    this.project();

    // перенос плотности (4 канала: цвет + непрозрачность)
    this.tr.set(this.dr); this.tg.set(this.dg); this.tb.set(this.db); this.ta.set(this.da);
    this.advect(0, this.dr, this.tr, u, v, dt);
    this.advect(0, this.dg, this.tg, u, v, dt);
    this.advect(0, this.db, this.tb, u, v, dt);
    this.advect(0, this.da, this.ta, u, v, dt);

    const decay = Math.exp(-this.dissipation * dt);
    const damp = Math.exp(-0.35 * dt);
    for (let k = 0; k < this.da.length; k++) {
      this.dr[k] *= decay; this.dg[k] *= decay; this.db[k] *= decay; this.da[k] *= decay;
      u[k] *= damp; v[k] *= damp;
    }
  }

  /** Скорость среды в точке — используется частицами слизи и пылью. */
  sample(x, y) {
    const k = this.cellAt(x, y);
    return [this.u[k], this.v[k]];
  }

  densityAt(x, y) {
    return this.da[this.cellAt(x, y)];
  }

  render(ctx, bloom = true) {
    const { nx, ny, img } = this;
    const px = img.data;
    let maxA = 0;
    for (let k = 0; k < this.da.length; k++) {
      const a = this.da[k];
      if (a > maxA) maxA = a;
      const o = k * 4;
      if (a < 0.004) { px[o + 3] = 0; continue; }
      const inv = 1 / Math.max(a, 1e-4);
      px[o] = clamp(this.dr[k] * inv * 255, 0, 255);
      px[o + 1] = clamp(this.dg[k] * inv * 255, 0, 255);
      px[o + 2] = clamp(this.db[k] * inv * 255, 0, 255);
      px[o + 3] = clamp(a * 1.7 * 255, 0, 240);
    }
    if (maxA < 0.004) return;
    this.bctx.putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    const ox = -this.cell * 1.5;
    const oy = -this.cell * 1.5;
    ctx.drawImage(this.buf, ox, oy, nx * this.cell, ny * this.cell);
    if (bloom) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.34;
      ctx.drawImage(this.buf, ox - 4, oy - 4, nx * this.cell + 8, ny * this.cell + 8);
    }
    ctx.restore();
  }
}
