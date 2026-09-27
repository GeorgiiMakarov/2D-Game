import { initInput } from './core/input.js';
import { Game } from './game/game.js';

const canvas = document.getElementById('game');
initInput();
const game = new Game(canvas);
game.run();

// удобно для отладки из консоли
window.game = game;
