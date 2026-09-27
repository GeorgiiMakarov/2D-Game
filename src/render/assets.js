// Загрузка фонов. Герой, враги и слизни — полностью процедурный пиксель-арт,
// внешних спрайтов игра больше не тянет.
const load = (src) => new Promise((res) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => res(null);
  img.src = src;
});

export const assets = {
  backgrounds: [],
  ready: false,
};

export async function loadAssets() {
  const [bg1, bg2, bg3] = await Promise.all([
    load('art/bg1.png'), load('art/bg2.png'), load('art/bg3.png'),
  ]);
  assets.backgrounds = [bg1, bg2, bg3];
  assets.ready = true;
  return assets;
}
