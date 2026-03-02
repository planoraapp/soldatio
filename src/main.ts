import { Game } from './engine/Game';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

if (!canvas) {
    throw new Error('Canvas element #gameCanvas not found!');
}

const game = new Game(canvas);
// Start the engine
game.start();

// Bind UI Buttons
game.gui.bindButton('btn-start', () => {
    game.state = 'PLAYING';
    game.gui.setScreen('NONE');
    console.log("🎮 Game Started!");
});

game.gui.bindButton('btn-resume', () => {
    game.togglePause();
});

game.gui.bindButton('btn-leave', () => {
    if (confirm("Deseja realmente sair da partida?")) {
        game.state = 'MAIN_MENU';
        game.gui.setScreen('MAIN_MENU');
        // Reset player? Optional.
    }
});

game.gui.bindButton('btn-exit', () => {
    window.close();
    // Some browsers block window.close() unless opened by script, 
    // but this is the requested behavior.
});

console.log('🎮 Soldat Web v0.1 — UI Ready!');
console.log('  S — Crouch');
