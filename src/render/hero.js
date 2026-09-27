// Оригинальный герой «Кристальных глубин» — юный рудокоп Кир.
// Процедурный пиксель-арт 26×38 (лицом вправо; отражение делает вызывающий код).
// Кадры: idle0/idle1 (моргание), walk0..walk3, jump.

const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); };

const HELM = '#e8a33d', HELM_D = '#b57a26', HELM_L = '#ffd97a';
const SKIN = '#f2c194', SKIN_D = '#d69a6b';
const JACK = '#2f8f86', JACK_D = '#1f6b65', JACK_L = '#4fc4b8';
const PANTS = '#4a3b2e', PANTS_L = '#54432f', BOOT = '#2e2318';
const LAMP = '#ffe680';

function head(ctx, blink) {
  // каска
  R(ctx, 7, 1, 12, 3, HELM);
  R(ctx, 5, 4, 16, 3, HELM);
  R(ctx, 4, 7, 18, 2, HELM_D);
  R(ctx, 8, 2, 4, 2, HELM_L);
  // налобный фонарь
  R(ctx, 16, 3, 5, 5, '#5a4a20');
  R(ctx, 17, 4, 3, 3, LAMP);
  R(ctx, 18, 4, 1, 2, '#ffffff');
  // лицо
  R(ctx, 7, 9, 12, 6, SKIN);
  R(ctx, 7, 13, 12, 2, SKIN_D);
  if (blink) R(ctx, 14, 11, 3, 1, '#1d2733');
  else R(ctx, 14, 10, 2, 3, '#1d2733');
  R(ctx, 18, 12, 1, 1, SKIN_D);          // нос
  R(ctx, 11, 15, 4, 2, SKIN_D);          // шея
}

function torso(ctx) {
  R(ctx, 6, 17, 14, 7, JACK);
  R(ctx, 6, 17, 3, 7, JACK_D);
  R(ctx, 16, 17, 2, 7, JACK_L);
  R(ctx, 6, 24, 14, 2, '#3a2c1e');       // ремень
  R(ctx, 11, 24, 3, 2, LAMP);            // пряжка
  // рюкзак с осколком кристалла
  R(ctx, 2, 18, 4, 8, '#6b4a2f');
  R(ctx, 2, 18, 4, 2, '#7d5838');
  R(ctx, 6, 19, 1, 6, '#3a2c1e');        // лямка
  R(ctx, 3, 13, 2, 6, '#65ead8');        // кристалл
  R(ctx, 3, 13, 1, 6, '#d7fff7');
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
  const fy = up ? 14 : 18;
  R(ctx, 3 + bdx, 18, 3, 7, JACK_D);     // задняя рука
  R(ctx, 3 + bdx, 25, 3, 3, SKIN);
  R(ctx, 20 + fdx, fy, 3, 7, JACK);      // передняя рука
  R(ctx, 20 + fdx, fy + 7, 3, 3, SKIN);
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
