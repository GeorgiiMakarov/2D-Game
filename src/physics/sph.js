/**
 * Слизь как SPH-подобная система частиц в мировых координатах.
 *
 * Для каждой пары соседей в радиусе h считаются три силы:
 *   1) давление  F_p = -k (h-d)²  n      — не даёт частицам схлопнуться;
 *   2) когезия   F_c = +k_c (h-d) n      — поверхностное натяжение, капли собираются в шарики;
 *   3) вязкость  F_v = -μ (v_ij·n) n     — гасит относительное движение.
 *
 * Отдельно моделируется АДГЕЗИЯ к твёрдым поверхностям: вблизи стены частица
 * притягивается к ней силой F_a = k_a (1 - d/r_a) и, если её скорость мала,
 * «прилипает» (переходит в состояние stuck). Прилипшая слизь образует лужи,
 * которые тормозят героя и врагов, а также медленно стекают по вертикальным стенам.
 */
import { clamp } from '../core/constants.js';

const H = 17;          // радиус сглаживания
const H2 = H * H;
const CELL = H;

export class GooSystem {
  constructor(max = 420) {
    this.max = max;
    this.parts = [];
    this.grid = new Map();
    this.k = 780;       // жёсткость давления
    this.cohesion = 240;
    this.viscosity = 2.6;
    this.adhesion = 620;
    this.adhRange = 9;
    this.gravity = 880;
    this.buf = document.createElement('canvas');
    this.bctx = this.buf.getContext('2d');
  }

  get count() { return this.parts.length; }

  clear() { this.parts.length = 0; }

  spawn(x, y, vx, vy, opts = {}) {
    if (this.parts.length >= this.max) this.parts.shift();
    this.parts.push({
      x, y, vx, vy,
      r: opts.r ?? 5 + Math.random() * 2.5,
      life: opts.life ?? 9 + Math.random() * 6,
      stuck: 0,
      hue: opts.hue ?? 0,        // 0 — бирюзовая слизь, 1 — вражеская фиолетовая
      hostile: !!opts.hostile,
    });
  }

  splat(x, y, n = 14, power = 120, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = power * (0.35 + Math.random() * 0.8);
      this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 40, opts);
    }
  }

  key(i, j) { return i * 73856093 ^ j * 19349663; }

  buildGrid() {
    this.grid.clear();
    const p = this.parts;
    for (let i = 0; i < p.length; i++) {
      const k = this.key(Math.floor(p[i].x / CELL), Math.floor(p[i].y / CELL));
      let arr = this.grid.get(k);
      if (!arr) this.grid.set(k, (arr = []));
      arr.push(i);
    }
  }

  /**
   * @param {number} dt
   * @param {object} world  { solids: [{x,y,w,h}], bounds: {x0,x1}, fluid, camera }
   */
  update(dt, world) {
    const p = this.parts;
    if (!p.length) return;
    dt = Math.min(dt, 1 / 50);
    this.buildGrid();

    const { solids, fluid, camera = 0, viewW = 960 } = world;
    const near = (q) => q.x > camera - 260 && q.x < camera + viewW + 260;

    // --- парные силы -------------------------------------------------------
    for (let a = 0; a < p.length; a++) {
      const A = p[a];
      if (!near(A)) continue;
      const ci = Math.floor(A.x / CELL);
      const cj = Math.floor(A.y / CELL);
      for (let oj = -1; oj <= 1; oj++) {
        for (let oi = -1; oi <= 1; oi++) {
          const bucket = this.grid.get(this.key(ci + oi, cj + oj));
          if (!bucket) continue;
          for (const b of bucket) {
            if (b <= a) continue;
            const B = p[b];
            let dx = B.x - A.x;
            let dy = B.y - A.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > H2 || d2 < 1e-6) continue;
            const d = Math.sqrt(d2);
            const nx = dx / d;
            const ny = dy / d;
            const q = 1 - d / H;

            const fp = this.k * q * q;            // расталкивание
            const fc = this.cohesion * q;          // поверхностное натяжение
            const f = (fc - fp) * dt;
            A.vx += f * nx; A.vy += f * ny;
            B.vx -= f * nx; B.vy -= f * ny;

            const rvx = B.vx - A.vx;
            const rvy = B.vy - A.vy;
            const vn = rvx * nx + rvy * ny;
            if (vn !== 0) {
              const imp = this.viscosity * q * vn * dt * 30;
              A.vx += imp * nx; A.vy += imp * ny;
              B.vx -= imp * nx; B.vy -= imp * ny;
            }
          }
        }
      }
    }

    // --- интегрирование, адгезия, столкновения ------------------------------
    for (let i = p.length - 1; i >= 0; i--) {
      const P = p[i];
      P.life -= dt;
      if (P.life <= 0) { p.splice(i, 1); continue; }
      if (!near(P)) continue;

      if (P.stuck > 0) {
        P.stuck -= dt;
        P.vx *= 0.02;
        P.vy = Math.min(P.vy + this.gravity * 0.06 * dt, 16); // медленное стекание
      } else {
        P.vy += this.gravity * dt;
      }

      // слизь увлекается потоком воздуха из симуляции Навье–Стокса
      if (fluid) {
        const [fu, fv] = fluid.sample(P.x - camera, P.y);
        P.vx += fu * 6 * dt;
        P.vy += fv * 6 * dt;
      }

      P.x += P.vx * dt;
      P.y += P.vy * dt;

      let touching = false;
      for (const s of solids) {
        if (P.x < s.x - this.adhRange - P.r || P.x > s.x + s.w + this.adhRange + P.r) continue;
        if (P.y < s.y - this.adhRange - P.r || P.y > s.y + s.h + this.adhRange + P.r) continue;

        // ближайшая точка прямоугольника
        const cx = clamp(P.x, s.x, s.x + s.w);
        const cy = clamp(P.y, s.y, s.y + s.h);
        let dx = P.x - cx;
        let dy = P.y - cy;
        let d = Math.hypot(dx, dy);

        if (d < 1e-4) {                 // внутри тела — выталкиваем наружу
          const left = P.x - s.x, right = s.x + s.w - P.x;
          const top = P.y - s.y, bot = s.y + s.h - P.y;
          const m = Math.min(left, right, top, bot);
          if (m === left) { P.x = s.x - 0.1; P.vx = Math.min(P.vx, 0); }
          else if (m === right) { P.x = s.x + s.w + 0.1; P.vx = Math.max(P.vx, 0); }
          else if (m === top) { P.y = s.y - 0.1; P.vy = Math.min(P.vy, 0); }
          else { P.y = s.y + s.h + 0.1; P.vy = Math.max(P.vy, 0); }
          dx = P.x - clamp(P.x, s.x, s.x + s.w);
          dy = P.y - clamp(P.y, s.y, s.y + s.h);
          d = Math.hypot(dx, dy) || 1;
        }

        const nx = dx / (d || 1);
        const ny = dy / (d || 1);

        if (d < P.r) {                  // контакт: гасим нормальную скорость, добавляем трение
          P.x = cx + nx * P.r;
          P.y = cy + ny * P.r;
          const vn = P.vx * nx + P.vy * ny;
          if (vn < 0) { P.vx -= vn * nx * 1.25; P.vy -= vn * ny * 1.25; }
          P.vx *= 0.72;
          touching = true;
          if (Math.hypot(P.vx, P.vy) < 42) P.stuck = 1.2;  // прилипла
        } else if (d < P.r + this.adhRange) {
          const w = 1 - (d - P.r) / this.adhRange;          // сила адгезии
          P.vx -= nx * this.adhesion * w * dt;
          P.vy -= ny * this.adhesion * w * dt;
          touching = true;
        }
      }
      if (!touching && P.stuck > 0) P.stuck = 0;
    }
  }

  /** Насколько «липко» в данной точке (0..1) — для торможения героя и врагов. */
  stickiness(x, y, radius = 26) {
    let s = 0;
    const r2 = radius * radius;
    const ci = Math.floor(x / CELL);
    const cj = Math.floor(y / CELL);
    const span = Math.ceil(radius / CELL);
    for (let oj = -span; oj <= span; oj++) {
      for (let oi = -span; oi <= span; oi++) {
        const bucket = this.grid.get(this.key(ci + oi, cj + oj));
        if (!bucket) continue;
        for (const b of bucket) {
          const P = this.parts[b];
          if (!P) continue;
          const d2 = (P.x - x) ** 2 + (P.y - y) ** 2;
          if (d2 < r2) s += (1 - Math.sqrt(d2) / radius) * (P.stuck > 0 ? 1 : 0.45);
        }
      }
    }
    return Math.min(1, s * 0.16);
  }

  render(ctx, camera, viewW, viewH) {
    if (!this.parts.length) return;
    if (this.buf.width !== viewW >> 1 || this.buf.height !== viewH >> 1) {
      this.buf.width = viewW >> 1;
      this.buf.height = viewH >> 1;
    }
    const b = this.bctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, this.buf.width, this.buf.height);

    // метаболы: непрозрачные круги + размытие в буфере → соседние капли сливаются
    b.filter = 'blur(4px)';
    for (const P of this.parts) {
      const x = (P.x - camera) * 0.5;
      const y = P.y * 0.5;
      if (x < -20 || x > this.buf.width + 20) continue;
      const r = P.r * (P.stuck > 0 ? 1.35 : 1.05) * 0.8;
      b.fillStyle = P.hostile ? '#7b3fbd' : '#1f9f92';
      b.beginPath();
      b.arc(x, y, r, 0, Math.PI * 2);
      b.fill();
    }
    // светлые ядра капель
    b.filter = 'blur(1px)';
    for (const P of this.parts) {
      const x = (P.x - camera) * 0.5;
      const y = P.y * 0.5;
      if (x < -20 || x > this.buf.width + 20) continue;
      b.globalAlpha = 0.55;
      b.fillStyle = P.hostile ? '#d9a6ff' : '#9ef8e6';
      b.beginPath();
      b.arc(x - P.r * 0.12, y - P.r * 0.2, P.r * 0.3, 0, Math.PI * 2);
      b.fill();
    }
    b.globalAlpha = 1;
    b.filter = 'none';

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(this.buf, 0, 0, viewW, viewH);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.28;
    ctx.drawImage(this.buf, 0, 0, viewW, viewH);
    ctx.restore();
  }
}
