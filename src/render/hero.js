// Оригинальный герой «Кристальных глубин» — блочный авантюрист.
// Процедурный пиксель-арт 26×38 (лицом вправо; отражение делает вызывающий код).
// Свой дизайн: тёмно-каштановые волосы, бирюзово-синяя рубаха, пояс с сумкой
// для осколков. Кадры: idle0/idle1 (моргание), walk0..walk3, jump.

const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); };

const HAIR = '#6b4423', HAIR_D = '#4a2d17', HAIR_L = '#8a5a30';
const SKIN = '#f2c194', SKIN_D = '#d69a6b';
const SHIRT = '#2fa8c9', SHIRT_D = '#1e7f99', SHIRT_L = '#79d8ec';
const PANTS = '#2c3d8f', PANTS_L = '#3d51a8', BOOT = '#22283a';
const BELT = '#5a3a22', BUCKLE = '#ffd97a';

function head(ctx, blink) {
  // блочная голова, волосы с бакенбардами
  R(ctx, 6, 1, 14, 3, HAIR);
  R(ctx, 6, 4, 14, 2, HAIR_L);
  R(ctx, 6, 6, 2, 5, HAIR_D);          // бакенбард
  R(ctx, 18, 6, 2, 5, HAIR_D);
  // лицо
  R(ctx, 8, 6, 10, 7, SKIN);
  R(ctx, 8, 11, 10, 2, SKIN_D);
  if (blink) R(ctx, 10, 8, 6, 1, '#1d2733');
  else { R(ctx, 10, 8, 2, 3, '#241a10'); R(ctx, 15, 8, 2, 3, '#241a10'); }
  R(ctx, 13, 11, 1, 1, SKIN_D);        // нос
  R(ctx, 11, 13, 4, 1, '#b57a52');     // рот
}

function torso(ctx) {
  R(ctx, 6, 15, 14, 8, SHIRT);
  R(ctx, 6, 15, 3, 8, SHIRT_D);
  R(ctx, 17, 15, 3, 8, SHIRT_L);
  R(ctx, 10, 15, 2, 8, SHIRT_D);       // складка
  // пояс с сумкой для осколков
  R(ctx, 6, 23, 14, 3, BELT);
  R(ctx, 12, 23, 3, 3, BUCKLE);
  R(ctx, 3, 20, 4, 7, '#7d5838');       // сумка
  R(ctx, 3, 20, 4, 2, '#8f6c46');
  R(ctx, 4, 17, 2, 4, '#65ead8');       // осколок в сумке
  R(ctx, 4, 17, 1, 4, '#d7fff7');
}

function legs(ctx, fdx, bdx, tuck) {
  // fdx/bdx — сдвиг передней/задней ноги; tuck — поджаты в прыжке
  if (tuck) {
    R(ctx, 8, 27, 4, 5, PANTS);
    R(ctx, 7, 31, 6, 3, BOOT);
    R(ctx, 15, 27, 4, 5, PANTS_L);
    R(ctx, 15, 31, 7, 3, BOOT);
    return;
  }
  R(ctx, 8 + bdx, 26, 4, 8, PANTS);
  R(ctx, 7 + bdx, 34, 6, 4, BOOT);
  R(ctx, 14 + fdx, 26, 4, 8, PANTS_L);
  R(ctx, 14 + fdx, 34, 7, 4, BOOT);
  R(ctx, 19 + fdx, 35, 2, 3, BOOT);      // носок
}

function arms(ctx, fdx, bdx, up) {
  const fy = up ? 13 : 16;
  R(ctx, 3 + bdx, 16, 3, 6, SHIRT_D);   // задняя рука (рукав)
  R(ctx, 3 + bdx, 22, 3, 4, SKIN);      // кисть
  R(ctx, 20 + fdx, fy, 3, 6, SHIRT);    // передняя рука
  R(ctx, 20 + fdx, fy + 6, 3, 4, SKIN);
}

/** Рисует героя в боксе w×h. frame: 'idle0'|'idle1'|'walk0'..'walk3'|'jump'. */
export function drawHero(ctx, w, h, frame) {
  ctx.save();
  ctx.scale(w / 26, h / 38);
  const WALK = {
    walk0: [2, -2, -2, 2],
    walk1: [0, 0, 0, 0],
    walk2: [-2, 2, 2, -2],
    walk3: [0, 0, 0, 0],
  };
  head(ctx, frame === 'idle1');
  torso(ctx);
  if (frame === 'jump') {
    legs(ctx, 0, 0, true);
    arms(ctx, 0, 0, true);
  } else if (WALK[frame]) {
    const [fdx, bdx, fady, bady] = WALK[frame];
    legs(ctx, fdx, bdx, false);
    arms(ctx, fady, bady, false);
  } else {
    legs(ctx, 0, 0, false);
    arms(ctx, 0, 0, false);
  }
  ctx.restore();
}
