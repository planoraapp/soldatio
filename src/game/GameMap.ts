import { Vector2 } from '../engine/Vector2';

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

/** Weather config */
export interface WeatherConfig {
    type: 'none' | 'rain' | 'snow' | 'ash';
    intensity: number; // 0-1
    windX: number;     // horizontal wind force
    color?: string;
}

export interface MapData {
    name: string;
    polygons: MapPolygon[];
    spawns: SpawnPoint[];
    bgColor: string;
    bgGradientTop: string;
    bgGradientBottom: string;
    bounds: { left: number; top: number; right: number; bottom: number };
    /** Parallax background layers */
    parallaxLayers?: ParallaxLayer[];
    /** Decorative scenery items */
    scenery?: SceneryItem[];
    /** Weather effect */
    weather?: WeatherConfig;
}

// ========================
// GameMap Class
// ========================

export class GameMap {
    data: MapData;

    constructor(data: MapData) {
        this.data = data;
    }

    // ========================
    // Rendering
    // ========================

    /** Render the sky gradient background */
    renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, this.data.bgGradientTop);
        gradient.addColorStop(1, this.data.bgGradientBottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
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
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /** Render all map polygons with shadows */
    render(ctx: CanvasRenderingContext2D): void {
        // First pass: background polygons
        for (const poly of this.data.polygons) {
            if (poly.type !== PolygonType.BACKGROUND) continue;
            this.renderPolygon(ctx, poly);
        }

        // Second pass: collidable polygons with shadows
        for (const poly of this.data.polygons) {
            if (poly.type === PolygonType.BACKGROUND) continue;
            this.renderPolygonWithShadow(ctx, poly);
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
        ctx.fillStyle = poly.color;
        ctx.fill();
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

        // Fill polygon
        ctx.fillStyle = poly.color;
        ctx.fill();

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

        const baseColor = item.color || '#6a5a3a';

        switch (item.type) {
            case 'crate':
                ctx.fillStyle = '#8B7355';
                ctx.fillRect(-12, -12, 24, 24);
                ctx.strokeStyle = '#5a4a2a';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(-12, -12, 24, 24);
                // Cross on crate
                ctx.beginPath();
                ctx.moveTo(-12, -12); ctx.lineTo(12, 12);
                ctx.moveTo(12, -12); ctx.lineTo(-12, 12);
                ctx.stroke();
                break;

            case 'barrel':
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.stroke();
                // Bands
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-10, -5); ctx.lineTo(10, -5);
                ctx.moveTo(-10, 5); ctx.lineTo(10, 5);
                ctx.stroke();
                break;

            case 'sandbag':
                ctx.fillStyle = '#B8A67E';
                ctx.beginPath();
                ctx.ellipse(0, 3, 16, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#A89668';
                ctx.beginPath();
                ctx.ellipse(0, -3, 16, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                ctx.lineWidth = 0.5;
                ctx.stroke();
                break;

            case 'flag':
                const teamColor = item.team === 1 ? '#cc3333' : item.team === 2 ? '#3333cc' : '#cccc33';
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 10);
                ctx.lineTo(0, -20);
                ctx.stroke();
                // Flag cloth
                ctx.fillStyle = teamColor;
                ctx.beginPath();
                ctx.moveTo(0, -20);
                ctx.lineTo(18, -15);
                ctx.lineTo(0, -8);
                ctx.closePath();
                ctx.fill();
                break;

            case 'pillar':
                ctx.fillStyle = baseColor;
                ctx.fillRect(-8, -30, 16, 60);
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(-8, 20, 16, 10);
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.fillRect(-8, -30, 16, 5);
                break;

            case 'bush':
                ctx.fillStyle = '#3a6b2a';
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(-6, 0, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#2d5a20';
                ctx.beginPath();
                ctx.arc(6, -2, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#4a7c3a';
                ctx.beginPath();
                ctx.arc(0, -6, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                break;

            case 'sign':
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 10);
                ctx.lineTo(0, -10);
                ctx.stroke();
                ctx.fillStyle = '#c8b870';
                ctx.fillRect(-14, -18, 28, 14);
                ctx.strokeStyle = '#8a7a4a';
                ctx.lineWidth = 1;
                ctx.strokeRect(-14, -18, 28, 14);
                break;
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
