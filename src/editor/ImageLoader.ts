export interface RefImage {
    id: string;
    name: string;
    img: HTMLImageElement;
    x: number;
    y: number;
    scale: number;
    opacity: number;
    visible: boolean;
}

export type ImageLoaderChangeCallback = () => void;

/**
 * Manages reference image overlays that are rendered on top of the map editor canvas.
 * Images can be repositioned and scaled by dragging them inside the map canvas.
 */
export class ImageLoader {
    private images: RefImage[] = [];
    private onChange: ImageLoaderChangeCallback;

    // Drag state
    private dragging: RefImage | null = null;
    private dragStartX = 0;
    private dragStartY = 0;
    private dragImgStartX = 0;
    private dragImgStartY = 0;

    constructor(onChange: ImageLoaderChangeCallback) {
        this.onChange = onChange;
    }

    /** Load image(s) from File objects */
    loadFiles(files: FileList | File[]): void {
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target!.result as string;
                img.onload = () => {
                    const ref: RefImage = {
                        id: crypto.randomUUID(),
                        name: file.name,
                        img,
                        x: 0,
                        y: 0,
                        scale: 1,
                        opacity: 0.4,
                        visible: true,
                    };
                    this.images.push(ref);
                    this.onChange();
                };
            };
            reader.readAsDataURL(file);
        }
    }

    getImages(): RefImage[] { return this.images; }

    remove(id: string): void {
        this.images = this.images.filter(i => i.id !== id);
        this.onChange();
    }

    update(id: string, patch: Partial<Omit<RefImage, 'id' | 'img'>>): void {
        const img = this.images.find(i => i.id === id);
        if (img) Object.assign(img, patch);
        this.onChange();
    }

    /**
     * Render all visible reference images onto the canvas.
     * This should be called LAST in the map editor's render loop
     * so images appear on top of everything.
     *
     * @param ctx   Canvas 2D context
     * @param panX  Camera pan X (screen pixels)
     * @param panY  Camera pan Y (screen pixels)
     * @param zoom  Camera zoom level
     */
    render(
        ctx: CanvasRenderingContext2D,
        panX: number,
        panY: number,
        zoom: number
    ): void {
        for (const ref of this.images) {
            if (!ref.visible) continue;
            ctx.save();
            ctx.globalAlpha = ref.opacity;
            const sx = ref.x * zoom + panX;
            const sy = ref.y * zoom + panY;
            const sw = ref.img.width * ref.scale * zoom;
            const sh = ref.img.height * ref.scale * zoom;
            ctx.drawImage(ref.img, sx, sy, sw, sh);
            // Draw selection border
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = '#7c3aed';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(sx, sy, sw, sh);
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    /**
     * Handle mousedown — start dragging the topmost image whose bounds contain the cursor.
     * Returns true if an image was picked.
     */
    onMouseDown(
        screenX: number,
        screenY: number,
        panX: number,
        panY: number,
        zoom: number
    ): boolean {
        // Iterate in reverse so topmost images are picked first
        for (let i = this.images.length - 1; i >= 0; i--) {
            const ref = this.images[i];
            if (!ref.visible) continue;
            const sx = ref.x * zoom + panX;
            const sy = ref.y * zoom + panY;
            const sw = ref.img.width * ref.scale * zoom;
            const sh = ref.img.height * ref.scale * zoom;
            if (screenX >= sx && screenX <= sx + sw && screenY >= sy && screenY <= sy + sh) {
                this.dragging = ref;
                this.dragStartX = screenX;
                this.dragStartY = screenY;
                this.dragImgStartX = ref.x;
                this.dragImgStartY = ref.y;
                return true;
            }
        }
        return false;
    }

    onMouseMove(screenX: number, screenY: number, zoom: number): void {
        if (!this.dragging) return;
        const dx = (screenX - this.dragStartX) / zoom;
        const dy = (screenY - this.dragStartY) / zoom;
        this.dragging.x = this.dragImgStartX + dx;
        this.dragging.y = this.dragImgStartY + dy;
        this.onChange();
    }

    onMouseUp(): void {
        this.dragging = null;
    }

    isDragging(): boolean { return this.dragging !== null; }
}
