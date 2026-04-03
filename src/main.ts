import { Game } from './engine/Game';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const hudCanvas = document.getElementById('hudCanvas') as HTMLCanvasElement;

if (!canvas || !hudCanvas) {
    throw new Error('Canvas elements not found!');
}

const game = new Game(canvas, hudCanvas);
game.audio.playMusic('/assets/intro.mp3');
game.start();

// Bind UI Buttons
game.gui.bindButton('btn-start', () => {
    const nameInput = document.getElementById('player-name') as HTMLInputElement;
    const rawValue = nameInput?.value || "";
    const playerName = rawValue.trim().toUpperCase() || 'GUEST_AGENT';
    
    console.log(`🎮 Mission Start - Input: "${rawValue}" -> Final: "${playerName}"`);
    game.player.name = playerName;

    const modeSelect = document.getElementById('game-mode') as HTMLSelectElement;
    if (modeSelect) {
        game.setGameMode(modeSelect.value as any);
    }
    game.state = 'PLAYING';
    game.gui.setScreen('NONE');
    game.audio.playMusic('/assets/war.mp3');
    console.log(`🎮 Mission Started - Agent: ${game.player.name}`);
});

game.gui.bindButton('btn-online', () => {
    const btn = document.getElementById('btn-online');
    if (btn) {
        const originalText = btn.innerText;
        btn.innerText = "EM DESENVOLVIMENTO...";
        setTimeout(() => { btn.innerText = originalText; }, 2000);
    }
});

game.gui.bindButton('btn-settings', () => {
   // Toggle ESC menu in HUD? Or show a browser alert
   alert("Opções avançadas serão adicionadas na próxima versão.");
});

console.log('🎮 Soldat Web v0.2.0 — Agents of Combat Ready!');
