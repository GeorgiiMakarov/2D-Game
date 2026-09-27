/**
 * Мягкое тело: замкнутое кольцо масс, связанное пружинами, плюс модель
 * идеального газа внутри (pressure soft body).
 *
 *   интегрирование Верле:  x' = x + (x - x_prev)·damp + a·dt²
 *   давление:  F_i = P0·(V0/V - 1)·n_i·L_i      (V — площадь по формуле шнурков)
 *
 * Такой блоб мнётся при ударе, растекается на земле и восстанавливает форму —
 * из него сделаны слизни-враги.
 */
import { clamp } from '../core/constants.js';

export class SoftBody {
  constructor(x, y, radius, n = 14) {
    this.n = n;
    this.r0 = radius;
    this.pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      this.pts.push({ x: px, y: py, ox: px, oy: py });
    }
    this.restLen = 2 * radius * Math.sin(Math.PI / n);
    this.area0 = 0.5 * n * radius * radius * Math.sin((2 * Math.PI) / n);
    this.pressure = 2600;
    this.stiff = 0.38;
    this.damp = 0.985;
    this.friction = 0.82;
    this.grounded = false;
  }

  center() {
    let cx = 0, cy = 0;
    for (const p of this.pts) { cx += p.x; cy += p.y; }
    return [cx / this.n, cy / this.n];
  }

  aabb() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of this.pts) {
      if (p.x < x0) x0 = p.x;
      if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.y > y1) y1 = p.y;
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  area() {
    let a = 0;
    for (let i = 0; i < this.n; i++) {
      const p = this.pts[i];
      const q = this.pts[(i + 1) % this.n];
      a += p.x * q.y - q.x * p.y;
    }
    return Math.abs(a) * 0.5;
  }

  impulse(ix, iy) {
    for (const p of this.pts) { p.ox -= ix; p.oy -= iy; }
  }

  moveBy(dx, dy) {
    for (const p of this.pts) { p.x += dx; p.y += dy; p.ox += dx; p.oy += dy; }
  }

  step(dt, solids, gravity = 900, flowX = 0) {
    dt = Math.min(dt, 1 / 50);
    const n = this.n;

    // Верле + гравитация + снос воздушным потоком
    for (const p of this.pts) {
      const vx = (p.x - p.ox) * this.damp;
      const vy = (p.y - p.oy) * this.damp;
      p.ox = p.x;
      p.oy = p.y;
      p.x += vx + flowX * dt * dt * 60;
      p.y += vy + gravity * dt * dt;
    }

    for (let it = 0; it < 4; it++) {
      // пружины периметра
      for (let i = 0; i < n; i++) {
        const a = this.pts[i];
        const b = this.pts[(i + 1) % n];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1e-4;
        const diff = ((d - this.restLen) / d) * 0.5 * this.stiff;
        const ox = dx * diff;
        const oy = dy * diff;
        a.x += ox; a.y += oy;
        b.x -= ox; b.y -= oy;
      }

      // внутреннее давление газа
      const area = Math.max(this.area(), 1);
      const push = clamp((this.area0 / area - 1), -0.6, 1.4) * this.pressure * dt * dt;
      for (let i = 0; i < n; i++) {
        const a = this.pts[i];
        const b = this.pts[(i + 1) % n];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1e-4;
        const nx = dy / len;
        const ny = -dx / len;
        const f = push * len * 0.02;
        a.x += nx * f; a.y += ny * f;
        b.x += nx * f; b.y += ny * f;
      }
    }

    // столкновения точек с миром
    this.grounded = false;
    for (const p of this.pts) {
      for (const s of solids) {
        if (p.x < s.x || p.x > s.x + s.w || p.y < s.y || p.y > s.y + s.h) continue;
        const left = p.x - s.x, right = s.x + s.w - p.x;
        const top = p.y - s.y, bot = s.y + s.h - p.y;
        const m = Math.min(left, right, top, bot);
        if (m === top) {
          p.y = s.y;
          p.ox = p.x - (p.x - p.ox) * this.friction;
          p.oy = p.y;
          this.grounded = true;
        } else if (m === bot) {
          p.y = s.y + s.h;
          p.oy = p.y;
        } else if (m === left) {
          p.x = s.x;
          p.ox = p.x;
        } else {
          p.x = s.x + s.w;
          p.ox = p.x;
        }
      }
    }
  }

  /** Сглаженный контур для отрисовки. */
  path(ctx, camera) {
    const p = this.pts;
    const n = this.n;
    ctx.beginPath();
    let mx = (p[n - 1].x + p[0].x) / 2 - camera;
    let my = (p[n - 1].y + p[0].y) / 2;
    ctx.moveTo(mx, my);
    for (let i = 0; i < n; i++) {
      const cur = p[i];
      const nxt = p[(i + 1) % n];
      ctx.quadraticCurveTo(cur.x - camera, cur.y, (cur.x + nxt.x) / 2 - camera, (cur.y + nxt.y) / 2);
    }
    ctx.closePath();
  }
}
