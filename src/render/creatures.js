// Оригинальные враги «Кристальных глубин» — процедурный пиксель-арт.
// Никаких внешних атласов и чужих образов: пещерный клещ, грибной ходок,
// каменный страж, огонёк глубин и моховой крот.
// Каждая функция рисует существо в локальных координатах (0,0 — левый верх бокса).

const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); };

/** Пещерный клещ — круглый жук с кристаллами на спине. Взрывается при гибели. */
export function drawMite(ctx, w, h, t) {
  const cx = w / 2;
  const legSwing = Math.sin(t * 9) * 3;
  // ноги
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < 3; i++) {
      const lx = cx + s * (10 + i * 2) + (s > 0 ? legSwing : -legSwing) * (i % 2 ? 1 : -0.6);
      R(ctx, lx - 1.5, 34 + i * 6, 3, 12, '#1d3a36');
    }
  }
  // панцирь
  R(ctx, cx - 13, 14, 26, 8, '#2b6b62');
  R(ctx, cx - 15, 20, 30, 18, '#2b6b62');
  R(ctx, cx - 13, 22, 26, 12, '#35907f');
  R(ctx, cx - 9, 16, 8, 4, '#4fc4b8');          // блик
  R(ctx, cx - 15, 32, 30, 3, '#1d3a36');        // кромка
  // кристаллы на спине
  R(ctx, cx - 10, 6, 4, 10, '#65ead8');
  R(ctx, cx - 10, 6, 2, 10, '#d7fff7');
  R(ctx, cx - 1, 3, 5, 13, '#7bf1df');
  R(ctx, cx - 1, 3, 2, 13, '#eafffb');
  R(ctx, cx + 7, 7, 4, 9, '#65ead8');
  // голова
  R(ctx, cx - 8, 36, 16, 10, '#22423d');
  R(ctx, cx - 11, 38, 4, 6, '#22423d');         // жвалы
  R(ctx, cx + 7, 38, 4, 6, '#22423d');
  R(ctx, cx - 6, 39, 4, 4, '#ff5d5d');          // глаза
  R(ctx, cx + 2, 39, 4, 4, '#ff5d5d');
  R(ctx, cx - 6, 39, 2, 2, '#ffd2d2');
  R(ctx, cx + 2, 39, 2, 2, '#ffd2d2');
}

/** Грибной ходок — мирный с виду гриб, но идёт на героя. */
export function drawShroomer(ctx, w, h, t) {
  const cx = w / 2;
  const step = Math.sin(t * 6) * 3;
  // ноги
  R(ctx, cx - 9, 44, 7, 12 + step, '#5a4632');
  R(ctx, cx + 2, 44, 7, 12 - step, '#5a4632');
  R(ctx, cx - 10, 54 + step, 9, 4, '#3a2c1e');
  R(ctx, cx + 1, 54 - step, 9, 4, '#3a2c1e');
  // тело-ножка
  R(ctx, cx - 8, 26, 16, 20, '#e8dcc0');
  R(ctx, cx - 8, 26, 4, 20, '#cbb98f');
  // руки
  const asw = Math.sin(t * 6) * 2;
  R(ctx, cx - 13, 28 + asw, 5, 14, '#e8dcc0');
  R(ctx, cx + 8, 28 - asw, 5, 14, '#e8dcc0');
  // лицо
  R(ctx, cx - 5, 30, 4, 5, '#1d2733');
  R(ctx, cx + 1, 30, 4, 5, '#1d2733');
  R(ctx, cx - 4, 39, 8, 2, '#1d2733');          // хмурый рот
  // шляпка
  R(ctx, cx - 15, 8, 30, 6, '#c0392b');
  R(ctx, cx - 17, 13, 34, 9, '#c0392b');
  R(ctx, cx - 17, 20, 34, 4, '#96281b');
  R(ctx, cx - 11, 9, 5, 5, '#f2e6e6');          // пятна
  R(ctx, cx + 1, 13, 6, 6, '#f2e6e6');
  R(ctx, cx - 6, 16, 4, 4, '#f2e6e6');
  R(ctx, cx - 13, 8, 8, 3, '#e8908a');          // блик
}

/** Каменный страж — ожившая порода с кристаллом-сердцем. Метает камни. */
export function drawGolem(ctx, w, h, t) {
  const cx = w / 2;
  const step = Math.sin(t * 5) * 2;
  const throwAnim = Math.max(0, Math.sin(t * 2.4)) * 6;   // замах руки
  // ноги-колонны
  R(ctx, cx - 10, 46, 8, 16 + step, '#5c6a72');
  R(ctx, cx + 2, 46, 8, 16 - step, '#5c6a72');
  R(ctx, cx - 11, 60 + step, 10, 4, '#414d54');
  R(ctx, cx + 1, 60 - step, 10, 4, '#414d54');
  // торс
  R(ctx, cx - 13, 20, 26, 28, '#6b7a83');
  R(ctx, cx - 13, 20, 6, 28, '#4a565e');
  R(ctx, cx + 7, 20, 6, 28, '#8a99a1');          // грань
  // трещины
  R(ctx, cx - 4, 22, 2, 12, '#3a444b');
  R(ctx, cx + 3, 34, 2, 12, '#3a444b');
  // кристалл-сердце
  const pulse = 0.6 + 0.4 * Math.sin(t * 5);
  R(ctx, cx - 4, 30, 8, 12, pulse > 0.7 ? '#b9fff4' : '#65ead8');
  R(ctx, cx - 2, 32, 3, 8, '#eafffb');
  // голова
  R(ctx, cx - 8, 6, 16, 14, '#5c6a72');
  R(ctx, cx - 8, 6, 16, 3, '#74848c');
  R(ctx, cx - 5, 11, 10, 3, '#ffd97a');          // щель-глаз
  // руки
  R(ctx, cx - 19, 22, 6, 20, '#5c6a72');        // левая
  R(ctx, cx - 20, 40, 8, 8, '#4a565e');
  const ry = 22 - throwAnim;                     // правая с замахом
  R(ctx, cx + 13, ry, 6, 20, '#5c6a72');
  R(ctx, cx + 12, ry + 18, 8, 8, '#4a565e');
}

/** Огонёк глубин — блуждающее пламя пещер. Высокое, парящее. */
export function drawWisp(ctx, w, h, t) {
  const cx = w / 2;
  const bob = Math.sin(t * 2.2) * 4;
  // шлейф
  for (let i = 0; i < 5; i++) {
    const yy = 44 + bob + i * 9;
    const ww = 16 - i * 2.4;
    const alpha = 0.32 - i * 0.055;
    ctx.globalAlpha = Math.max(0.05, alpha);
    R(ctx, cx - ww / 2 + Math.sin(t * 3 + i) * 3, yy, ww, 10, '#3f6fd8');
  }
  ctx.globalAlpha = 1;
  // тело-пламя
  R(ctx, cx - 11, 18 + bob, 22, 30, '#2c4fa8');
  R(ctx, cx - 8, 22 + bob, 16, 22, '#4f7fe0');
  R(ctx, cx - 5, 26 + bob, 10, 14, '#9fc0ff');
  // ядро
  const flick = Math.sin(t * 11) * 1.5;
  R(ctx, cx - 4, 30 + bob + flick, 8, 10, '#d7fff7');
  R(ctx, cx - 2, 32 + bob + flick, 4, 6, '#ffffff');
  // глаза
  R(ctx, cx - 8, 20 + bob, 5, 7, '#0d1720');
  R(ctx, cx + 3, 20 + bob, 5, 7, '#0d1720');
  R(ctx, cx - 8, 20 + bob, 5, 2, '#c98bff');
  R(ctx, cx + 3, 20 + bob, 5, 2, '#c98bff');
  // рожки-искры
  R(ctx, cx - 13, 10 + bob, 3, 8, '#7bf1df');
  R(ctx, cx + 10, 12 + bob, 3, 6, '#7bf1df');
}

/** Моховой крот — мирный зверёк первого уровня. */
export function drawMole(ctx, w, h, t) {
  const cx = w / 2;
  const sniff = Math.sin(t * 7) * 1.5;
  // хвост
  R(ctx, 2, 26, 8, 4, '#6b4a2f');
  // тело
  R(ctx, 8, 14, w - 22, 26, '#7d5a38');
  R(ctx, 8, 14, w - 22, 7, '#8f6c46');
  // мох на спине
  R(ctx, 14, 12, 12, 5, '#4c9c4a');
  R(ctx, 28, 13, 9, 4, '#63bd58');
  R(ctx, 20, 14, 4, 3, '#7ce08a');
  // лапы
  const dig = Math.sin(t * 8) * 2;
  R(ctx, 12, 38, 8, 8 + dig, '#5a422a');
  R(ctx, 30, 38, 8, 8 - dig, '#5a422a');
  R(ctx, 10, 44 + dig, 12, 3, '#d8cfa8');       // когти
  R(ctx, 28, 44 - dig, 12, 3, '#d8cfa8');
  // морда с заострённым носом
  R(ctx, w - 18, 20, 12, 14, '#8f6c46');
  R(ctx, w - 9, 25 + sniff, 7, 4, '#d89aa2');
  R(ctx, w - 6, 29 + sniff, 4, 2, '#d89aa2');
  R(ctx, w - 8, 25 + sniff, 2, 2, '#8f4147');
  R(ctx, w - 20, 22, 3, 3, '#1d2733');          // глаз
}

/** Моховой ползун — коренастый зелёный зверь с кристаллами на спине.
 *  Идёт на героя и, подобравшись вплотную, вспыхивает и взрывается.
 *  Оригинальный дизайн: приземистое тело, круглые янтарные глаза. */
export function drawCrawler(ctx, w, h, t, fuse = 0) {
  const cx = w / 2;
  const step = Math.sin(t * 8) * 2.5;
  // ноги-коротышки
  R(ctx, cx - 13, 44, 6, 10 + step, '#3d6b2f');
  R(ctx, cx + 7, 44, 6, 10 - step, '#3d6b2f');
  R(ctx, cx - 14, 52 + step, 8, 3, '#2c4f22');
  R(ctx, cx + 6, 52 - step, 8, 3, '#2c4f22');
  // приземистое тело
  R(ctx, cx - 15, 22, 30, 24, '#4c9c4a');
  R(ctx, cx - 15, 22, 7, 24, '#3a7d38');
  R(ctx, cx + 9, 22, 6, 24, '#63bd58');
  R(ctx, cx - 11, 40, 22, 6, '#3a7d38');        // брюхо
  // мох и трещины
  R(ctx, cx - 8, 26, 5, 8, '#63bd58');
  R(ctx, cx + 4, 32, 4, 10, '#2c4f22');
  // кристаллы-шипы на спине
  R(ctx, cx - 11, 12, 5, 12, '#65ead8');
  R(ctx, cx - 11, 12, 2, 12, '#d7fff7');
  R(ctx, cx - 2, 8, 6, 16, '#7bf1df');
  R(ctx, cx - 2, 8, 2, 16, '#eafffb');
  R(ctx, cx + 6, 13, 4, 11, '#65ead8');
  // морда: круглые янтарные глаза и короткий рот
  R(ctx, cx + 5, 28, 7, 7, '#e8dcc0');
  R(ctx, cx + 7, 30, 3, 3, '#d8912a');
  R(ctx, cx + 11, 38, 4, 2, '#2c4f22');
  // фитиль: белое мигание перед взрывом
  if (fuse > 0) {
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 30);
    R(ctx, 0, 0, w, h, '#ffffff');
    ctx.globalAlpha = 1;
  }
}

export const CREATURES = {
  mite: drawMite,
  shroomer: drawShroomer,
  golem: drawGolem,
  wisp: drawWisp,
  crawler: drawCrawler,
};
