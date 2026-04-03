import { Vector2 } from '../engine/Vector2';
import { loadAllSprites, getTerrainPattern, getImage as getSpriteImage } from '../engine/SpriteSheet';

// ========================
// Polygon Types & Materials
// ========================

export enum PolygonType {
    SOLID = 0,
    BACKGROUND = 1,
    BOUNCY = 2,
    DEADLY = 3,
    ONLY_BULLETS = 4,
    ONLY_PLAYERS = 5,
    ONE_WAY = 6,       // Can jump through from below, solid from above
}

export enum Material {
    DIRT = 'dirt',
    ROCK = 'rock',
    METAL = 'metal',
    CONCRETE = 'concrete',
    WOOD = 'wood',
    GRASS = 'grass',
}

/** Impact effect config per material */
export const MATERIAL_EFFECTS: Record<Material, {
    particleColor: string;
    particleColorAlt: string;
    sparkCount: number;
    dustCount: number;
}> = {
    [Material.DIRT]: { particleColor: '#8B7355', particleColorAlt: '#6B5339', sparkCount: 0, dustCount: 5 },
    [Material.ROCK]: { particleColor: '#999', particleColorAlt: '#777', sparkCount: 3, dustCount: 2 },
    [Material.METAL]: { particleColor: '#FFD700', particleColorAlt: '#FF8C00', sparkCount: 6, dustCount: 1 },
    [Material.CONCRETE]: { particleColor: '#AAAAAA', particleColorAlt: '#888888', sparkCount: 2, dustCount: 4 },
    [Material.WOOD]: { particleColor: '#D2B48C', particleColorAlt: '#8B6914', sparkCount: 1, dustCount: 3 },
    [Material.GRASS]: { particleColor: '#6B8E23', particleColorAlt: '#556B2F', sparkCount: 0, dustCount: 4 },
};

// ========================
// Map Data Structures
// ========================

export interface MapPolygon {
    vertices: Vector2[];
    type: PolygonType;
    color: string;
    material?: Material;
    /** Optional: shadow color at bottom edges */
    shadowColor?: string;
}

export interface SpawnPoint {
    position: Vector2;
    team: number;
}

/** Parallax background layer */
export interface ParallaxLayer {
    /** Objects in the layer */
    elements: ParallaxElement[];
    /** Scroll speed relative to camera (0 = fixed, 0.5 = half speed, 1 = full) */
    scrollFactor: number;
    /** Render order (lower = behind) */
    zIndex: number;
}

export interface ParallaxElement {
    type: 'polygon' | 'circle' | 'rect';
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    vertices?: Vector2[];
    color: string;
    opacity?: number;
    image?: string;
}

/** Scenery decoration (props) */
export interface SceneryItem {
    x: number;
    y: number;
    type: 'crate' | 'barrel' | 'sandbag' | 'flag' | 'pillar' | 'bush' | 'sign';
    scale?: number;
    rotation?: number;
    /** Render order: < 0 behind player, > 0 in front */
    zIndex: number;
    color?: string;
    team?: number;
}

export enum PickupType {
    HEALTH = 'health',
    GRENADES = 'grenades',
    AMMO = 'ammo'
}

export interface PickupData {
    x: number;
    y: number;
    type: PickupType;
    /** Current status: 0 available, >0 respawning in frames */
    timer: number;
    // PHYSICS
    velY?: number;
    isFalling?: boolean;
    hasLanded?: boolean;
}

export interface SpawnPoint {
    position: Vector2;
    team: number;
}

export interface WeatherConfig {
    type: 'none' | 'rain' | 'snow' | 'ash';
    intensity: number;
    windX: number;
    color?: string;
}

export interface MapData {
    name: string;
    polygons: MapPolygon[];
    spawns: SpawnPoint[];
    bgColor: string;
    bgGradientTop: string;
    bgGradientBottom: string;
    bgImage?: string;
    bounds: { left: number; top: number; right: number; bottom: number };
    /** Parallax background layers */
    parallaxLayers?: ParallaxLayer[];
    /** Decorative scenery items */
    scenery?: SceneryItem[];
    /** Weather effect */
    weather?: WeatherConfig;
    /** Health and grenade boxes */
    pickups?: PickupData[];
}

// ========================
// GameMap Class
// ========================

export class GameMap {
    data: MapData;
    private skyImage: HTMLImageElement | null = null;
    private imageCache: Map<string, HTMLImageElement> = new Map();
    private offscreenCanvas: HTMLCanvasElement | null = null;

    constructor(data: MapData) {
        this.data = data;
        if (data.bgImage) {
            this.skyImage = this.getImage(data.bgImage);
        }
        // Pre-load parallax images
        if (data.parallaxLayers) {
            for (const layer of data.parallaxLayers) {
                for (const el of layer.elements) {
                    if (el.image) this.getImage(el.image);
                }
            }
        }
    }

    private getImage(src: string): HTMLImageElement {
        if (this.imageCache.has(src)) return this.imageCache.get(src)!;
        const img = new Image();
        img.src = src;
        this.imageCache.set(src, img);
        return img;
    }

    // ========================
    // Rendering
    // ========================

    /** Render the sky background (image or gradient) */
    renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        if (this.skyImage && this.skyImage.complete) {
            ctx.drawImage(this.skyImage, 0, 0, width, height);
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, this.data.bgGradientTop);
            gradient.addColorStop(1, this.data.bgGradientBottom);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }
    }

    /** Render parallax layers behind the main scene */
    renderParallaxBehind(
        ctx: CanvasRenderingContext2D,
        cameraX: number,
        cameraY: number,
        screenW: number,
        screenH: number
    ): void {
        const layers = this.data.parallaxLayers || [];
        for (const layer of layers) {
            if (layer.zIndex >= 0) continue; // In front layers rendered separately
            this.renderParallaxLayer(ctx, layer, cameraX, cameraY, screenW, screenH);
        }
    }

    /** Render parallax layers in front of the scene (decorations) */
    renderParallaxFront(
        ctx: CanvasRenderingContext2D,
        cameraX: number,
        cameraY: number,
        screenW: number,
        screenH: number
    ): void {
        const layers = this.data.parallaxLayers || [];
        for (const layer of layers) {
            if (layer.zIndex < 0) continue;
            this.renderParallaxLayer(ctx, layer, cameraX, cameraY, screenW, screenH);
        }
    }

    private renderParallaxLayer(
        ctx: CanvasRenderingContext2D,
        layer: ParallaxLayer,
        cameraX: number,
        cameraY: number,
        screenW: number,
        screenH: number
    ): void {
        ctx.save();
        const offsetX = -cameraX * layer.scrollFactor;
        const offsetY = -cameraY * layer.scrollFactor;
        ctx.translate(offsetX, offsetY);

        for (const el of layer.elements) {
            ctx.globalAlpha = el.opacity ?? 1;
            if (el.image) {
                const img = this.getImage(el.image);
                if (img.complete) {
                    const w = el.width || img.width;
                    const h = el.height || img.height;
                    ctx.drawImage(img, el.x, el.y, w, h);
                }
            } else {
                ctx.fillStyle = el.color;
                switch (el.type) {
                    case 'circle':
                        ctx.beginPath();
                        ctx.arc(el.x, el.y, el.radius || 20, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case 'rect':
                        ctx.fillRect(el.x, el.y, el.width || 50, el.height || 50);
                        break;
                    case 'polygon':
                        if (el.vertices && el.vertices.length >= 3) {
                            ctx.beginPath();
                            ctx.moveTo(el.vertices[0].x + el.x, el.vertices[0].y + el.y);
                            for (let i = 1; i < el.vertices.length; i++) {
                                ctx.lineTo(el.vertices[i].x + el.x, el.vertices[i].y + el.y);
                            }
                            ctx.closePath();
                            ctx.fill();
                        }
                        break;
                }
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /** Render all map polygons (uses offscreen cache for performance) */
    render(ctx: CanvasRenderingContext2D): void {
        if (!this.offscreenCanvas) {
            this.generateCache();
        }
        if (this.offscreenCanvas) {
            const { bounds } = this.data;
            ctx.drawImage(this.offscreenCanvas, bounds.left, bounds.top);
        }
    }

    /** Force recreation of the offscreen canvas (call when map geometry changes) */
    invalidateCache(): void {
        this.offscreenCanvas = null;
    }

    /** Call after sprites have loaded to rebuild the textured cache */
    async loadSpritesAndRebuild(): Promise<void> {
        await loadAllSprites();
        this.invalidateCache();
    }

    private generateCache(): void {
        const { bounds } = this.data;
        const width = bounds.right - bounds.left;
        const height = bounds.bottom - bounds.top;

        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;
        const tempCtx = this.offscreenCanvas.getContext('2d')!;

        // Translate so world-coordinates map correctly onto the canvas
        tempCtx.translate(-bounds.left, -bounds.top);

        // First pass: background polygons
        for (const poly of this.data.polygons) {
            if (poly.type !== PolygonType.BACKGROUND) continue;
            this.renderPolygon(tempCtx, poly);
        }

        // Second pass: collidable polygons with shadows
        for (const poly of this.data.polygons) {
            if (poly.type === PolygonType.BACKGROUND) continue;
            this.renderPolygonWithShadow(tempCtx, poly);
        }
    }

    private renderPolygon(ctx: CanvasRenderingContext2D, poly: MapPolygon): void {
        if (poly.vertices.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(poly.vertices[0].x, poly.vertices[0].y);
        for (let i = 1; i < poly.vertices.length; i++) {
            ctx.lineTo(poly.vertices[i].x, poly.vertices[i].y);
        }
        ctx.closePath();

        // Try sprite texture pattern
        const mat = poly.material as string | undefined;
        const pattern = mat ? getTerrainPattern(mat, ctx) : null;
        if (pattern) {
            ctx.save();
            ctx.clip();
            ctx.fillStyle = pattern;
            ctx.fillRect(-10000, -10000, 30000, 30000);
            ctx.restore();
        } else {
            ctx.fillStyle = poly.color;
            ctx.fill();
        }
    }

    private renderPolygonWithShadow(ctx: CanvasRenderingContext2D, poly: MapPolygon): void {
        if (poly.vertices.length < 3) return;

        // Build path
        ctx.beginPath();
        ctx.moveTo(poly.vertices[0].x, poly.vertices[0].y);
        for (let i = 1; i < poly.vertices.length; i++) {
            ctx.lineTo(poly.vertices[i].x, poly.vertices[i].y);
        }
        ctx.closePath();

        // Fill with sprite texture or fallback colour
        const mat = poly.material as string | undefined;
        const pattern = mat ? getTerrainPattern(mat, ctx) : null;
        if (pattern) {
            ctx.save();
            ctx.clip();
            ctx.fillStyle = pattern;
            ctx.fillRect(-10000, -10000, 30000, 30000);
            ctx.restore();
        } else {
            ctx.fillStyle = poly.color;
            ctx.fill();
        }

        // Edge shadow: draw bottom edges darker for depth illusion
        const verts = poly.vertices;
        for (let i = 0; i < verts.length; i++) {
            const a = verts[i];
            const b = verts[(i + 1) % verts.length];
            const edgeDir = b.sub(a);
            const normal = new Vector2(-edgeDir.y, edgeDir.x).normalize();

            // Top-facing edges (normal.y < 0) get a subtle highlight
            // Bottom/side edges get a shadow
            if (normal.y > 0.3) {
                // Bottom edge — draw shadow line
                ctx.strokeStyle = poly.shadowColor || 'rgba(0,0,0,0.35)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            } else if (normal.y < -0.5) {
                // Top edge — subtle highlight
                ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }

        // Subtle outline
        ctx.beginPath();
        ctx.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // One-way platform visual indicator: dashed top line
        if (poly.type === PolygonType.ONE_WAY) {
            // Find the topmost edge
            let topA = verts[0], topB = verts[1];
            let minY = Infinity;
            for (let i = 0; i < verts.length; i++) {
                const a2 = verts[i];
                const b2 = verts[(i + 1) % verts.length];
                const midY = (a2.y + b2.y) / 2;
                if (midY < minY) {
                    minY = midY;
                    topA = a2;
                    topB = b2;
                }
            }
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = 'rgba(255,255,200,0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(topA.x, topA.y);
            ctx.lineTo(topB.x, topB.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    /** Render scenery items behind the player (zIndex < 0) */
    renderSceneryBehind(ctx: CanvasRenderingContext2D): void {
        const items = (this.data.scenery || []).filter(s => s.zIndex < 0);
        for (const item of items) this.renderSceneryItem(ctx, item);
    }

    /** Render scenery items in front of the player (zIndex >= 0) */
    renderSceneryFront(ctx: CanvasRenderingContext2D): void {
        const items = (this.data.scenery || []).filter(s => s.zIndex >= 0);
        for (const item of items) this.renderSceneryItem(ctx, item);
    }

    private renderSceneryItem(ctx: CanvasRenderingContext2D, item: SceneryItem): void {
        ctx.save();
        ctx.translate(item.x, item.y);
        const sc = item.scale || 1;
        ctx.scale(sc, sc);
        if (item.rotation) ctx.rotate(item.rotation);

        const sheet = getSpriteImage('/items.png');

        // items.png: 765×1024, 3 cols × 4 rows → cell 255×256
        const CW = 255, CH = 256;
        function drawItem(col: number, row: number, w: number, h: number): void {
            if (sheet?.complete) {
                ctx.drawImage(sheet, col * CW, row * CH, CW, CH, -w / 2, -h, w, h);
            }
        }

        switch (item.type as string) {
            case 'crate': drawItem(0, 1, 28, 28); break;
            case 'barrel': drawItem(1, 1, 22, 30); break;
            // rusted barrel fallback to barrel slot
            case 'barrel_rusted': drawItem(2, 3, 22, 30); break;
            case 'sandbag': drawItem(2, 1, 36, 22); break;
            case 'flag':
                // flag_blue col=0 row=2 / flag_red col=1 row=2
                if (item.team === 1) drawItem(1, 2, 32, 44); // red
                else drawItem(0, 2, 32, 44); // blue
                break;
            case 'sign': drawItem(2, 2, 30, 36); break;
            case 'bush': drawItem(0, 3, 34, 26); break;
            case 'pillar': drawItem(1, 3, 24, 52); break;

            default: {
                // Fallback: simple coloured box
                const baseColor = item.color || '#6a5a3a';
                ctx.fillStyle = baseColor;
                ctx.fillRect(-10, -20, 20, 20);
            }
        }

        ctx.restore();
    }

    // ========================
    // Collision Queries
    // ========================

    getPlayerCollisionPolygons(): MapPolygon[] {
        return this.data.polygons.filter(
            (p) =>
                p.type === PolygonType.SOLID ||
                p.type === PolygonType.BOUNCY ||
                p.type === PolygonType.DEADLY ||
                p.type === PolygonType.ONLY_PLAYERS ||
                p.type === PolygonType.ONE_WAY
        );
    }

    getBulletCollisionPolygons(): MapPolygon[] {
        return this.data.polygons.filter(
            (p) =>
                p.type === PolygonType.SOLID ||
                p.type === PolygonType.ONLY_BULLETS
        );
    }

    getRandomSpawn(): Vector2 {
        if (this.data.spawns.length === 0) return new Vector2(400, 200);
        const sp = this.data.spawns[Math.floor(Math.random() * this.data.spawns.length)];
        return sp.position.clone();
    }
}
