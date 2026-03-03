/**
 * SpritePickerPanel
 *
 * Displays loaded sprite sheets inside a canvas.
 * The user can drag-select a rectangular region, then
 * stamp it onto the map using the MapEditor's STAMP tool.
 */

import { loadAllSprites, getImage } from '../engine/SpriteSheet';

export interface SpriteSelection {
    sheet: string;   // '/terrain.png' etc.
    sx: number;
    sy: number;
    sw: number;
    sh: number;
}

export class SpritePickerPanel {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private currentSheet = '/terrain.png';
    private sheets: string[];

    private dragStart: { x: number; y: number } | null = null;
    private dragEnd: { x: number; y: number } | null = null;
    private isDragging = false;

    private scale = 1;   // canvas px per image px
    private offsetX = 0;
    private offsetY = 0;

    /** Called when user finalises a selection */
    onSelect: ((sel: SpriteSelection) => void) | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.sheets = [
            '/terrain.png',
            '/items.png',
            '/guns.png',
            '/char.png',
            '/particles.png',
        ];

        this.bindEvents();
        loadAllSprites().then(() => this.render());
    }

    // ── Public ──────────────────────────────────────────────

    setSheet(sheet: string): void {
        this.currentSheet = sheet;
        this.dragStart = null;
        this.dragEnd = null;
        this.fitToCanvas();
        this.render();
    }

    // ── Geometry helpers ─────────────────────────────────────

    private fitToCanvas(): void {
        const img = getImage(this.currentSheet);
        if (!img) return;
        this.scale = Math.min(this.canvas.width / img.width, this.canvas.height / img.height);
        this.offsetX = (this.canvas.width - img.width * this.scale) / 2;
        this.offsetY = (this.canvas.height - img.height * this.scale) / 2;
    }

    /** Canvas coords → image-space coords */
    private canvasToImage(cx: number, cy: number): { x: number; y: number } {
        return {
            x: (cx - this.offsetX) / this.scale,
            y: (cy - this.offsetY) / this.scale,
        };
    }

    private getSelectionRect(): { sx: number; sy: number; sw: number; sh: number } | null {
        if (!this.dragStart || !this.dragEnd) return null;
        const a = this.canvasToImage(this.dragStart.x, this.dragStart.y);
        const b = this.canvasToImage(this.dragEnd.x, this.dragEnd.y);
        const sx = Math.round(Math.min(a.x, b.x));
        const sy = Math.round(Math.min(a.y, b.y));
        const sw = Math.round(Math.abs(b.x - a.x));
        const sh = Math.round(Math.abs(b.y - a.y));
        if (sw < 2 || sh < 2) return null;
        return { sx, sy, sw, sh };
    }

    // ── Events ───────────────────────────────────────────────

    private bindEvents(): void {
        const c = this.canvas;

        const pos = (e: MouseEvent): { x: number; y: number } => {
            const r = c.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        };

        c.addEventListener('mousedown', (e) => {
            this.dragStart = pos(e);
            this.dragEnd = pos(e);
            this.isDragging = true;
        });

        c.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.dragEnd = pos(e);
            this.render();
        });

        c.addEventListener('mouseup', (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.dragEnd = pos(e);
            this.render();

            const rect = this.getSelectionRect();
            if (rect && this.onSelect) {
                this.onSelect({ sheet: this.currentSheet, ...rect });
            }
        });

        c.addEventListener('mouseleave', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.render();
            }
        });
    }

    // ── Render ───────────────────────────────────────────────

    render(): void {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dark background
        ctx.fillStyle = '#1a1825';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = getImage(this.currentSheet);
        if (!img) {
            ctx.fillStyle = '#666';
            ctx.font = '13px monospace';
            ctx.fillText('Loading…', 10, 20);
            return;
        }

        this.fitToCanvas();

        // Draw the sprite sheet
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            img,
            this.offsetX, this.offsetY,
            img.width * this.scale,
            img.height * this.scale,
        );

        // Checkerboard tint behind sheet (show transparency)
        // (skipped for perf — background already dark enough)

        // Selection overlay
        const rect = this.getSelectionRect();
        if (this.dragStart && this.dragEnd) {
            const ax = Math.min(this.dragStart.x, this.dragEnd.x);
            const ay = Math.min(this.dragStart.y, this.dragEnd.y);
            const aw = Math.abs(this.dragEnd.x - this.dragStart.x);
            const ah = Math.abs(this.dragEnd.y - this.dragStart.y);

            // Semi-transparent fill
            ctx.fillStyle = 'rgba(110,231,183,0.15)';
            ctx.fillRect(ax, ay, aw, ah);

            // Dashed border
            ctx.strokeStyle = '#6ee7b7';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(ax, ay, aw, ah);
            ctx.setLineDash([]);

            // Info label
            if (rect) {
                ctx.fillStyle = '#6ee7b7';
                ctx.font = '11px monospace';
                ctx.fillText(`${rect.sx},${rect.sy}  ${rect.sw}×${rect.sh}`, ax + 3, ay - 4);
            }
        }

        // Crosshair grid hint (very faint)
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        const step = 32 * this.scale;
        for (let x = this.offsetX; x < this.offsetX + img.width * this.scale; x += step) {
            ctx.beginPath(); ctx.moveTo(x, this.offsetY);
            ctx.lineTo(x, this.offsetY + img.height * this.scale); ctx.stroke();
        }
        for (let y = this.offsetY; y < this.offsetY + img.height * this.scale; y += step) {
            ctx.beginPath(); ctx.moveTo(this.offsetX, y);
            ctx.lineTo(this.offsetX + img.width * this.scale, y); ctx.stroke();
        }
    }
}
