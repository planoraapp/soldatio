export class Input {
    private keys: Set<string> = new Set();
    private keysJustPressed: Set<string> = new Set();
    private keysJustReleased: Set<string> = new Set();

    mouseX: number = 0;
    mouseY: number = 0;
    mouseWorldX: number = 0;
    mouseWorldY: number = 0;
    mouseLeft: boolean = false;
    mouseRight: boolean = false;
    mouseLeftJustPressed: boolean = false;
    mouseRightJustPressed: boolean = false;

    private canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        window.addEventListener('keydown', (e) => {
            if (!this.keys.has(e.code)) {
                this.keysJustPressed.add(e.code);
            }
            this.keys.add(e.code);

            // Don't prevent default for critical system keys like Escape, F12, etc.
            if (e.code !== 'Escape' && !e.code.startsWith('F')) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
            this.keysJustReleased.add(e.code);

            if (e.code !== 'Escape' && !e.code.startsWith('F')) {
                e.preventDefault();
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { this.mouseLeft = true; this.mouseLeftJustPressed = true; }
            if (e.button === 2) { this.mouseRight = true; this.mouseRightJustPressed = true; }
            e.preventDefault();
        });

        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouseLeft = false;
            if (e.button === 2) this.mouseRight = false;
            e.preventDefault();
        });

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    isKeyDown(code: string): boolean { return this.keys.has(code); }
    isKeyJustPressed(code: string): boolean { return this.keysJustPressed.has(code); }
    isKeyJustReleased(code: string): boolean { return this.keysJustReleased.has(code); }

    /** Call at end of frame to clear per-frame state */
    endFrame(): void {
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
        this.mouseLeftJustPressed = false;
        this.mouseRightJustPressed = false;
    }

    /** Update mouse world position based on camera offset */
    updateMouseWorld(cameraX: number, cameraY: number, scale: number): void {
        this.mouseWorldX = this.mouseX / scale + cameraX;
        this.mouseWorldY = this.mouseY / scale + cameraY;
    }
}
