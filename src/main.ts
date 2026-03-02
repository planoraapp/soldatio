import { Game } from './engine/Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

if (!canvas) {
    throw new Error('Canvas element #game-canvas not found!');
}

const game = new Game(canvas);
game.start();

console.log('%c🎮 Soldat Web v0.1 — Ready!', 'color: #4af; font-size: 14px; font-weight: bold;');
console.log('%cControls:', 'color: #aaa; font-size: 12px;');
console.log('  A/D — Move left/right');
console.log('  W — Jump');
console.log('  Right-click (hold) — Jetpack');
console.log('  Left-click — Shoot');
console.log('  1-5 — Switch weapons');
console.log('  R — Reload');
console.log('  S — Crouch');
