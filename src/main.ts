import { Game } from './engine/Game';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

if (!canvas) {
    throw new Error('Canvas element #gameCanvas not found!');
}

const game = new Game(canvas);
// Start the engine
game.start();

// Exposto para depuração no console
(window as any).game = game;

// Log de erros fatais do loop (depuração)
window.addEventListener('error', (e) => {
    (window as any).__lastError = `${e.message} @ ${e.filename}:${e.lineno}`;
    console.error('FATAL:', (window as any).__lastError);
});

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
