// 100% процедурный звук на Web Audio API: музыка-арпеджио + SFX.
const audio = { ctx: null, master: null, music: null, sfx: null, on: true, timer: null, step: 0 };
let levelIndex = 0;
let musicMood = 'menu';

export function initAudio() {
  if (!audio.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.music = audio.ctx.createGain();
    audio.sfx = audio.ctx.createGain();
    audio.master.gain.value = 0.72;
    audio.music.gain.value = 0.2;
    audio.sfx.gain.value = 0.58;
    audio.music.connect(audio.master);
    audio.sfx.connect(audio.master);
    audio.master.connect(audio.ctx.destination);
    audio.timer = setInterval(musicTick, 155);
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
}

export function setMusicContext(level, mood) {
  levelIndex = level;
  musicMood = mood;
}

function synth(freq, dur, type = 'square', vol = 0.08, delay = 0, to = freq) {
  if (!audio.on || !audio.ctx) return;
  const t = audio.ctx.currentTime + delay;
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(35, freq), t);
  o.frequency.exponentialRampToValueAtTime(Math.max(35, to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(audio.sfx);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur = 0.12, vol = 0.09, cut = 1200) {
  if (!audio.on || !audio.ctx) return;
  const len = Math.ceil(audio.ctx.sampleRate * dur);
  const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audio.ctx.createBufferSource();
  const f = audio.ctx.createBiquadFilter();
  const g = audio.ctx.createGain();
  src.buffer = buf;
  f.type = 'lowpass';
  f.frequency.value = cut;
  g.gain.value = vol;
  src.connect(f);
  f.connect(g);
  g.connect(audio.sfx);
  src.start();
}

const FX = {
  click: () => { synth(430, 0.045, 'square', 0.055); synth(650, 0.04, 'square', 0.04, 0.035); },
  jump: () => synth(210, 0.14, 'square', 0.075, 0, 510),
  gem: () => { synth(660, 0.08, 'triangle', 0.08); synth(880, 0.1, 'triangle', 0.07, 0.07); synth(1320, 0.14, 'triangle', 0.055, 0.14); },
  break: () => { noise(0.16, 0.13, 1050); synth(105, 0.1, 'square', 0.05, 0, 62); },
  hurt: () => { synth(190, 0.22, 'sawtooth', 0.12, 0, 65); noise(0.1, 0.07, 700); },
  enemy: () => { synth(300, 0.08, 'square', 0.08); synth(220, 0.08, 'square', 0.07, 0.07); synth(150, 0.14, 'square', 0.06, 0.14); },
  portal: () => { synth(180, 0.5, 'sine', 0.09, 0, 920); synth(360, 0.45, 'triangle', 0.06, 0.1, 1440); },
  attack: () => { noise(0.055, 0.055, 2500); synth(120, 0.06, 'square', 0.04); },
  explosion: () => { noise(0.38, 0.2, 520); synth(90, 0.35, 'sawtooth', 0.1, 0, 38); },
  // новые: вязкая слизь и всплеск жидкости
  splat: () => { noise(0.18, 0.12, 380); synth(150, 0.16, 'sine', 0.06, 0, 58); },
  splash: () => { noise(0.26, 0.09, 1800); synth(520, 0.18, 'sine', 0.035, 0.02, 180); },
  stick: () => { synth(300, 0.1, 'sine', 0.05, 0, 120); noise(0.08, 0.05, 600); },
  steam: () => noise(0.42, 0.045, 3200),
};

export function sfx(name) {
  initAudio();
  if (!audio.on) return;
  (FX[name] || FX.click)();
}

function musicTick() {
  if (!audio.on || !audio.ctx || audio.ctx.state !== 'running') return;
  const seq = [
    [220, 277, 330, 440, 330, 277, 247, 330],
    [165, 220, 247, 330, 247, 220, 185, 247],
    [146, 185, 220, 293, 220, 185, 164, 220],
  ][levelIndex] || [];
  const f = seq[audio.step++ % seq.length];
  const t = audio.ctx.currentTime;
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.type = 'square';
  o.frequency.value = f * (musicMood === 'menu' ? 0.5 : 1);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(musicMood === 'paused' ? 0.008 : 0.035, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  o.connect(g);
  g.connect(audio.music);
  o.start(t);
  o.stop(t + 0.14);
  if (audio.step % 4 === 1) {
    const b = audio.ctx.createOscillator();
    const bg = audio.ctx.createGain();
    b.type = 'triangle';
    b.frequency.value = f / 2;
    bg.gain.setValueAtTime(0.022, t);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    b.connect(bg);
    bg.connect(audio.music);
    b.start(t);
    b.stop(t + 0.43);
  }
}

export function setSound(on) {
  audio.on = on;
  // контекст создаём только по жесту пользователя (иначе браузер ругается на autoplay);
  // здесь лишь возобновляем уже существующий
  if (on && audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
  if (audio.master && audio.ctx) {
    audio.master.gain.setTargetAtTime(on ? 0.72 : 0.0001, audio.ctx.currentTime, 0.025);
  }
}

export const soundOn = () => audio.on;
