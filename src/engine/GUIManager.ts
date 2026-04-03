export type GameUIState = 'MAIN_MENU' | 'PLAYING' | 'PAUSED' | 'NONE';

/**
 * Manages the HTML/CSS UI overlay for menus.
 */
export class GUIManager {
    private mainScreen: HTMLElement | null;

    constructor() {
        this.mainScreen = document.getElementById('main-menu');
    }

    setScreen(state: GameUIState): void {
        // Hide Main Menu
        this.mainScreen?.classList.add('hidden');

        // Show if requested
        if (state === 'MAIN_MENU') {
            this.mainScreen?.classList.remove('hidden');
        }
        
        // Note: 'PAUSED' (ESC) and 'G-MENU' are now rendered in HUD.ts 
        // on the 2D canvas for better visual sync with the game world.
    }

    /** Helper for button clicks */
    bindButton(id: string, callback: () => void): void {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = (e) => {
                e.stopPropagation();
                callback();
            };
        }
    }
}
