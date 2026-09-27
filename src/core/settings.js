// Настройки симуляции + прогресс. Всё хранится в localStorage.
const KEY = 'crystal-depths-fx.settings';
const SAVE = 'crystal-depths-fx.save';

export const DEFAULTS = {
  fluid: true,        // Навье–Стокс: дым, пар, туман
  vorticity: true,    // подкрутка завихрений (vorticity confinement)
  goo: true,          // SPH-слизь с когезией и адгезией
  softbody: true,     // мягкие тела Верле (слизни)
  lighting: true,     // диффузионное распространение света
  bloom: true,        // свечение кристаллов
  sound: true,
  quality: 1,         // 0.6 / 1 / 1.5 — множитель разрешения сеток и числа частиц
};

export const settings = { ...DEFAULTS, ...load(KEY) };

function load(k) {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null') || {};
  } catch {
    return {};
  }
}

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch { /* приватный режим — просто игнорируем */ }
}

export function saveProgress(data) {
  try {
    localStorage.setItem(SAVE, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function loadProgress() {
  const d = load(SAVE);
  return d && typeof d.levelIndex === 'number' ? d : null;
}

export function clearProgress() {
  try {
    localStorage.removeItem(SAVE);
  } catch { /* ignore */ }
}
