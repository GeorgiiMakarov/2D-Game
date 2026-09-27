# Как выложить это на GitHub

Ниже — готовые команды и тексты. Выбери один из трёх сценариев.

---

## Сценарий A. Заменить содержимое существующего репозитория `2D-Game`

Старый `2d-game.html` в репозитории **битый** (обрезан на 1 МиБ, игра не запускается),
так что заменить его — это исправление, а не потеря.

```bash
git clone https://github.com/GeorgiiMakarov/2D-Game.git
cd 2D-Game

# сохраняем оригинал как историческую версию
mkdir -p legacy
git mv 2d-game.html legacy/2d-game.truncated.html
git mv 2d-game-code.md legacy/2d-game-code.md
git mv README.md legacy/README-v1.md

# копируем новый проект (без node_modules и dist)
cp -r /путь/к/crystal-depths-fx/{src,public,tools,docs,.github} .
cp /путь/к/crystal-depths-fx/{index.html,package.json,vite.config.js,README.md,LICENSE,.gitignore,PUBLISH.md,ЗАПУСК.txt} .

git add -A
git commit -F .git/COMMIT_MSG     # текст коммита — ниже
git push origin main
```

## Сценарий B. Новый отдельный репозиторий

```bash
cd /путь/к/crystal-depths-fx
git init -b main
git add .
git commit -m "Crystal Depths FX: 2D-платформер с Навье–Стоксом, SPH и диффузионным светом"
gh repo create crystal-depths-fx --public --source=. --push
# или вручную: git remote add origin https://github.com/<логин>/crystal-depths-fx.git && git push -u origin main
```

## Сценарий C. Ветка + Pull Request в старый репозиторий

```bash
git checkout -b feat/fx-edition
# ...скопировать файлы как в сценарии A...
git add -A && git commit -F COMMIT_MSG
git push -u origin feat/fx-edition
gh pr create --fill
```

---

## Текст коммита

```
feat: FX Edition — модульная пересборка + физика сплошных сред

Проект переведён на Vite и разбит на модули; геймплей оригинала сохранён
(3 уровня, осколки, кирка, крипер/зомби/скелет/эндермен, три силы, портал).

Добавлено:
- Навье–Стокс (Stable Fluids): адвекция, проекция давления методом Гаусса–Зейделя,
  vorticity confinement, плавучесть, воксельные препятствия из геометрии уровня.
  Дым факелов, пар над водой, лавовые вентиляции, вихрь от кирки, ударная волна взрыва.
- SPH-слизь: давление, когезия (поверхностное натяжение), вязкость и адгезия к стенам.
  Новая механика: бросок слизи (S), торможение в лужах, прыжок от залипшей стены.
- Мягкие тела (Верле + давление газа): слизни-блобы, которые мнутся, шлёпаются и
  разлетаются каплями.
- Диффузионное освещение: цветное поле по уравнению диффузии с поглощением в породе.
- Ассеты, сгенерированные диффузионной моделью (3 параллакс-фона, герой, слизень) +
  скрипт нарезки tools/prep_assets.py; тайлы и иконки — процедурный пиксель-арт.
- Меню настроек физики (каждая симуляция отключается отдельно, качество ×0.6/×1/×1.5),
  метрики F3, сохранение прогресса и настроек в localStorage, тач-управление.

Fix: прежний 2d-game.html был обрезан на 1 048 576 байт — из 19 встроенных PNG
целыми остались 3, тег <script> не закрывался и игра не запускалась. Логика
восстановлена из 2d-game-code.md, спрайты заменены на оригинальные.
```

## Текст описания репозитория (About)

> 2D пиксель-платформер с реальной физикой сплошных сред: Навье–Стокс для дыма и пара,
> SPH-слизь с когезией и адгезией, мягкие тела Верле, диффузионное освещение. Vanilla JS + Vite.

Темы (topics): `game` `2d-game` `platformer` `javascript` `vite` `canvas`
`fluid-simulation` `navier-stokes` `sph` `soft-body-physics` `pixel-art` `webaudio`

---

## GitHub Pages

В репозитории уже лежит `.github/workflows/pages.yml`: после пуша в `main` он
собирает проект и публикует `dist/` на Pages.
Включить один раз: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Игра будет доступна по адресу `https://<логин>.github.io/<репозиторий>/`.

## Что НЕ коммитить

`.gitignore` уже исключает `node_modules/`, `dist/`, `.vite/`, логи и мусор IDE.
Папка `public/art/` (сырые генерации, ~9 МБ) нужна только для повторной нарезки
спрайтов через `tools/prep_assets.py` — если хочется лёгкий репозиторий, её можно
удалить и добавить в `.gitignore`, игра работает на готовых `public/sprites/`.
