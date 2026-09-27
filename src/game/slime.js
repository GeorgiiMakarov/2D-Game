// Слизень — враг на мягком теле. Прыгает, расплющивается при приземлении,
// при смерти разлетается SPH-слизью.
import { SoftBody } from '../physics/softbody.js';

export class SlimeEnemy {
  constructor(x, y, r, hp = 3) {
    this.body = new SoftBody(x, y, r, 14);
    this.hp = hp;
    this.r = r;
    this.min = x - 150;
    this.max = x + 150;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.timer = 0.6 + Math.random();
    this.hit = 0;
    this.dead = false;
    this.squash = 0;
    this.wasGrounded = false;
  }

  center() { return this.body.center(); }

  update(dt, solids, flowX) {
    if (this.dead) return;
    this.hit = Math.max(0, this.hit - dt);
    this.timer -= dt;
    const [cx] = this.body.center();
    if (cx < this.min) this.dir = 1;
    if (cx > this.max) this.dir = -1;

    this.body.step(dt, solids, 980, flowX);

    if (this.body.grounded) {
      if (!this.wasGrounded) this.squash = 1;      // шлепок при приземлении
      if (this.timer <= 0) {
        this.timer = 1.1 + Math.random() * 0.9;
        this.body.impulse(-this.dir * 2.6, 6.4);   // прыжок
      }
    }
    this.wasGrounded = this.body.grounded;
    this.squash = Math.max(0, this.squash - dt * 2.2);
  }

  damage(n, dirX) {
    this.hp -= n;
    this.hit = 0.2;
    this.body.impulse(-dirX * 3.2, 1.5);
    if (this.hp <= 0) this.dead = true;
    return this.dead;
  }

  draw(ctx, camera, time, sprite) {
    if (this.dead) return;
    const b = this.body;
    ctx.save();
    b.path(ctx, camera);
    const [cx, cy] = b.center();
    const g = ctx.createRadialGradient(cx - camera, cy - this.r * 0.4, 2, cx - camera, cy, this.r * 1.6);
    g.addColorStop(0, this.hit > 0 ? '#ffffff' : '#9ef8e6');
    g.addColorStop(0.5, '#33bda8');
    g.addColorStop(1, '#0f5f62');
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d9fff6';
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ядро-спрайт (из диффузионной модели) внутри желе
    if (sprite && sprite.width) {
      const w = this.r * 1.4;
      const h = (sprite.height / sprite.width) * w;
      ctx.globalAlpha = 0.75;
      ctx.drawImage(sprite, cx - camera - w / 2, cy - h / 2 + 2, w, h);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#062a2c';
      ctx.fillRect(cx - camera - 7, cy - 4, 4, 5);
      ctx.fillRect(cx - camera + 3, cy - 4, 4, 5);
    }
    ctx.restore();
  }
}
