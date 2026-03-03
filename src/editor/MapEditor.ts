import { PolygonType, Material, PickupType, MapData } from '../game/GameMap';
import { ImageLoader } from './ImageLoader';
import { getPattern, pregenerate } from './TerrainTextures';
import type { PresetDef } from './Presets';
import type { SpriteSelection } from './SpritePickerPanel';
import { getImage } from '../engine/SpriteSheet';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
export interface EditVertex { x: number; y: number; }

export interface EditPolygon {
    id: string;
    vertices: EditVertex[];
    type: PolygonType;
    color: string;
    shadowColor: string;
    material: Material;
}

interface EditSpawn { id: string; x: number; y: number; team: number; }
interface EditPickup { id: string; x: number; y: number; type: 'health' | 'grenades'; timer: number; }
interface EditScenery { id: string; x: number; y: number; type: string; scale: number; }

/** A stamped sprite placement on the map canvas */
export interface SpritePlacement {
    id: string;
    sheet: string;
    sx: number; sy: number; sw: number; sh: number;  // source crop
    x: number; y: number;                             // world position (top-left)
    dw: number; dh: number;                            // rendered size
    zIndex: number;    // negative = behind, positive = in front
    flipX?: boolean;
    opacity?: number;
}

type Tool = 'SELECT' | 'DRAW' | 'PAN' | 'SPAWN' | 'PICKUP' | 'SCENERY' | 'ERASE' | 'BRUSH' | 'PLACE_PRESET' | 'STAMP';

const TYPE_COLORS: Record<number, { fill: string; stroke: string; label: string }> = {
    [PolygonType.SOLID]: { fill: 'rgba(50,120,220,0.30)', stroke: '#4499ff', label: 'SOLID' },
    [PolygonType.BACKGROUND]: { fill: 'rgba(50,140,60,0.22)', stroke: '#44bb66', label: 'BG' },
    [PolygonType.BOUNCY]: { fill: 'rgba(220,160,40,0.30)', stroke: '#ffbb44', label: 'BOUNCY' },
    [PolygonType.DEADLY]: { fill: 'rgba(220,50,50,0.30)', stroke: '#ff4444', label: 'DEADLY' },
    [PolygonType.ONLY_BULLETS]: { fill: 'rgba(150,50,220,0.30)', stroke: '#aa44ff', label: 'BULLETS' },
    [PolygonType.ONLY_PLAYERS]: { fill: 'rgba(50,200,120,0.30)', stroke: '#44ee88', label: 'PLAYERS' },
    [PolygonType.ONE_WAY]: { fill: 'rgba(220,200,50,0.30)', stroke: '#eeee44', label: 'ONE-WAY' },
};

const TEAM_COLORS = ['#aaaaaa', '#ff6666', '#6688ff'];

// ──────────────────────────────────────────────
// MapEditor
// ──────────────────────────────────────────────
export class MapEditor {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private imageLoader: ImageLoader;

    // Camera
    panX = 200;
    panY = 200;
    zoom = 1;

    // State
    private tool: Tool = 'SELECT';
    polygons: EditPolygon[] = [];
    spawns: EditSpawn[] = [];
    pickups: EditPickup[] = [];
    scenery: EditScenery[] = [];
    spritePlacements: SpritePlacement[] = [];

    private selectedId: string | null = null;
    private selectedVertexIdx = -1;

    // Draw in progress
    private drawVerts: EditVertex[] = [];
    private mouseScreenX = 0;
    private mouseScreenY = 0;

    // Drag
    private isDraggingVertex = false;
    private isDraggingPoly = false;
    private isPanning = false;
    private panStartX = 0;
    private panStartY = 0;
    private panOriginX = 0;
    private panOriginY = 0;
    private polyDragStart: EditVertex[] = [];

    // Grid
    gridSnap = true;
    gridSize = 20;

    // Map config (for export)
    mapName = 'meuMapa';
    bounds = { left: -100, top: -100, right: 3000, bottom: 2000 };

    // New polygon defaults
    newPolyType = PolygonType.SOLID;
    newPolyMaterial = Material.DIRT;
    newPolyColor = '#4a7c4f';
    spawnTeam = 0;
    pickupTypeStr: 'health' | 'grenades' = 'health';
    sceneryTypeStr = 'crate';

    // Brush tool
    brushSize = 40;
    brushMaterial = Material.DIRT;
    brushType = PolygonType.SOLID;
    private isBrushDown = false;
    private lastBrushWorldX = -Infinity;
    private lastBrushWorldY = -Infinity;
    private pendingPreset: PresetDef | null = null;

    // Stamp tool
    private pendingStamp: SpriteSelection | null = null;
    private stampW = 64;
    private stampH = 64;
    stampScale = 1;
    stampOpacity = 1;
    stampZIndex = 0;

    // Callbacks
    onStatusUpdate: ((msg: string) => void) | null = null;
    onSelectionChange: ((poly: EditPolygon | null) => void) | null = null;
    onCountChange: (() => void) | null = null;

    constructor(canvas: HTMLCanvasElement, imageLoader: ImageLoader) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.imageLoader = imageLoader;
        pregenerate(); // Pre-build all terrain texture ImageData
        this.bindEvents();
        this.fitToWindow();
        requestAnimationFrame(() => this.renderLoop());
    }

    // ──── Resize ────
    fitToWindow(): void {
        const area = this.canvas.parentElement!;
        this.canvas.width = area.clientWidth;
        this.canvas.height = area.clientHeight;
    }

    onResize(): void { this.fitToWindow(); }

    // ──── Tool ────
    setTool(t: Tool): void {
        this.tool = t;
        if (t !== 'DRAW') this.drawVerts = [];
        if (t !== 'BRUSH') { this.isBrushDown = false; }
        if (t !== 'PLACE_PRESET') { this.pendingPreset = null; }
        if (t !== 'STAMP') { /* keep pendingStamp so they can keep stamping */ }
        const hint = document.getElementById('draw-hint');
        if (hint) hint.style.display = t === 'DRAW' ? 'block' : 'none';
        const cursors: Partial<Record<Tool, string>> = { PAN: 'grab', ERASE: 'crosshair', BRUSH: 'none', STAMP: 'none' };
        this.canvas.style.cursor = cursors[t] ?? 'default';
        this.onStatusUpdate?.(`Ferramenta: ${t}`);
    }

    /** Set the sprite selection that the STAMP tool will place */
    setPendingStamp(sel: SpriteSelection): void {
        this.pendingStamp = sel;
        // Derive default display size from the selection aspect ratio
        const aspect = sel.sh > 0 ? sel.sw / sel.sh : 1;
        this.stampH = Math.round(Math.min(sel.sh, 128) * this.stampScale);
        this.stampW = Math.round(this.stampH * aspect);
        this.setTool('STAMP');
    }

    // ──── Coordinate helpers ────
    screenToWorld(sx: number, sy: number): EditVertex {
        return { x: (sx - this.panX) / this.zoom, y: (sy - this.panY) / this.zoom };
    }
    worldToScreen(wx: number, wy: number): [number, number] {
        return [wx * this.zoom + this.panX, wy * this.zoom + this.panY];
    }
    snap(v: number): number {
        return this.gridSnap ? Math.round(v / this.gridSize) * this.gridSize : v;
    }

    // ──── Hit testing ────
    private findPolygonAt(wx: number, wy: number): EditPolygon | null {
        for (let i = this.polygons.length - 1; i >= 0; i--) {
            if (this.pointInPoly({ x: wx, y: wy }, this.polygons[i].vertices)) {
                return this.polygons[i];
            }
        }
        return null;
    }
    private findVertexAt(poly: EditPolygon, wx: number, wy: number): number {
        const threshold = 8 / this.zoom;
        for (let i = 0; i < poly.vertices.length; i++) {
            const v = poly.vertices[i];
            if (Math.hypot(v.x - wx, v.y - wy) < threshold) return i;
        }
        return -1;
    }
    private pointInPoly(p: EditVertex, verts: EditVertex[]): boolean {
        let inside = false;
        for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
            const xi = verts[i].x, yi = verts[i].y;
            const xj = verts[j].x, yj = verts[j].y;
            if (((yi > p.y) !== (yj > p.y)) &&
                (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    private findSpawnAt(wx: number, wy: number): EditSpawn | null {
        const t = 12 / this.zoom;
        return this.spawns.find(s => Math.hypot(s.x - wx, s.y - wy) < t) ?? null;
    }
    private findPickupAt(wx: number, wy: number): EditPickup | null {
        const t = 12 / this.zoom;
        return this.pickups.find(p => Math.hypot(p.x - wx, p.y - wy) < t) ?? null;
    }
    private findSceneryAt(wx: number, wy: number): EditScenery | null {
        const t = 14 / this.zoom;
        return this.scenery.find(s => Math.hypot(s.x - wx, s.y - wy) < t) ?? null;
    }

    // ──── Mouse events ────
    private bindEvents(): void {
        const c = this.canvas;
        c.addEventListener('mousedown', e => this.onMouseDown(e));
        c.addEventListener('mousemove', e => this.onMouseMove(e));
        c.addEventListener('mouseup', e => this.onMouseUp(e));
        c.addEventListener('dblclick', e => this.onDblClick(e));
        c.addEventListener('wheel', e => this.onWheel(e), { passive: false });
        c.addEventListener('contextmenu', e => e.preventDefault());
        window.addEventListener('keydown', e => this.onKeyDown(e));
    }

    private onMouseDown(e: MouseEvent): void {
        const { offsetX: sx, offsetY: sy } = e;
        this.mouseScreenX = sx; this.mouseScreenY = sy;
        const w = this.screenToWorld(sx, sy);

        // Middle mouse or space+drag → PAN
        if (e.button === 1 || (e.button === 0 && this._spaceDown)) {
            this.isPanning = true;
            this.panStartX = sx; this.panStartY = sy;
            this.panOriginX = this.panX; this.panOriginY = this.panY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        if (e.button !== 0) return;

        // Image overlay drag has priority in SELECT mode
        if (this.tool === 'SELECT') {
            const grabbed = this.imageLoader.onMouseDown(sx, sy, this.panX, this.panY, this.zoom);
            if (grabbed) return;
        }

        switch (this.tool) {
            case 'SELECT': this.startSelect(sx, sy, w); break;
            case 'DRAW': this.addDrawVertex(w); break;
            case 'ERASE': this.eraseAt(w); break;
            case 'BRUSH':
                this.isBrushDown = true;
                this.lastBrushWorldX = -Infinity;
                this.lastBrushWorldY = -Infinity;
                this.paintBrushAt(w);
                break;
            case 'PLACE_PRESET':
                if (this.pendingPreset) { this.placePreset(this.pendingPreset, w.x, w.y); }
                break;
            case 'STAMP':
                if (this.pendingStamp) {
                    const s = this.pendingStamp;
                    this.spritePlacements.push({
                        id: crypto.randomUUID(),
                        sheet: s.sheet,
                        sx: s.sx, sy: s.sy, sw: s.sw, sh: s.sh,
                        x: w.x - this.stampW / 2,
                        y: w.y - this.stampH / 2,
                        dw: this.stampW, dh: this.stampH,
                        zIndex: this.stampZIndex,
                        opacity: this.stampOpacity,
                    });
                    this.onCountChange?.();
                }
                break;
            case 'PAN':
                this.isPanning = true;
                this.panStartX = sx; this.panStartY = sy;
                this.panOriginX = this.panX; this.panOriginY = this.panY;
                break;
            case 'SPAWN':
                this.spawns.push({ id: crypto.randomUUID(), x: this.snap(w.x), y: this.snap(w.y), team: this.spawnTeam });
                this.onCountChange?.();
                break;
            case 'PICKUP':
                this.pickups.push({ id: crypto.randomUUID(), x: this.snap(w.x), y: this.snap(w.y), type: this.pickupTypeStr, timer: 0 });
                this.onCountChange?.();
                break;
            case 'SCENERY':
                this.scenery.push({ id: crypto.randomUUID(), x: this.snap(w.x), y: this.snap(w.y), type: this.sceneryTypeStr, scale: 1 });
                this.onCountChange?.();
                break;
        }
    }

    private _spaceDown = false;

    private startSelect(sx: number, sy: number, w: EditVertex): void {
        const selPoly = this.polygons.find(p => p.id === this.selectedId) ?? null;

        // Check vertex handles first
        if (selPoly) {
            const vi = this.findVertexAt(selPoly, w.x, w.y);
            if (vi !== -1) {
                this.selectedVertexIdx = vi;
                this.isDraggingVertex = true;
                return;
            }

            // Drag whole polygon if clicked inside
            if (this.pointInPoly(w, selPoly.vertices)) {
                this.isDraggingPoly = true;
                this.panStartX = sx; this.panStartY = sy;
                this.polyDragStart = selPoly.vertices.map(v => ({ ...v }));
                return;
            }
        }

        // Select new polygon
        const picked = this.findPolygonAt(w.x, w.y);
        this.selectedId = picked?.id ?? null;
        this.selectedVertexIdx = -1;
        this.onSelectionChange?.(picked ?? null);
    }

    private addDrawVertex(w: EditVertex): void {
        const snapped = { x: this.snap(w.x), y: this.snap(w.y) };

        // Close polygon if clicking near first vertex
        if (this.drawVerts.length >= 3) {
            const first = this.drawVerts[0];
            const dist = Math.hypot(snapped.x - first.x, snapped.y - first.y);
            if (dist < 16 / this.zoom) {
                this.closePoly();
                return;
            }
        }
        this.drawVerts.push(snapped);
    }

    private onDblClick(e: MouseEvent): void {
        if (this.tool === 'DRAW' && this.drawVerts.length >= 3) {
            this.closePoly();
        }
    }

    private closePoly(): void {
        if (this.drawVerts.length < 3) return;
        const poly: EditPolygon = {
            id: crypto.randomUUID(),
            vertices: [...this.drawVerts],
            type: this.newPolyType,
            color: this.newPolyColor,
            shadowColor: 'rgba(0,0,0,0.35)',
            material: this.newPolyMaterial,
        };
        this.polygons.push(poly);
        this.drawVerts = [];
        this.selectedId = poly.id;
        this.onSelectionChange?.(poly);
        this.onCountChange?.();
    }

    private eraseAt(w: EditVertex): void {
        const poly = this.findPolygonAt(w.x, w.y);
        if (poly) {
            this.polygons = this.polygons.filter(p => p.id !== poly.id);
            if (this.selectedId === poly.id) { this.selectedId = null; this.onSelectionChange?.(null); }
            this.onCountChange?.(); return;
        }
        const sp = this.findSpawnAt(w.x, w.y);
        if (sp) { this.spawns = this.spawns.filter(s => s.id !== sp.id); this.onCountChange?.(); return; }
        const pk = this.findPickupAt(w.x, w.y);
        if (pk) { this.pickups = this.pickups.filter(p => p.id !== pk.id); this.onCountChange?.(); return; }
        const sc = this.findSceneryAt(w.x, w.y);
        if (sc) { this.scenery = this.scenery.filter(s => s.id !== sc.id); this.onCountChange?.(); }
    }

    private onMouseMove(e: MouseEvent): void {
        const { offsetX: sx, offsetY: sy } = e;
        this.mouseScreenX = sx; this.mouseScreenY = sy;
        const w = this.screenToWorld(sx, sy);

        // Update status coords
        this.onStatusUpdate?.(`X: ${Math.round(w.x)}  Y: ${Math.round(w.y)}`);

        // Pan
        if (this.isPanning) {
            this.panX = this.panOriginX + (sx - this.panStartX);
            this.panY = this.panOriginY + (sy - this.panStartY);
            return;
        }

        // Brush painting
        if (this.tool === 'BRUSH' && this.isBrushDown) {
            const dist = Math.hypot(w.x - this.lastBrushWorldX, w.y - this.lastBrushWorldY);
            if (dist >= this.brushSize * 0.45) this.paintBrushAt(w);
            return;
        }

        // Image drag
        if (this.imageLoader.isDragging()) {
            this.imageLoader.onMouseMove(sx, sy, this.zoom);
            return;
        }

        // Vertex drag
        if (this.isDraggingVertex) {
            const poly = this.polygons.find(p => p.id === this.selectedId);
            if (poly && this.selectedVertexIdx !== -1) {
                poly.vertices[this.selectedVertexIdx] = { x: this.snap(w.x), y: this.snap(w.y) };
            }
            return;
        }

        // Polygon drag
        if (this.isDraggingPoly) {
            const poly = this.polygons.find(p => p.id === this.selectedId);
            if (poly) {
                const dx = (sx - this.panStartX) / this.zoom;
                const dy = (sy - this.panStartY) / this.zoom;
                poly.vertices = this.polyDragStart.map(v => ({
                    x: this.snap(v.x + dx),
                    y: this.snap(v.y + dy),
                }));
            }
        }
    }

    private onMouseUp(e: MouseEvent): void {
        this.isPanning = false;
        this.isDraggingVertex = false;
        this.isDraggingPoly = false;
        this.isBrushDown = false;
        this.imageLoader.onMouseUp();
        if (this.tool === 'PAN') this.canvas.style.cursor = 'grab';
    }

    private onWheel(e: WheelEvent): void {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.88 : 1.12;
        const newZoom = Math.max(0.05, Math.min(20, this.zoom * factor));
        this.panX = e.offsetX - (e.offsetX - this.panX) * (newZoom / this.zoom);
        this.panY = e.offsetY - (e.offsetY - this.panY) * (newZoom / this.zoom);
        this.zoom = newZoom;
        const pct = Math.round(this.zoom * 100);
        document.getElementById('status-zoom')!.textContent = `Zoom: ${pct}%`;
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (e.code === 'Space') { this._spaceDown = true; }
        if (e.code === 'Escape') {
            this.drawVerts = [];
            this.selectedId = null;
            this.onSelectionChange?.(null);
        }
        if (e.code === 'Enter' && this.tool === 'DRAW') { this.closePoly(); }
        if ((e.code === 'Delete' || e.code === 'Backspace') && this.selectedId) {
            this.polygons = this.polygons.filter(p => p.id !== this.selectedId);
            this.selectedId = null;
            this.onSelectionChange?.(null);
            this.onCountChange?.();
        }
    }

    // ──── Render ────
    private renderLoop(): void {
        this.render();
        requestAnimationFrame(() => this.renderLoop());
    }

    private render(): void {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background
        ctx.fillStyle = '#09090f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.renderGrid();
        this.renderBoundsRect();
        this.renderSpritePlacements(false); // behind polygons
        this.renderPolygons();
        this.renderSpawns();
        this.renderPickups();
        this.renderScenery();
        this.renderSpritePlacements(true);  // in front of polygons
        this.renderDrawing();
        this.imageLoader.render(ctx, this.panX, this.panY, this.zoom);
        if (this.tool === 'BRUSH') this.renderBrushCursor();
        if (this.tool === 'PLACE_PRESET' && this.pendingPreset) this.renderPresetGhost();
        if (this.tool === 'STAMP' && this.pendingStamp) this.renderStampGhost();
    }

    /** Draw all sprite placements at their world positions */
    private renderSpritePlacements(front: boolean): void {
        const { ctx } = this;
        for (const sp of this.spritePlacements) {
            const isFront = (sp.zIndex ?? 0) >= 0;
            if (isFront !== front) continue;

            const img = getImage(sp.sheet);
            if (!img) continue;

            const [sx, sy] = this.worldToScreen(sp.x, sp.y);
            const dw = sp.dw * this.zoom;
            const dh = sp.dh * this.zoom;

            ctx.save();
            ctx.globalAlpha = sp.opacity ?? 1;
            ctx.imageSmoothingEnabled = false;
            if (sp.flipX) {
                ctx.scale(-1, 1);
                ctx.drawImage(img, sp.sx, sp.sy, sp.sw, sp.sh, -(sx + dw), sy, dw, dh);
            } else {
                ctx.drawImage(img, sp.sx, sp.sy, sp.sw, sp.sh, sx, sy, dw, dh);
            }
            ctx.globalAlpha = 1;

            // Selection outline when ERASE tool hovers (visual hint)
            ctx.strokeStyle = 'rgba(110,231,183,0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(sx, sy, dw, dh);
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    /** Ghost preview of the stamp sprite at cursor position */
    private renderStampGhost(): void {
        if (!this.pendingStamp) return;
        const { ctx } = this;
        const s = this.pendingStamp;
        const img = getImage(s.sheet);
        if (!img) return;

        const w = this.screenToWorld(this.mouseScreenX, this.mouseScreenY);
        const [sx, sy] = this.worldToScreen(
            w.x - this.stampW / 2,
            w.y - this.stampH / 2,
        );
        const dw = this.stampW * this.zoom;
        const dh = this.stampH * this.zoom;

        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, s.sx, s.sy, s.sw, s.sh, sx, sy, dw, dh);
        ctx.globalAlpha = 1;

        // Dashed border
        ctx.strokeStyle = '#6ee7b7';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(sx, sy, dw, dh);
        ctx.setLineDash([]);

        // Size label
        ctx.fillStyle = '#6ee7b7';
        ctx.font = '10px monospace';
        ctx.fillText(`${this.stampW}×${this.stampH}`, sx + 3, sy - 4);
        ctx.restore();
    }


    private renderGrid(): void {
        const { ctx, canvas, panX, panY, zoom, gridSize } = this;
        const step = gridSize * zoom;
        if (step < 4) return;

        const startX = Math.floor(-panX / step) * step + panX;
        const startY = Math.floor(-panY / step) * step + panY;

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let x = startX; x < canvas.width; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = startY; y < canvas.height; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(panX, 0); ctx.lineTo(panX, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, panY); ctx.lineTo(canvas.width, panY); ctx.stroke();

        // Origin label
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText('(0,0)', panX + 4, panY - 4);
        ctx.restore();
    }

    private renderBoundsRect(): void {
        const { ctx, bounds } = this;
        ctx.save();
        const [lx, ly] = this.worldToScreen(bounds.left, bounds.top);
        const [rx, ry] = this.worldToScreen(bounds.right, bounds.bottom);
        ctx.strokeStyle = 'rgba(255,200,50,0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(lx, ly, rx - lx, ry - ly);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,200,50,0.3)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText('MAP BOUNDS', lx + 4, ly + 14);
        ctx.restore();
    }

    private renderPolygons(): void {
        const { ctx } = this;
        for (const poly of this.polygons) {
            if (poly.vertices.length < 3) continue;
            const cols = TYPE_COLORS[poly.type] ?? TYPE_COLORS[0];
            const isSelected = poly.id === this.selectedId;

            ctx.save();
            ctx.beginPath();
            for (let i = 0; i < poly.vertices.length; i++) {
                const [sx, sy] = this.worldToScreen(poly.vertices[i].x, poly.vertices[i].y);
                i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
            }
            ctx.closePath();

            // ── Pixel-art texture fill ──
            ctx.save();
            ctx.clip();
            const pattern = getPattern(poly.material, ctx);
            if (pattern) {
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            } else {
                ctx.fillStyle = poly.color;
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }
            // Type-colour tint overlay
            ctx.fillStyle = cols.fill;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();

            ctx.strokeStyle = isSelected ? '#ffffff' : cols.stroke;
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.stroke();

            // TYPE label
            const cx = poly.vertices.reduce((s, v) => s + v.x, 0) / poly.vertices.length;
            const cy = poly.vertices.reduce((s, v) => s + v.y, 0) / poly.vertices.length;
            const [labelX, labelY] = this.worldToScreen(cx, cy);
            ctx.fillStyle = isSelected ? '#ffffff' : cols.stroke;
            ctx.font = `${Math.max(8, 10 * this.zoom)}px JetBrains Mono, monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(cols.label, labelX, labelY + 4);

            // Vertex handles if selected
            if (isSelected) {
                for (let i = 0; i < poly.vertices.length; i++) {
                    const [vx, vy] = this.worldToScreen(poly.vertices[i].x, poly.vertices[i].y);
                    ctx.fillStyle = i === this.selectedVertexIdx ? '#ffffff' : '#7c3aed';
                    ctx.beginPath();
                    ctx.arc(vx, vy, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Vertex coordinates tooltip
                    ctx.fillStyle = 'rgba(255,255,255,0.6)';
                    ctx.font = '9px JetBrains Mono, monospace';
                    ctx.fillText(`${Math.round(poly.vertices[i].x)},${Math.round(poly.vertices[i].y)}`, vx + 7, vy - 4);
                }
            }
            ctx.restore();
        }
    }

    private renderSpawns(): void {
        const { ctx } = this;
        for (const s of this.spawns) {
            const [sx, sy] = this.worldToScreen(s.x, s.y);
            ctx.save();
            ctx.fillStyle = TEAM_COLORS[s.team] ?? '#aaa';
            ctx.beginPath();
            ctx.arc(sx, sy, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('S', sx, sy + 3);
            ctx.restore();
        }
    }

    private renderPickups(): void {
        const { ctx } = this;
        for (const p of this.pickups) {
            const [sx, sy] = this.worldToScreen(p.x, p.y);
            const col = p.type === 'health' ? '#44ff88' : '#ff8833';
            ctx.save();
            ctx.fillStyle = col;
            const size = 8;
            ctx.beginPath();
            ctx.rect(sx - size / 2, sy - size / 2, size, size);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = '8px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(p.type === 'health' ? '+' : '💣', sx, sy + 3);
            ctx.restore();
        }
    }

    private renderScenery(): void {
        const { ctx } = this;
        for (const s of this.scenery) {
            const [sx, sy] = this.worldToScreen(s.x, s.y);
            ctx.save();
            ctx.strokeStyle = '#aaaaaa';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx - 8, sy - 8, 16, 16);
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(sx - 8, sy - 8, 16, 16);
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(s.type.slice(0, 3).toUpperCase(), sx, sy + 3);
            ctx.restore();
        }
    }

    private renderDrawing(): void {
        if (this.drawVerts.length === 0) return;
        const { ctx } = this;

        ctx.save();
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        for (let i = 0; i < this.drawVerts.length; i++) {
            const [sx, sy] = this.worldToScreen(this.drawVerts[i].x, this.drawVerts[i].y);
            i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.lineTo(this.mouseScreenX, this.mouseScreenY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Vertex dots
        for (const v of this.drawVerts) {
            const [sx, sy] = this.worldToScreen(v.x, v.y);
            ctx.fillStyle = '#a78bfa';
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Close hint: green highlight near first vertex
        if (this.drawVerts.length >= 3) {
            const [fx, fy] = this.worldToScreen(this.drawVerts[0].x, this.drawVerts[0].y);
            const dist = Math.hypot(this.mouseScreenX - fx, this.mouseScreenY - fy);
            if (dist < 20) {
                ctx.strokeStyle = '#22ff88';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(fx, fy, 8, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    // ──── Selection update from property panel ────
    updateSelectedPolygon(patch: Partial<EditPolygon>): void {
        const poly = this.polygons.find(p => p.id === this.selectedId);
        if (poly) Object.assign(poly, patch);
    }

    updateSelectedVertex(idx: number, x: number, y: number): void {
        const poly = this.polygons.find(p => p.id === this.selectedId);
        if (poly && poly.vertices[idx]) {
            poly.vertices[idx] = { x, y };
        }
    }

    getSelectedPolygon(): EditPolygon | null {
        return this.polygons.find(p => p.id === this.selectedId) ?? null;
    }

    clearAll(): void {
        this.polygons = []; this.spawns = []; this.pickups = []; this.scenery = [];
        this.selectedId = null; this.drawVerts = [];
        this.onSelectionChange?.(null); this.onCountChange?.();
    }

    /** Build a MapData object for export */
    toMapData(): MapData {
        return {
            name: this.mapName,
            polygons: this.polygons.map(p => ({
                vertices: p.vertices.map(v => ({ x: (v as any).x ?? v.x, y: (v as any).y ?? v.y } as any)),
                type: p.type,
                color: p.color,
                material: p.material as any,
                shadowColor: p.shadowColor,
            })),
            spawns: this.spawns.map(s => ({
                position: { x: s.x, y: s.y } as any,
                team: s.team,
            })),
            bgColor: '#1a2233',
            bgGradientTop: '#1a2233',
            bgGradientBottom: '#0a0f1a',
            bounds: { ...this.bounds },
            pickups: this.pickups.map(p => ({
                x: p.x, y: p.y,
                type: p.type as any,
                timer: p.timer,
            })),
        };
    }

    /** Load map data into the editor */
    loadMapData(data: MapData): void {
        this.clearAll();
        this.mapName = data.name;
        this.bounds = { ...data.bounds };
        for (const p of data.polygons) {
            this.polygons.push({
                id: crypto.randomUUID(),
                vertices: p.vertices.map(v => ({ x: (v as any).x, y: (v as any).y })),
                type: p.type,
                color: p.color,
                shadowColor: p.shadowColor ?? 'rgba(0,0,0,0.35)',
                material: (p.material as Material) ?? Material.DIRT,
            });
        }
        for (const s of data.spawns) {
            this.spawns.push({ id: crypto.randomUUID(), x: (s.position as any).x, y: (s.position as any).y, team: s.team });
        }
        for (const pk of data.pickups ?? []) {
            this.pickups.push({ id: crypto.randomUUID(), x: pk.x, y: pk.y, type: pk.type as any, timer: pk.timer });
        }
        this.onCountChange?.();
    }

    // ──── Brush tool ────
    private paintBrushAt(w: EditVertex): void {
        const half = this.brushSize / 2;
        const sx = this.snap(w.x - half);
        const sy = this.snap(w.y - half);
        const ex = sx + this.brushSize;
        const ey = sy + this.brushSize;
        const poly: EditPolygon = {
            id: crypto.randomUUID(),
            vertices: [{ x: sx, y: sy }, { x: ex, y: sy }, { x: ex, y: ey }, { x: sx, y: ey }],
            type: this.brushType,
            color: this.brushMaterial,
            shadowColor: 'rgba(0,0,0,0.35)',
            material: this.brushMaterial,
        };
        this.polygons.push(poly);
        this.lastBrushWorldX = w.x;
        this.lastBrushWorldY = w.y;
        this.onCountChange?.();
    }

    private renderBrushCursor(): void {
        const { ctx } = this;
        const w = this.screenToWorld(this.mouseScreenX, this.mouseScreenY);
        const half = this.brushSize / 2;
        const sx = this.snap(w.x - half);
        const sy = this.snap(w.y - half);
        const [px, py] = this.worldToScreen(sx, sy);
        const [px2, py2] = this.worldToScreen(sx + this.brushSize, sy + this.brushSize);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(px, py, px2 - px, py2 - py);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(124,58,237,0.12)';
        ctx.fillRect(px, py, px2 - px, py2 - py);
        ctx.restore();
    }

    // ──── Preset placement ────
    setPendingPreset(preset: PresetDef): void {
        this.pendingPreset = preset;
        this.setTool('PLACE_PRESET');
    }

    placePreset(preset: PresetDef, worldX: number, worldY: number): void {
        const cx = this.snap(worldX);
        const cy = this.snap(worldY);
        const poly: EditPolygon = {
            id: crypto.randomUUID(),
            vertices: preset.vertices.map(v => ({ x: v.x + cx, y: v.y + cy })),
            type: preset.type,
            color: preset.color,
            shadowColor: 'rgba(0,0,0,0.35)',
            material: preset.material,
        };
        this.polygons.push(poly);
        this.selectedId = poly.id;
        this.onSelectionChange?.(poly);
        this.onCountChange?.();
        // Stay in PLACE_PRESET so user can stamp multiple times
    }

    private renderPresetGhost(): void {
        if (!this.pendingPreset) return;
        const { ctx } = this;
        const w = this.screenToWorld(this.mouseScreenX, this.mouseScreenY);
        const cx = this.snap(w.x);
        const cy = this.snap(w.y);
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        const verts = this.pendingPreset.vertices;
        verts.forEach((v, i) => {
            const [sx, sy] = this.worldToScreen(v.x + cx, v.y + cy);
            i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.fillStyle = this.pendingPreset.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
}
