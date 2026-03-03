import { Gostek } from '../game/Gostek';
import { Vector2 } from '../engine/Vector2';

export interface GostekConfig {
    skinColor: string;
    shirtColor: string;
    pantsColor: string;
    bootColor: string;
    headgearColor: string;
}

/**
 * Renders an animated Gostek preview onto a canvas element.
 * Drives its own RAF loop and can be paused.
 */
export class GostekPreview {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gostek: Gostek;
    private animId: number = 0;
    private walkSpeed: number = 5;
    private aimDeg: number = 0;
    private crouching: boolean = false;
    private weaponName: string = 'AK-74';

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.gostek = new Gostek();
        this.start();
    }

    setConfig(cfg: GostekConfig): void {
        Object.assign(this.gostek, cfg);
    }

    setWalkSpeed(s: number): void { this.walkSpeed = s; }
    setAimDeg(d: number): void { this.aimDeg = d; }
    setCrouching(c: boolean): void { this.crouching = c; }
    setWeapon(name: string): void { this.weaponName = name; }

    private start(): void {
        const loop = () => {
            this.render();
            this.animId = requestAnimationFrame(loop);
        };
        this.animId = requestAnimationFrame(loop);
    }

    destroy(): void { cancelAnimationFrame(this.animId); }

    private render(): void {
        const { canvas, ctx } = this;
        const cx = canvas.width / 2;
        const cy = canvas.height * 0.62;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background gradient
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
        grad.addColorStop(0, 'rgba(124,58,237,0.06)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Floor line
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, cy + 1); ctx.lineTo(canvas.width - 40, cy + 1);
        ctx.stroke();

        // Advance animation
        const speed = this.walkSpeed;
        this.gostek.update(speed, true, cx + 100, cx); // facing right

        const pos = new Vector2(cx, cy);
        const aimRad = (this.aimDeg * Math.PI) / 180;

        this.gostek.render(
            ctx,
            pos,
            aimRad,
            this.crouching,
            this.weaponName,
            0, 0, false,
            speed
        );
    }
}
