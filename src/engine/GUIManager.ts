export type GameUIState = 'MAIN_MENU' | 'PLAYING' | 'PAUSED' | 'NONE';

/**
 * Manages the HTML/CSS UI overlay for menus.
 */
export class GUIManager {
    private mainScreen: HTMLElement | null;
    private pauseScreen: HTMLElement | null;

    constructor() {
        this.mainScreen = document.getElementById('main-menu');
        this.pauseScreen = document.getElementById('pause-menu');
    }

    setScreen(state: GameUIState): void {
        // Hide all first
        this.mainScreen?.classList.add('hidden');
        this.pauseScreen?.classList.add('hidden');

        // Show requested
        if (state === 'MAIN_MENU') {
            this.mainScreen?.classList.remove('hidden');
        } else if (state === 'PAUSED') {
            this.pauseScreen?.classList.remove('hidden');
        }
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
