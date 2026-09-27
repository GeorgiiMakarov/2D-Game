/**
 * Ядро Crystal Depths FX: игровой цикл, мир, герой, враги и связь
 * геймплея с четырьмя симуляциями (жидкость, слизь, мягкие тела, свет).
 */
import {
  W, H, TILE, WORLD, GROUND, GRAVITY, PLAYER_ACCEL_AIR, PLAYER_ACCEL_GROUND,
  PLAYER_SPEED, PLAYER_SPEED_BOOST, JUMP_V, DOUBLE_JUMP_V, clamp,
} from '../core/constants.js';
import { keys, on as onInput } from '../core/input.js';
import { initAudio, sfx, setMusicContext, setSound } from '../core/audio.js';
import { settings, saveSettings, saveProgress, loadProgress, clearProgress } from '../core/settings.js';
import { LEVELS } from './levels.js';
import { SlimeEnemy } from './slime.js';
import { FluidSim } from '../physics/fluid.js';
import { GooSystem } from '../physics/sph.js';
import { LightField } from '../physics/lighting.js';
import { assets, loadAssets } from '../render/assets.js';
import { drawBackground } from '../render/background.js';
import { tile, crystal, torch, icon, iconURL } from '../render/pixelart.js';
import { CREATURES, drawPig } from '../render/creatures.js';

const $ = (id) => document.getElementById(id);

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.state = 'menu';
    this.time = 0;
    this.last = 0;
    this.camera = 0;
    this.prevCamera = 0;
    this.shake = 0;
    this.hitStop = 0;
    this.toastTimer = 0;
    this.winTimer = 0;
    this.transitionBusy = false;
    this.levelIndex = 0;
    this.abilities = { jump: false, power: false, shield: false };
    this.fps = 60;
    this.simMs = 0;
    this.showDiag = false;

    this.fluid = new FluidSim(10);
    this.light = new LightField(12);
    this.goo = new GooSystem(420);
    this.applyQuality();

    this.dom = {
      menu: $('menu'), hud: $('hud'), toast: $('toast'), diag: $('diag'),
      pauseModal: $('pauseModal'), endModal: $('endModal'), howModal: $('howModal'),
      settingsModal: $('settingsModal'), flash: $('impactFlash'), fade: $('sceneFade'),
    };

    this.bindUI();
    this.loadLevel(0, false);
    loadAssets().then(() => { this.assetsReady = true; });
  }

  // ───────────────────────────── качество/настройки ─────────────────────────
  applyQuality() {
    const q = settings.quality;
    this.fluid.configure(Math.round(14 / q));
    this.light.configure(Math.round(16 / q));
    this.goo.max = Math.round(300 * q);
    this.fluid.iters = q >= 1.5 ? 8 : q >= 1 ? 6 : 4;
    this.fluid.vortEps = settings.vorticity ? 3.2 : 0;
    this.buildSolidMask();
  }

  // ───────────────────────────── интерфейс ──────────────────────────────────
  bindUI() {
    const click = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
    click('startBtn', () => { sfx('click'); clearProgress(); this.fadeScene(() => this.start(0)); });
    click('continueBtn', () => {
      sfx('click');
      const p = loadProgress();
      this.fadeScene(() => this.start(p ? p.levelIndex : 0, p ? p.abilities : null));
    });
    click('againBtn', () => { sfx('click'); this.fadeScene(() => this.start(0)); });
    click('pauseBtn', () => this.pause());
    click('resumeBtn', () => this.pause());
    click('toMenuBtn', () => { sfx('click'); this.toMenu(); });
    click('howBtn', () => { sfx('click'); this.dom.howModal.classList.remove('hidden'); });
    click('closeHow', () => { sfx('click'); this.dom.howModal.classList.add('hidden'); });
    click('settingsBtn', () => { sfx('click'); this.openSettings(); });
    click('pauseSettingsBtn', () => { sfx('click'); this.openSettings(); });
    click('closeSettings', () => { sfx('click'); this.closeSettings(); });
    click('fxBtn', () => { sfx('click'); this.openSettings(); });
    click('soundBtn', () => {
      settings.sound = !settings.sound;
      setSound(settings.sound);
      saveSettings();
      $('soundBtn').textContent = settings.sound ? 'ЗВУК: ВКЛ' : 'ЗВУК: ВЫКЛ';
      sfx('click');
    });

    onInput('pause', () => this.pause());
    onInput('settings', () => this.openSettings());
    onInput('diag', () => {
      this.showDiag = !this.showDiag;
      this.dom.diag.classList.toggle('hidden', !this.showDiag);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });

    setSound(settings.sound);
    $('soundBtn').textContent = settings.sound ? 'ЗВУК: ВКЛ' : 'ЗВУК: ВЫКЛ';
    $('iconJump').src = iconURL('jump');
    $('iconPower').src = iconURL('power');
    $('iconShield').src = iconURL('shield');
    $('continueBtn').style.display = loadProgress() ? '' : 'none';
    this.buildSettingsPanel();
  }

  buildSettingsPanel() {
    const rows = [
      ['fluid', 'НАВЬЕ–СТОКС: ДЫМ И ПАР', 'Сеточная симуляция несжимаемой среды: адвекция, давление, плавучесть.'],
      ['vorticity', 'VORTICITY CONFINEMENT', 'Возвращает мелкие вихри, съеденные численной диффузией.'],
      ['goo', 'SPH-СЛИЗЬ (КОГЕЗИЯ + АДГЕЗИЯ)', 'Частицы липнут друг к другу и к стенам, образуют лужи.'],
      ['softbody', 'МЯГКИЕ ТЕЛА (ВЕРЛЕ)', 'Слизни-блобы с внутренним давлением газа.'],
      ['lighting', 'ДИФФУЗИОННЫЙ СВЕТ', 'Свет распространяется уравнением диффузии с поглощением в породе.'],
      ['bloom', 'СВЕЧЕНИЕ / BLOOM', 'Дополнительный аддитивный проход по кристаллам и пару.'],
    ];
    const list = $('optList');
    list.innerHTML = '';
    for (const [key, title, desc] of rows) {
      const row = document.createElement('div');
      row.className = 'opt-row';
      row.innerHTML = `<div>${title}<small>${desc}</small></div>`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'switch' + (settings[key] ? ' on' : '');
      btn.textContent = settings[key] ? 'ВКЛ' : 'ВЫКЛ';
      btn.onclick = () => {
        settings[key] = !settings[key];
        btn.classList.toggle('on', settings[key]);
        btn.textContent = settings[key] ? 'ВКЛ' : 'ВЫКЛ';
        if (key === 'vorticity') this.fluid.vortEps = settings.vorticity ? 3.2 : 0;
        if (key === 'fluid' && !settings.fluid) this.fluid.clear();
        if (key === 'goo' && !settings.goo) this.goo.clear();
        saveSettings();
        sfx('click');
      };
      row.appendChild(btn);
      list.appendChild(row);
    }
    const qRow = $('qualityRow');
    const sync = () => qRow.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', Number(b.dataset.q) === settings.quality);
    });
    qRow.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        settings.quality = Number(b.dataset.q);
        saveSettings();
        this.applyQuality();
        sync();
        sfx('click');
      };
    });
    sync();
  }

  openSettings() {
    this.pauseWasOpen = !this.dom.pauseModal.classList.contains('hidden');
    this.dom.pauseModal.classList.add('hidden');
    this.dom.settingsModal.classList.remove('hidden');
  }

  closeSettings() {
    this.dom.settingsModal.classList.add('hidden');
    if (this.pauseWasOpen) this.dom.pauseModal.classList.remove('hidden');
    this.pauseWasOpen = false;
  }

  flash() {
    this.dom.flash.classList.add('on');
    setTimeout(() => this.dom.flash.classList.remove('on'), 65);
  }

  fadeScene(fn) {
    if (this.transitionBusy) return;
    this.transitionBusy = true;
    this.dom.fade.classList.add('active');
    setTimeout(() => {
      fn();
      setTimeout(() => {
        this.dom.fade.classList.remove('active');
        this.transitionBusy = false;
      }, 70);
    }, 240);
  }

  showToast(msg) {
    this.dom.toast.textContent = msg;
    this.dom.toast.classList.add('show');
    this.toastTimer = 2.1;
  }

  updateHud() {
    const L = LEVELS[this.levelIndex];
    $('gems').textContent = `${this.player?.gems || 0}/${L.need}`;
    $('level').textContent = `${this.levelIndex + 1}/3`;
    const hp = Math.max(0, this.player?.hp || 0);
    const hearts = $('hearts');
    if (hearts.childElementCount !== 3) {
      hearts.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const img = document.createElement('img');
        img.className = 'heart-icon';
        img.src = iconURL('heart');
        hearts.appendChild(img);
      }
    }
    [...hearts.children].forEach((el, i) => { el.style.opacity = i < hp ? 1 : 0.16; });
    $('pick').textContent = this.player && this.player.cool > 0 ? '…' : 'ГОТОВА';
    $('abilityJump').classList.toggle('on', this.abilities.jump);
    $('abilityPower').classList.toggle('on', this.abilities.power);
    $('abilityShield').classList.toggle('on', this.abilities.shield && this.player?.shieldReady);
  }

  // ───────────────────────────── мир ────────────────────────────────────────
  loadLevel(index, keepHealth = true) {
    this.levelIndex = index;
    const L = LEVELS[index];
    const hp = keepHealth && this.player ? Math.min(3, this.player.hp + 1) : 3;
    this.hitStop = 0;
    this.player = {
      x: 70, y: GROUND - 72, w: 32, h: 70, vx: 0, vy: 0, ground: false, dir: 1,
      hp, gems: 0, attack: 0, cool: 0, inv: 1, anim: 0, airJump: true,
      shieldReady: this.abilities.shield, gooCool: 0, wall: 0, wet: 0,
    };
    this.waters = L.waters.map((w) => ({ x: w[0], y: GROUND, w: w[1], h: H - GROUND }));
    this.platforms = L.platforms.map((p) => ({
      x: p[0], w: p[1], y: p[2], h: p[2] === GROUND ? 96 : 24,
      type: p[2] === GROUND ? 'ground' : 'ledge',
    }));
    this.rocks = L.rocks.map((r) => ({ x: r[0], y: r[1], w: r[2], h: r[3], hp: r[4], maxHp: r[4] }));
    this.gems = L.gems.map((p, i) => ({ x: p[0], y: p[1], got: false, bob: i * 0.7, type: 'shard' }));
    this.abilityGem = { x: L.abilityAt[0], y: L.abilityAt[1], got: this.abilities[L.ability], bob: 1.2, type: L.ability };
    this.enemies = L.enemies.map((a) => this.makeEnemy(a));
    this.slimes = (L.slimes || []).map(([x, y, r]) => new SlimeEnemy(x, y, r, 3 + index));
    this.vents = (L.vents || []).map(([x, y, kind]) => ({ x, y, kind, phase: Math.random() * 6 }));
    this.torches = (L.torches || []).map((x) => ({ x, y: GROUND - 96 }));
    this.particles = [];
    this.arrows = [];
    this.portal = { x: 3170, y: GROUND - 110, w: 70, h: 110 };
    this.pig = index === 0 ? { x: 790, y: 264, w: 58, h: 48, vx: 18, min: 750, max: 820, dir: 1 } : null;
    this.camera = 0;
    this.prevCamera = 0;
    this.shake = 0;
    this.winTimer = 0;
    this.goo.clear();
    this.fluid.clear();
    this.light.setAmbient(L.ambient);
    this.buildSolidMask();
    setMusicContext(index, this.state === 'menu' ? 'menu' : 'play');
    this.updateHud();
  }

  makeEnemy(a) {
    const dims = a[0] === 'enderman' ? [34, 86] : a[0] === 'skeleton' ? [32, 64] : [32, 58];
    return {
      type: a[0], x: a[1], y: a[2], w: dims[0], h: dims[1], vx: a[3],
      min: a[4], max: a[5], hp: a[6], hit: 0, shoot: 1.4 + Math.random(), slow: 0,
    };
  }

  /** Растровая маска твёрдых тел всего уровня в разрешении сеток симуляции. */
  buildSolidMask() {
    const cell = this.fluid.cell;
    const mw = Math.ceil(WORLD / cell) + 4;
    const mh = Math.ceil(H / cell) + 4;
    const mask = new Uint8Array(mw * mh);
    const put = (s) => {
      const i0 = Math.max(0, Math.floor(s.x / cell));
      const i1 = Math.min(mw - 1, Math.ceil((s.x + s.w) / cell));
      const j0 = Math.max(0, Math.floor(s.y / cell));
      const j1 = Math.min(mh - 1, Math.ceil((s.y + s.h) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) mask[i + j * mw] = 1;
    };
    (this.platforms || []).forEach(put);
    (this.rocks || []).forEach((r) => { if (r.hp > 0) put(r); });
    this.solidMask = { mask, mw, mh, cell };
  }

  /** Копирование окна маски в сетки жидкости и света. */
  syncSolidWindow() {
    const sm = this.solidMask;
    if (!sm) return;
    const { mask, mw, mh, cell } = sm;
    const off = Math.floor(this.camera / cell);
    const f = this.fluid;
    for (let j = 0; j < f.ny; j++) {
      const mj = j - 1;
      for (let i = 0; i < f.nx; i++) {
        const mi = off + i - 1;
        const solid = mi >= 0 && mi < mw && mj >= 0 && mj < mh ? mask[mi + mj * mw] : 0;
        f.solid[i + j * f.nx] = solid;
      }
    }
    const l = this.light;
    const lcell = l.cell;
    const loff = this.camera / lcell;
    for (let j = 0; j < l.ny; j++) {
      const my = Math.floor(((j - 0.5) * lcell) / cell);
      for (let i = 0; i < l.nx; i++) {
        const mx = Math.floor(((i - 0.5 + loff * 1) * lcell) / cell);
        const solid = mx >= 0 && mx < mw && my >= 0 && my < mh ? mask[mx + my * mw] : 0;
        l.tr[i + j * l.nx] = solid ? 0.45 : 1;
      }
    }
  }

  /** Твёрдые тела рядом с камерой — для SPH и мягких тел. */
  nearSolids() {
    const c0 = this.camera - 300;
    const c1 = this.camera + W + 300;
    const out = [];
    for (const p of this.platforms) if (p.x < c1 && p.x + p.w > c0) out.push(p);
    for (const r of this.rocks) if (r.hp > 0 && r.x < c1 && r.x + r.w > c0) out.push(r);
    return out;
  }

  // ───────────────────────────── состояния ──────────────────────────────────
  start(levelIndex = 0, abilities = null) {
    initAudio();
    this.abilities = abilities || { jump: false, power: false, shield: false };
    this.loadLevel(levelIndex, false);
    this.state = 'playing';
    setMusicContext(this.levelIndex, 'play');
    this.dom.menu.classList.add('hidden');
    this.dom.hud.classList.remove('hidden');
    this.dom.endModal.classList.add('hidden');
    this.dom.pauseModal.classList.add('hidden');
    this.last = performance.now();
  }

  toMenu() {
    this.state = 'menu';
    setMusicContext(this.levelIndex, 'menu');
    this.dom.menu.classList.remove('hidden');
    this.dom.hud.classList.add('hidden');
    this.dom.pauseModal.classList.add('hidden');
    $('continueBtn').style.display = loadProgress() ? '' : 'none';
  }

  pause() {
    sfx('click');
    if (this.state === 'playing') {
      this.state = 'paused';
      setMusicContext(this.levelIndex, 'paused');
      this.dom.pauseModal.classList.remove('hidden');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      setMusicContext(this.levelIndex, 'play');
      this.dom.pauseModal.classList.add('hidden');
      this.last = performance.now();
    }
  }

  end(win) {
    if (this.state === 'ended') return;
    this.state = 'ended';
    if (win) { sfx('portal'); clearProgress(); }
    $('endTitle').textContent = win ? 'ГЛУБИНЫ ПРОЙДЕНЫ!' : 'ПОПРОБУЙ ЕЩЁ';
    $('endText').innerHTML = win
      ? 'Три уровня позади, три силы кристаллов собраны. <span class="scoreline">Среда покорена.</span>'
      : `Уровень ${this.levelIndex + 1} оказался крепким. Попробуй другой маршрут и береги сердца.`;
    setTimeout(() => this.dom.endModal.classList.remove('hidden'), 90);
  }

  // ───────────────────────────── частицы ────────────────────────────────────
  dust(x, y, color, n = 6, kind = 'chip', power = 1) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 190 * power, vy: (-Math.random() * 150 - 24) * power,
        life: 0.32 + Math.random() * 0.38, color, size: 2 + Math.random() * 5, kind,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 12,
        grav: kind === 'spark' ? 120 : 430,
      });
    }
  }

  gemBurst(x, y, color) {
    this.dust(x, y, color, 20, 'spark', 1.25);
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x, y, vx: (Math.random() - 0.5) * 55, vy: (Math.random() - 0.5) * 55,
        life: 0.45, color: '#efffff', size: 6 + Math.random() * 4, kind: 'star', rot: 0, vr: 0, grav: 0,
      });
    }
    if (settings.fluid) this.fluid.addDensity(x - this.camera, y, 0.5, 1, 0.95, 0.5, 2);
  }

  impactBurst(x, y, color, strong = false) {
    this.dust(x, y, color, strong ? 16 : 9, 'streak', strong ? 1.5 : 1);
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.18, color, size: strong ? 34 : 22, kind: 'ring', rot: 0, vr: 0, grav: 0 });
    if (strong) { this.hitStop = Math.max(this.hitStop, 0.075); this.flash(); }
    if (settings.fluid) {
      this.fluid.addVelocity(x - this.camera, y, (Math.random() - 0.5) * 60, -40, 2);
      this.fluid.addDensity(x - this.camera, y, 0.6, 0.6, 0.65, 0.35, 2);
    }
  }

  explode(x, y) {
    this.shake = Math.max(this.shake, 15);
    this.hitStop = Math.max(this.hitStop, 0.1);
    this.flash();
    sfx('explosion');
    this.dust(x, y, '#ffcf57', 26, 'spark', 2);
    this.dust(x, y, '#8a4b2f', 18, 'chip', 1.6);
    if (settings.fluid) {
      const sx = x - this.camera;
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        this.fluid.addVelocity(sx + Math.cos(a) * 12, y + Math.sin(a) * 12, Math.cos(a) * 260, Math.sin(a) * 260 - 40, 2);
      }
      this.fluid.addDensity(sx, y, 0.95, 0.62, 0.22, 3.2, 4);
      this.fluid.addDensity(sx, y - 10, 0.22, 0.2, 0.2, 2.4, 5);
    }
    if (settings.lighting) this.light.addLight(x - this.camera, y, 3.4, 2.2, 0.8, 5, 1);
    if (settings.goo) this.goo.splat(x, y, 8, 150, { hostile: true, life: 5 });
  }

  hurt(fromX) {
    const p = this.player;
    if (p.inv > 0) return;
    if (this.abilities.shield && p.shieldReady) {
      p.shieldReady = false;
      p.inv = 1;
      this.shake = 7;
      this.hitStop = 0.055;
      this.flash();
      sfx('hurt');
      this.gemBurst(p.x + 16, p.y + 30, '#d88cff');
      this.showToast('ЩИТ ПОГЛОТИЛ УДАР');
      this.updateHud();
      return;
    }
    p.hp--;
    p.inv = 1.35;
    p.vx = p.x < fromX ? -250 : 250;
    p.vy = -280;
    this.shake = 13;
    this.hitStop = 0.07;
    this.flash();
    sfx('hurt');
    this.impactBurst(p.x + 16, p.y + 30, '#e8515c', true);
    this.updateHud();
    if (p.hp <= 0) setTimeout(() => this.end(false), 250);
  }

  rects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ───────────────────────────── обновление ─────────────────────────────────
  update(dt) {
    if (this.state !== 'playing') {
      if (this.state === 'menu') this.updateAmbientSims(dt);
      return;
    }
    if (this.hitStop > 0) { this.hitStop -= dt; return; }
    this.time += dt;
    const L = LEVELS[this.levelIndex];
    const p = this.player;
    if (this.toastTimer > 0 && (this.toastTimer -= dt) <= 0) this.dom.toast.classList.remove('show');

    p.inv = Math.max(0, p.inv - dt);
    p.cool = Math.max(0, p.cool - dt);
    p.attack = Math.max(0, p.attack - dt);
    p.gooCool = Math.max(0, p.gooCool - dt);
    p.anim += dt * Math.abs(p.vx) * 0.04;

    // липкость под ногами замедляет героя (адгезия слизи)
    const sticky = settings.goo ? this.goo.stickiness(p.x + p.w / 2, p.y + p.h, 30) : 0;
    const accel = (p.ground ? PLAYER_ACCEL_GROUND : PLAYER_ACCEL_AIR) * (1 - 0.45 * sticky);
    const maxSpeed = (this.abilities.jump ? PLAYER_SPEED_BOOST : PLAYER_SPEED) * (1 - 0.4 * sticky);

    if (keys.left) { p.vx -= accel * dt; p.dir = -1; }
    if (keys.right) { p.vx += accel * dt; p.dir = 1; }
    if (!keys.left && !keys.right) p.vx *= Math.pow(p.ground ? 0.0008 : 0.08, dt);
    p.vx = clamp(p.vx, -maxSpeed, maxSpeed);

    if (keys.jump) {
      if (p.ground) {
        p.vy = JUMP_V * (1 - 0.18 * sticky);
        p.ground = false;
        p.airJump = true;
        sfx('jump');
        this.dust(p.x + 16, p.y + p.h, '#9eb3ad', 6, 'chip');
        if (settings.fluid) this.fluid.addVelocity(p.x + 16 - this.camera, p.y + p.h, 0, 140, 2);
      } else if (p.wall > 0) {            // прыжок от стены по слизи (адгезия)
        p.vy = JUMP_V * 0.92;
        p.vx = p.wall * 210;
        p.wall = 0;
        sfx('stick');
        if (settings.goo) this.goo.splat(p.x + 16, p.y + 30, 4, 60);
      } else if (this.abilities.jump && p.airJump) {
        p.vy = DOUBLE_JUMP_V;
        p.airJump = false;
        sfx('jump');
        this.gemBurst(p.x + 16, p.y + p.h, '#65ead8');
      }
    }
    keys.jump = false;

    if (keys.goo && p.gooCool <= 0 && settings.goo) {
      p.gooCool = 0.55;
      sfx('splat');
      const sx = p.x + p.w / 2 + p.dir * 18;
      for (let i = 0; i < 12; i++) {
        this.goo.spawn(sx, p.y + 28, p.dir * (190 + Math.random() * 120), -60 + Math.random() * 90, { life: 11 });
      }
      if (settings.fluid) this.fluid.addVelocity(sx - this.camera, p.y + 28, p.dir * 90, 0, 2);
    }
    keys.goo = false;

    if (keys.attack && p.cool <= 0) {
      p.attack = 0.23;
      p.cool = this.abilities.power ? 0.3 : 0.43;
      sfx('attack');
      this.shake = 3;
      const hit = { x: p.dir > 0 ? p.x + p.w : p.x - 48, y: p.y + 6, w: 48, h: 58 };
      const damage = this.abilities.power ? 2 : 1;
      let struck = false;
      let strongHit = false;

      if (settings.fluid) {   // взмах киркой закручивает воздух
        const sx = p.x + p.w / 2 + p.dir * 34 - this.camera;
        this.fluid.addVelocity(sx, p.y + 30, p.dir * 260, -60, 3);
        this.fluid.addVelocity(sx, p.y + 54, -p.dir * 120, 40, 2);
      }

      for (const r of this.rocks) {
        if (r.hp > 0 && this.rects(hit, r)) {
          r.hp -= damage;
          struck = true;
          strongHit = this.abilities.power || r.hp <= 0;
          sfx('break');
          this.impactBurst(r.x + r.w / 2, r.y + 28, this.abilities.power ? '#ffc85c' : '#91a4a2', strongHit);
          this.dust(r.x + r.w / 2, r.y + r.h / 2, '#596a6e', r.hp <= 0 ? 20 : 10, 'chip', r.hp <= 0 ? 1.5 : 1);
          if (settings.fluid) this.fluid.addDensity(r.x + r.w / 2 - this.camera, r.y + r.h / 2, 0.42, 0.44, 0.46, 1.5, 3);
          if (r.hp <= 0) { this.showToast('ПУТЬ РАСЧИЩЕН!'); this.buildSolidMask(); }
        }
      }
      for (const e of this.enemies) {
        if (e.hp > 0 && this.rects(hit, e)) {
          e.hp -= damage;
          e.hit = 0.18;
          e.vx = p.dir * 150;
          struck = true;
          strongHit = this.abilities.power || e.hp <= 0;
          this.impactBurst(e.x + 16, e.y + 24, this.abilities.power ? '#ffc85c' : '#8bd26b', strongHit);
          if (e.hp <= 0) {
            sfx('enemy');
            if (e.type === 'creeper') this.explode(e.x + 16, e.y + 30);
            else this.gemBurst(e.x + 16, e.y + 24, '#8bd26b');
          }
        }
      }
      for (const s of this.slimes) {
        if (s.dead) continue;
        const box = s.body.aabb();
        if (this.rects(hit, box)) {
          struck = true;
          strongHit = true;
          if (s.damage(damage, p.dir)) {
            sfx('splat');
            const [cx, cy] = s.center();
            if (settings.goo) this.goo.splat(cx, cy, 22, 170, { hostile: true, life: 10 });
            if (settings.fluid) this.fluid.addDensity(cx - this.camera, cy, 0.3, 0.9, 0.8, 2, 3);
            this.gemBurst(cx, cy, '#5ff2d6');
          } else {
            sfx('stick');
            if (settings.goo) this.goo.splat(s.center()[0], s.center()[1], 5, 110, { hostile: true, life: 6 });
          }
        }
      }
      if (struck) this.shake = Math.max(this.shake, strongHit ? 10 : 7);
    }
    keys.attack = false;

    // ── физика героя
    p.vy += GRAVITY * dt;
    const oldY = p.y;
    p.x += p.vx * dt;
    p.x = clamp(p.x, 0, WORLD - p.w);
    p.wall = Math.max(0, p.wall - dt);
    for (const r of this.rocks) {
      if (r.hp > 0 && this.rects(p, r)) {
        if (p.vx > 0) { p.x = r.x - p.w; p.wallSide = 1; }
        else if (p.vx < 0) { p.x = r.x + r.w; p.wallSide = -1; }
        p.vx = 0;
        // если на стене есть слизь — герой прилипает и медленно сползает
        if (settings.goo && !p.ground && this.goo.stickiness(p.x + p.w / 2, p.y + 30, 34) > 0.18) {
          p.wall = -Math.sign(p.wallSide || 1);
          p.vy = Math.min(p.vy, 42);
          p.airJump = true;
        }
      }
    }
    p.y += p.vy * dt;
    p.ground = false;
    const landSpeed = p.vy;
    for (const pl of this.platforms) {
      if (p.vy >= 0 && oldY + p.h <= pl.y + 8 && p.y + p.h >= pl.y && p.x + p.w > pl.x && p.x < pl.x + pl.w) {
        p.y = pl.y - p.h;
        p.vy = 0;
        p.ground = true;
        p.airJump = true;
      }
    }
    for (const r of this.rocks) {
      if (r.hp > 0 && p.vy >= 0 && oldY + p.h <= r.y + 6 && p.y + p.h >= r.y && p.x + p.w > r.x && p.x < r.x + r.w) {
        p.y = r.y - p.h;
        p.vy = 0;
        p.ground = true;
        p.airJump = true;
      }
    }
    if (p.ground && landSpeed > 420) {
      this.dust(p.x + 16, p.y + p.h, '#a8bdb6', 8, 'chip');
      if (settings.fluid) {
        this.fluid.addVelocity(p.x + 16 - this.camera, p.y + p.h - 4, 0, -60, 3);
        this.fluid.addDensity(p.x + 16 - this.camera, p.y + p.h - 6, 0.5, 0.5, 0.5, 0.7, 2);
      }
    }
    if (p.y > H + 100) {
      this.hurt(p.x + 100);
      p.x = Math.max(40, p.x - 140);
      p.y = 100;
      p.vy = 0;
    }

    // ── вода: всплеск + пар
    p.wet = Math.max(0, p.wet - dt);
    for (const w of this.waters) {
      if (p.x + p.w > w.x && p.x < w.x + w.w && p.y + p.h > w.y) {
        if (p.wet <= 0) {
          sfx('splash');
          this.dust(p.x + 16, w.y, '#8fdcff', 14, 'spark', 1.2);
          if (settings.fluid) {
            this.fluid.addVelocity(p.x + 16 - this.camera, w.y - 6, 0, -180, 3);
            this.fluid.addDensity(p.x + 16 - this.camera, w.y - 10, 0.75, 0.92, 1, 1.8, 3);
          }
        }
        p.wet = 0.6;
        p.vy *= 0.82;                    // сопротивление воды
        p.vx *= 0.9;
      }
    }

    // ── кристаллы
    for (const g of this.gems) {
      g.bob += dt * 3;
      if (!g.got && Math.hypot(p.x + 16 - g.x, p.y + 34 - g.y) < 38) {
        g.got = true;
        p.gems++;
        sfx('gem');
        this.gemBurst(g.x, g.y, '#62ead8');
        this.updateHud();
        this.showToast(p.gems >= L.need ? 'ПОРТАЛ АКТИВИРОВАН!' : `ОСКОЛОК ${p.gems}/${L.need}`);
      }
    }
    this.abilityGem.bob += dt * 2.5;
    if (!this.abilityGem.got && Math.hypot(p.x + 16 - this.abilityGem.x, p.y + 34 - this.abilityGem.y) < 43) {
      this.abilityGem.got = true;
      this.abilities[L.ability] = true;
      if (L.ability === 'shield') p.shieldReady = true;
      const names = { jump: 'ДВОЙНОЙ ПРЫЖОК', power: 'УСИЛЕННАЯ КИРКА', shield: 'КРИСТАЛЬНЫЙ ЩИТ' };
      const color = L.ability === 'jump' ? '#65ead8' : L.ability === 'power' ? '#ffc85c' : '#d88cff';
      sfx('gem');
      this.gemBurst(this.abilityGem.x, this.abilityGem.y, color);
      this.hitStop = 0.08;
      this.flash();
      this.showToast('НОВАЯ СИЛА: ' + names[L.ability]);
      this.updateHud();
    }

    if (this.pig) {
      this.pig.x += this.pig.vx * dt;
      if (this.pig.x < this.pig.min || this.pig.x > this.pig.max) {
        this.pig.vx *= -1;
        this.pig.dir = this.pig.vx > 0 ? 1 : -1;
        this.pig.x = clamp(this.pig.x, this.pig.min, this.pig.max);
      }
    }

    // ── обычные враги
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.hit = Math.max(0, e.hit - dt);
      const eSticky = settings.goo ? this.goo.stickiness(e.x + e.w / 2, e.y + e.h, 26) : 0;
      e.x += e.vx * dt * (1 - 0.7 * eSticky);
      if (e.x < e.min || e.x > e.max) {
        e.vx *= -1;
        e.x = clamp(e.x, e.min, e.max);
      }
      if (e.type === 'skeleton') {
        e.shoot -= dt;
        if (e.shoot <= 0 && Math.abs(p.x - e.x) < 500) {
          e.shoot = Math.max(1.25, 2.25 - this.levelIndex * 0.35);
          this.arrows.push({
            x: e.x, y: e.y + 22,
            vx: p.x < e.x ? -250 - this.levelIndex * 25 : 250 + this.levelIndex * 25,
            w: 24, h: 5,
          });
        }
      }
      if (this.rects(p, e)) this.hurt(e.x);
    }

    // ── слизни (мягкие тела)
    if (settings.softbody) {
      const solids = this.nearSolids();
      for (const s of this.slimes) {
        if (s.dead) continue;
        const [cx, cy] = s.center();
        if (cx < this.camera - 400 || cx > this.camera + W + 400) continue;
        const flow = settings.fluid ? this.fluid.sample(cx - this.camera, cy)[0] * 0.4 : 0;
        s.update(dt, solids, flow);
        if (settings.goo && Math.random() < dt * 1.1) {
          this.goo.spawn(cx + (Math.random() - 0.5) * s.r, cy + s.r * 0.6, 0, 40, { hostile: true, life: 4 });
        }
        const box = s.body.aabb();
        if (this.rects(p, box)) this.hurt(cx);
      }
      this.slimes = this.slimes.filter((s) => !s.dead);
    }

    // ── стрелы и частицы
    for (const a of this.arrows) {
      a.x += a.vx * dt;
      if (this.rects(p, a)) { this.hurt(a.x); a.dead = true; }
    }
    this.arrows = this.arrows.filter((a) => !a.dead && a.x > this.camera - 100 && a.x < this.camera + W + 100);

    for (const q of this.particles) {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += (q.grav ?? 430) * dt;
      if (settings.fluid && q.kind !== 'ring') {
        const [fu, fv] = this.fluid.sample(q.x - this.camera, q.y);
        q.vx += fu * 3 * dt;
        q.vy += fv * 3 * dt;
      }
      q.rot = (q.rot || 0) + (q.vr || 0) * dt;
      q.life -= dt;
    }
    this.particles = this.particles.filter((q) => q.life > 0);

    // ── портал и переход
    if (this.rects(p, this.portal)) {
      if (p.gems >= L.need) this.winTimer += dt;
      else if (this.winTimer <= 0) this.showToast(`НУЖНО ЕЩЁ ${L.need - p.gems} ОСКОЛКОВ`);
      if (p.gems >= L.need && this.winTimer > 0.55) {
        this.state = 'transition';
        sfx('portal');
        if (this.levelIndex < LEVELS.length - 1) {
          const next = this.levelIndex + 1;
          saveProgress({ levelIndex: next, abilities: this.abilities });
          this.fadeScene(() => {
            this.loadLevel(next, true);
            this.state = 'playing';
            setMusicContext(next, 'play');
            this.showToast(`УРОВЕНЬ ${next + 1}: ${LEVELS[next].name}`);
          });
          return;
        }
        this.fadeScene(() => this.end(true));
      }
    } else this.winTimer = 0;

    const target = clamp(p.x - W * 0.38, 0, WORLD - W);
    this.camera += (target - this.camera) * Math.min(1, dt * 5.5);
    this.shake *= Math.pow(0.02, dt);

    // бег героя тянет за собой воздух
    if (settings.fluid && Math.abs(p.vx) > 40) {
      this.fluid.addVelocity(p.x + 16 - this.camera, p.y + 40, p.vx * 0.5, -12, 2);
    }
    this.updateSims(dt);
    this.updateHud();
  }

  /** Фоновая симуляция в меню — красивый дым за интерфейсом. */
  updateAmbientSims(dt) {
    this.time += dt;
    if (settings.fluid) {
      for (let i = 0; i < 3; i++) {
        const x = 160 + i * 320 + Math.sin(this.time * 0.6 + i) * 60;
        this.fluid.addDensity(x, H - 20, 0.35 + i * 0.2, 0.9, 0.95, 0.9, 3);
        this.fluid.addVelocity(x, H - 20, Math.sin(this.time + i) * 30, -120, 2);
      }
      this.fluid.step(dt);
    }
  }

  /** Эмиттеры среды + шаги решателей. */
  updateSims(dt) {
    const t0 = performance.now();
    const dCam = this.camera - this.prevCamera;
    this.prevCamera = this.camera;

    if (settings.fluid || settings.lighting) this.syncSolidWindow();

    if (settings.fluid) {
      this.fluid.shiftByCamera(dCam);
      for (const v of this.vents) {
        const sx = v.x - this.camera;
        if (sx < -60 || sx > W + 60) continue;
        v.phase += dt;
        const pulse = 0.55 + 0.45 * Math.sin(v.phase * 1.7);
        if (v.kind === 'steam') {
          this.fluid.addDensity(sx, v.y, 0.62, 0.9, 1, 1.5 * pulse, 2);
          this.fluid.addVelocity(sx, v.y, Math.sin(v.phase * 2.1) * 26, -150 * pulse, 2);
        } else if (v.kind === 'lava') {
          this.fluid.addDensity(sx, v.y, 1, 0.45, 0.2, 1.7 * pulse, 2);
          this.fluid.addVelocity(sx, v.y, Math.sin(v.phase * 1.3) * 20, -190 * pulse, 2);
          if (settings.lighting) this.light.addLight(sx, v.y - 20, 1.5 * pulse, 0.55 * pulse, 0.15, 3, dt * 5);
        } else {
          this.fluid.addDensity(sx, v.y, 0.22, 0.21, 0.24, 1.8 * pulse, 3);
          this.fluid.addVelocity(sx, v.y, Math.sin(v.phase) * 18, -90 * pulse, 2);
        }
      }
      for (const w of this.waters) {              // туман над водой
        const sx = w.x + w.w / 2 - this.camera;
        if (sx < -80 || sx > W + 80) continue;
        this.fluid.addDensity(sx + Math.sin(this.time * 1.3) * w.w * 0.3, w.y - 4, 0.7, 0.88, 1, 0.5, 3);
        this.fluid.addVelocity(sx, w.y - 6, 0, -32, 3);
      }
      for (const tr of this.torches) {            // дым и тепло факелов
        const sx = tr.x - this.camera;
        if (sx < -40 || sx > W + 40) continue;
        this.fluid.addDensity(sx, tr.y - 6, 0.95, 0.6, 0.28, 0.55, 1);
        this.fluid.addVelocity(sx, tr.y - 6, Math.sin(this.time * 3 + tr.x) * 14, -110, 1);
      }
      this.fluid.step(dt);
    }

    if (settings.goo) {
      this.goo.update(dt, {
        solids: this.nearSolids(),
        fluid: settings.fluid ? this.fluid : null,
        camera: this.camera,
        viewW: W,
      });
    }

    if (settings.lighting) {
      const L = LEVELS[this.levelIndex];
      this.light.setAmbient(L.ambient);
      this.light.shiftByCamera(dCam);
      for (const tr of this.torches) {
        const sx = tr.x - this.camera;
        if (sx < -60 || sx > W + 60) continue;
        const flick = 0.85 + 0.15 * Math.sin(this.time * 11 + tr.x);
        this.light.addLight(sx, tr.y, 2.6 * flick, 1.5 * flick, 0.5, 3, dt * 6);
      }
      for (const g of this.gems) {
        if (g.got) continue;
        const sx = g.x - this.camera;
        if (sx < -40 || sx > W + 40) continue;
        this.light.addLight(sx, g.y, 0.5, 1.5, 1.35, 2, dt * 4);
      }
      if (!this.abilityGem.got) {
        const sx = this.abilityGem.x - this.camera;
        if (sx > -60 && sx < W + 60) this.light.addLight(sx, this.abilityGem.y, 1.4, 1.1, 2.2, 3, dt * 5);
      }
      if (this.player) {
        this.light.addLight(this.player.x + 16 - this.camera, this.player.y + 30, 1.1, 1.35, 1.5, 3, dt * 4);
      }
      const portalOn = this.player && this.player.gems >= LEVELS[this.levelIndex].need;
      const psx = this.portal.x + 35 - this.camera;
      if (psx > -80 && psx < W + 80) {
        this.light.addLight(psx, this.portal.y + 55, portalOn ? 1.2 : 0.2, portalOn ? 2.6 : 0.5, portalOn ? 2.4 : 0.5, 4, dt * 5);
      }
      this.light.step(dt, settings.quality >= 1.5 ? 3 : 2);
    }
    this.simMs = this.simMs * 0.9 + (performance.now() - t0) * 0.1;
  }

  // ───────────────────────────── отрисовка ──────────────────────────────────
  render() {
    const ctx = this.ctx;
    const L = LEVELS[this.levelIndex];
    ctx.save();
    ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);

    drawBackground(ctx, L, this.levelIndex, this.camera, this.time);
    this.drawScenery(L);
    this.waters.forEach((w) => this.drawWater(w, L));
    this.platforms.forEach((p) => this.drawTile(p, L));
    this.gems.forEach((g) => this.drawGem(g));
    this.drawGem(this.abilityGem);
    this.rocks.forEach((r) => this.drawRock(r, L));

    if (settings.goo) this.goo.render(ctx, this.camera, W, H);

    this.drawPortal();
    if (this.pig) this.drawPigEntity();
    this.arrows.forEach((a) => {
      this.px(a.x - this.camera, a.y, a.w, a.h, '#d9d1a8');
      this.px(a.x - this.camera + (a.vx > 0 ? a.w : 0), a.y - 3, 4, 11, '#7a6644');
    });
    this.enemies.forEach((e) => this.drawEnemy(e));
    if (settings.softbody) this.slimes.forEach((s) => s.draw(ctx, this.camera, this.time, assets.slime));
    if (this.player && this.state !== 'menu') this.drawPlayer();
    this.particles.forEach((q) => this.drawParticle(q));

    if (settings.fluid) this.fluid.render(ctx, settings.bloom);
    if (settings.lighting) this.light.render(ctx);
    if (settings.bloom) this.drawBloom();

    ctx.globalAlpha = 1;
    ctx.restore();

    if (this.state === 'menu') this.drawMenuScene();
    if (this.showDiag) this.drawDiag();
  }

  px(x, y, w, h, c) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  drawTile(p, L) {
    const x = p.x - this.camera;
    if (x > W || x + p.w < 0) return;
    const img = tile(L.tile);
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.round(x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
    ctx.clip();
    const startX = Math.floor(x / TILE) * TILE;
    for (let xx = startX; xx < x + p.w; xx += TILE) {
      for (let yy = p.y; yy < p.y + p.h; yy += TILE) ctx.drawImage(img, Math.round(xx), Math.round(yy), TILE, TILE);
    }
    ctx.restore();
  }

  drawRock(r, L) {
    if (r.hp <= 0) return;
    const x = r.x - this.camera;
    if (x > W || x + r.w < 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, r.y, r.w, r.h);
    ctx.clip();
    const img = tile(L.tile === 'grass' ? 'stone' : L.tile);
    for (let xx = x; xx < x + r.w; xx += TILE) {
      for (let yy = r.y; yy < r.y + r.h; yy += TILE) ctx.drawImage(img, Math.round(xx), Math.round(yy), TILE, TILE);
    }
    ctx.restore();
    const dmg = 1 - r.hp / r.maxHp;
    if (dmg > 0.3) {
      this.px(x + r.w * 0.45, r.y + 8, 3, r.h - 16, '#20282a');
      if (dmg > 0.6) this.px(x + 8, r.y + r.h * 0.55, r.w * 0.5, 3, '#20282a');
    }
  }

  drawWater(w, L) {
    const x = w.x - this.camera;
    if (x > W || x + w.w < 0) return;
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, w.y, 0, H);
    grad.addColorStop(0, L.water + 'aa');
    grad.addColorStop(1, L.water + 'dd');
    ctx.fillStyle = grad;
    ctx.fillRect(x, w.y, w.w, w.h);
    const surf = this.levelIndex === 2 ? '#cf61c7' : '#76d9ff';
    for (let i = 0; i < w.w; i += 6) {
      const yy = w.y + Math.sin(this.time * 2.4 + (w.x + i) * 0.05) * 2.5;
      this.px(x + i, yy, 6, 4, surf);
    }
  }

  drawScenery(L) {
    const ctx = this.ctx;
    for (const tr of this.torches) {
      const x = tr.x - this.camera;
      if (x < -40 || x > W + 40) continue;
      const img = torch();
      ctx.drawImage(img, Math.round(x), Math.round(tr.y), 22, 55);
      const flick = 0.6 + 0.4 * Math.sin(this.time * 9 + tr.x);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 * flick;
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(x + 11, tr.y + 8, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawGem(g) {
    if (!g || g.got) return;
    const x = g.x - this.camera;
    if (x < -60 || x > W + 60) return;
    const y = g.y + Math.sin(g.bob) * 5;
    const isCore = g.type !== 'shard';
    const color = g.type === 'power' ? '#ffc85c' : g.type === 'shield' ? '#d88cff' : '#65ead8';
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, isCore ? 34 : 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const img = crystal(color, isCore ? 34 : 24, isCore ? 60 : 38);
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
  }

  drawEnemy(e) {
    if (e.hp <= 0) return;
    const x = e.x - this.camera;
    if (x < -80 || x > W + 80) return;
    const ctx = this.ctx;
    ctx.save();
    if (e.hit > 0) ctx.globalAlpha = 0.5;
    ctx.translate(Math.round(x), Math.round(e.y));
    if (e.vx < 0) { ctx.translate(e.w, 0); ctx.scale(-1, 1); }
    (CREATURES[e.type] || CREATURES.zombie)(ctx, e.w, e.h, this.time + e.x);
    ctx.restore();
  }

  drawPigEntity() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(this.pig.x - this.camera), Math.round(this.pig.y));
    if (this.pig.dir < 0) { ctx.translate(this.pig.w, 0); ctx.scale(-1, 1); }
    drawPig(ctx, this.pig.w, this.pig.h);
    ctx.restore();
  }

  drawPlayer() {
    const p = this.player;
    const ctx = this.ctx;
    const x = p.x - this.camera;
    const bob = p.ground ? Math.sin(p.anim) * 1.5 : 0;
    const moving = Math.abs(p.vx) > 18;
    const frames = assets.hero;
    const img = frames.length ? frames[moving ? 1 + (Math.floor(p.anim * 1.35) % (frames.length - 1)) : 0] : null;
    ctx.save();
    if (p.inv > 0 && Math.floor(p.inv * 12) % 2) ctx.globalAlpha = 0.35;
    if (this.abilities.shield && p.shieldReady) {
      ctx.globalAlpha = 0.26 + 0.11 * Math.sin(this.time * 7);
      ctx.strokeStyle = '#e7adff';
      ctx.lineWidth = 5;
      ctx.strokeRect(Math.round(x - 10), Math.round(p.y - 7), 52, 84);
      ctx.globalAlpha = 1;
    }
    if (img) {
      const h = 80;
      const w = (img.width / img.height) * h;
      ctx.save();
      if (p.dir < 0) {
        ctx.translate(Math.round(x + p.w / 2 + w / 2), Math.round(p.y + p.h - h + bob));
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, w, h);
      } else {
        ctx.drawImage(img, Math.round(x + p.w / 2 - w / 2), Math.round(p.y + p.h - h + bob), w, h);
      }
      ctx.restore();
    } else {
      this.px(x, p.y, p.w, p.h, '#2f8f86');
    }
    if (p.attack > 0) {
      ctx.translate(Math.round(x + p.w / 2 + p.dir * 19), Math.round(p.y + 32));
      ctx.scale(p.dir, 1);
      ctx.rotate(-0.95 + p.attack * 5);
      ctx.drawImage(icon('pickaxe', 3), -10, -30);
    }
    ctx.restore();
  }

  drawPortal() {
    const x = this.portal.x - this.camera;
    if (x < -120 || x > W + 120) return;
    const y = this.portal.y;
    const active = this.player && this.player.gems >= LEVELS[this.levelIndex].need;
    this.px(x, y, 16, this.portal.h, '#465255');
    this.px(x + 54, y, 16, this.portal.h, '#465255');
    this.px(x + 16, y, 38, 15, '#59676a');
    const ctx = this.ctx;
    ctx.fillStyle = active ? '#4ce3ce' : '#1b2a2d';
    ctx.fillRect(x + 16, y + 15, 38, 95);
    if (active) {
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.2 * Math.sin(this.time * 6);
      ctx.fillStyle = '#7af6e1';
      ctx.fillRect(x + 21, y + 20, 28, 85);
      ctx.restore();
      for (let i = 0; i < 4; i++) {
        this.px(x + 24 + ((i * 11 + this.time * 20) % 25), y + 28 + ((i * 23 + this.time * 25) % 70), 3, 8, '#d7fff7');
      }
    }
  }

  drawParticle(p) {
    const ctx = this.ctx;
    const x = p.x - this.camera;
    if (x < -40 || x > W + 40) return;
    const a = clamp(p.life * 2.8, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(Math.round(x), Math.round(p.y));
    ctx.rotate(p.rot || 0);
    ctx.fillStyle = p.color;
    if (p.kind === 'spark') {
      ctx.fillRect(-p.size * 1.7, -1, p.size * 3.4, 2);
      ctx.fillRect(-1, -p.size * 1.7, 2, p.size * 3.4);
    } else if (p.kind === 'star') {
      ctx.fillRect(-p.size / 2, -1, p.size, 2);
      ctx.fillRect(-1, -p.size / 2, 2, p.size);
    } else if (p.kind === 'streak') {
      ctx.fillRect(-p.size * 2, -1, p.size * 4, 3);
    } else if (p.kind === 'ring') {
      const s = p.size + (0.2 - p.life) * 120;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(-s / 2, -s / 2, s, s);
    } else {
      ctx.beginPath();
      ctx.moveTo(-p.size, -p.size * 0.45);
      ctx.lineTo(p.size * 0.65, -p.size);
      ctx.lineTo(p.size, p.size * 0.6);
      ctx.lineTo(-p.size * 0.6, p.size);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** Аддитивное свечение кристаллов и портала поверх слоя света. */
  drawBloom() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, color, alpha) => {
      if (x < -r || x > W + r) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const g of this.gems) {
      if (g.got) continue;
      glow(g.x - this.camera, g.y + Math.sin(g.bob) * 5, 40, '#62ead8', 0.3);
    }
    if (!this.abilityGem.got) {
      const color = this.abilityGem.type === 'power' ? '#ffc85c' : this.abilityGem.type === 'shield' ? '#d88cff' : '#65ead8';
      glow(this.abilityGem.x - this.camera, this.abilityGem.y, 62, color, 0.42);
    }
    const active = this.player && this.player.gems >= LEVELS[this.levelIndex].need;
    if (active) glow(this.portal.x + 35 - this.camera, this.portal.y + 55, 90, '#4ce3ce', 0.4);
    for (const tr of this.torches) glow(tr.x - this.camera + 11, tr.y + 8, 46, '#ffb347', 0.3 + 0.08 * Math.sin(this.time * 9 + tr.x));
    ctx.restore();
  }

  drawMenuScene() {
    const ctx = this.ctx;
    for (let i = 0; i < 7; i++) {
      const x = 54 + i * 150;
      const y = 380 + Math.sin(this.time * 1.5 + i) * 14;
      const img = crystal(i % 2 ? '#65ead8' : '#ffc85c', 22, 34);
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(img, x, y);
      ctx.restore();
    }
  }

  drawDiag() {
    const f = this.fluid;
    const lines = [
      `FPS ${this.fps.toFixed(0)}   SIM ${this.simMs.toFixed(1)} мс`,
      `Навье–Стокс ${f.nx - 2}×${f.ny - 2} (${settings.fluid ? 'вкл' : 'выкл'}), проекций ${f.iters}`,
      `Свет ${this.light.nx - 2}×${this.light.ny - 2} (${settings.lighting ? 'вкл' : 'выкл'})`,
      `SPH-частиц ${this.goo.count}/${this.goo.max}`,
      `Мягких тел ${this.slimes.length}, частиц ${this.particles.length}`,
      `Камера ${this.camera.toFixed(0)} px   качество ×${settings.quality}`,
    ];
    this.dom.diag.textContent = lines.join('\n');
  }

  // ───────────────────────────── цикл ───────────────────────────────────────
  loop = (now) => {
    const dt = Math.min(0.033, (now - this.last) / 1000 || 0);
    this.last = now;
    this.fps = this.fps * 0.92 + (1 / Math.max(dt, 1e-4)) * 0.08;
    if (this.state === 'menu') this.time += dt;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  };

  run() {
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }
}
