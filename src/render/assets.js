// Загрузка ассетов, сгенерированных диффузионной моделью (фоны + спрайты героя и слизня).
const load = (src) => new Promise((res) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => res(null);
  img.src = src;
});

export const assets = {
  backgrounds: [],
  hero: [],
  slime: null,
  ready: false,
};

export async function loadAssets() {
  const [bg1, bg2, bg3, h0, h1, h2, sl] = await Promise.all([
    load('art/bg1.png'), load('art/bg2.png'), load('art/bg3.png'),
    load('sprites/hero0.png'), load('sprites/hero1.png'), load('sprites/hero2.png'),
    load('sprites/slime0.png'),
  ]);
  assets.backgrounds = [bg1, bg2, bg3];
  assets.hero = [h0, h1, h2].filter(Boolean);
  assets.slime = sl;
  assets.ready = true;
  return assets;
}
