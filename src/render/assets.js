// Все визуальные ассеты процедурные: фоны рисуются кодом в background.js,
// герой/мобы/тайлы/кристаллы — в hero.js, creatures.js, pixelart.js.
// Внешних изображений игра не загружает.
export const assets = {
  ready: false,
};

export async function loadAssets() {
  assets.ready = true;
  return assets;
}
