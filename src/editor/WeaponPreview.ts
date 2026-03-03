export interface WeaponVisual {
    name: string;
    length: number;
    height: number;
    color: string;
    handleColor: string;
}

/**
 * Renders a weapon preview on a dedicated canvas.
 */
export class WeaponPreview {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private weapon: WeaponVisual = {
        name: 'AK-74', length: 22, height: 3, color: '#5a4a3a', handleColor: '#3a3a3a',
    };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.render();
    }

    setWeapon(w: Partial<WeaponVisual>): void {
        Object.assign(this.weapon, w);
        this.render();
    }

    render(): void {
        const { canvas, ctx } = this;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const scale = 3.5;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const w = this.weapon;
        const wL = w.length * scale;
        const wH = w.height * scale;

        ctx.save();
        ctx.translate(cx - wL / 2, cy);

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 6;

        // Gun body  
        ctx.fillStyle = w.color;
        ctx.beginPath();
        ctx.roundRect(-2 * scale, -wH / 2, wL, wH, 2);
        ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

        // Handle
        ctx.fillStyle = w.handleColor;
        ctx.fillRect(-1 * scale, wH / 2, 4 * scale, 5 * scale);

        // Barrel tip highlight
        ctx.fillStyle = '#222';
        ctx.fillRect(wL - 5 * scale, -wH / 2 - scale * 0.5, 5 * scale, wH + scale);

        // Top scope rail
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, -wH / 2, wL * 0.6, 2);

        // Trigger guard
        ctx.strokeStyle = w.handleColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(8 * scale, wH / 2 + 3, 4 * scale, 0, Math.PI);
        ctx.stroke();

        ctx.restore();

        // Labels
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(w.name, cx, cy - 50);
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillText(`L:${w.length}  H:${w.height}`, cx, cy + 52);
    }
}
