/**
 * TerrainTextures – Procedural pixel-art texture patterns for each terrain material.
 *
 * All textures are generated at runtime on OffscreenCanvas instances and cached
 * as CanvasPattern objects. The style mimics the classic Soldat aesthetic:
 * cracked stone, dirt with pebbles, grass with bright top edge, etc.
 */

import { Material } from '../game/GameMap';

const PIXEL = 3;   // px per "texel" — 3×3 real pixels per art pixel
const SIZE = 96;  // canvas size in real pixels (32×32 texels)

// ──────────────────────────────────────────────────────────────
// Simple seedable pseudo-random (LCG) for consistent results
// ──────────────────────────────────────────────────────────────
function seededRng(seed: number) {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}

// ──────────────────────────────────────────────────────────────
// Image data helpers
// ──────────────────────────────────────────────────────────────
function setPixel(data: Uint8ClampedArray, x: number, y: number, w: number, r: number, g: number, b: number, a = 255): void {
    const i = (y * w + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
}

function hexToRgb(hex: string): [number, number, number] {
    const v = parseInt(hex.replace('#', ''), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function vary(v: number, range: number, rng: () => number): number {
    return Math.max(0, Math.min(255, v + Math.round((rng() - 0.5) * 2 * range)));
}

// ──────────────────────────────────────────────────────────────
// Texture generators
// ──────────────────────────────────────────────────────────────

function makeDirt(seed = 1): ImageData {
    const rng = seededRng(seed);
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    const BASE: [number, number, number] = [130, 100, 65];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const tx = Math.floor(x / PIXEL);
            const ty = Math.floor(y / PIXEL);
            // Noisy dirt base
            const rngV = seededRng(tx * 31 + ty * 97 + seed);
            rngV(); // burn one
            const n = rngV();
            let [r, g, b] = BASE;
            r = vary(r, 25, () => n);
            g = vary(g, 18, () => rng());
            b = vary(b, 12, () => rng());
            // Occasional dark pebble / crack
            if (n < 0.08) { r -= 30; g -= 22; b -= 15; }
            if (n > 0.92) { r += 20; g += 15; b += 10; }
            setPixel(data, x, y, SIZE, r, g, b);
        }
    }
    return new ImageData(data, SIZE, SIZE);
}

function makeGrass(seed = 2): ImageData {
    const rng = seededRng(seed);
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    const DIRT: [number, number, number] = [110, 82, 50];
    const GRASS1: [number, number, number] = [62, 120, 40];
    const GRASS2: [number, number, number] = [80, 148, 55];
    const TOPSTRIP = PIXEL * 3; // 3 texels of grass on top

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const tx = Math.floor(x / PIXEL);
            const ty = Math.floor(y / PIXEL);
            const n = seededRng(tx * 41 + ty * 73 + seed)();
            let [r, g, b] = y < TOPSTRIP
                ? (n > 0.5 ? GRASS1 : GRASS2)
                : DIRT;
            r = vary(r, 20, rng);
            g = vary(g, 18, rng);
            b = vary(b, 10, rng);
            // Darker root / shadow below grass strip
            if (y >= TOPSTRIP && y < TOPSTRIP + PIXEL * 2) { r -= 15; g -= 12; b -= 8; }
            setPixel(data, x, y, SIZE, r, g, b);
        }
    }
    return new ImageData(data, SIZE, SIZE);
}

function makeRock(seed = 3): ImageData {
    const rng = seededRng(seed);
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    const BASE: [number, number, number] = [100, 95, 90];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const tx = Math.floor(x / PIXEL);
            const ty = Math.floor(y / PIXEL);
            const n = seededRng(tx * 53 + ty * 89 + seed)();
            let [r, g, b] = BASE;
            const delta = (n - 0.5) * 60;
            r += delta; g += delta; b += delta;
            // Crack lines (diagonal-ish)
            if ((tx + ty) % 7 === 0 && n < 0.35) { r -= 40; g -= 40; b -= 40; }
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
            setPixel(data, x, y, SIZE, r, g, b);
        }
    }
    return new ImageData(data, SIZE, SIZE);
}

function makeConcrete(seed = 4): ImageData {
    const rng = seededRng(seed);
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    const BASE: [number, number, number] = [135, 132, 128];
    const JOINT_TEXELS = 8; // grid size in texels

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const tx = Math.floor(x / PIXEL);
            const ty = Math.floor(y / PIXEL);
            const n = seededRng(tx * 37 + ty * 61 + seed)();
            let [r, g, b] = BASE;
            r = vary(r, 12, rng);
            g = vary(g, 10, rng);
            b = vary(b, 8, rng);
            // Mortar joints
            if (tx % JOINT_TEXELS === 0 || ty % JOINT_TEXELS === 0) { r -= 22; g -= 20; b -= 18; }
            // Stagger every other row
            const rowOffset = Math.floor(ty / JOINT_TEXELS) % 2 === 0 ? 0 : JOINT_TEXELS / 2;
            if ((tx + rowOffset) % JOINT_TEXELS === 0) { r -= 18; g -= 16; b -= 14; }
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
            setPixel(data, x, y, SIZE, r, g, b);
        }
    }
    return new ImageData(data, SIZE, SIZE);
}

function makeWood(seed = 5): ImageData {
    const rng = seededRng(seed);
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    const BASE: [number, number, number] = [138, 95, 40];
    const GRAIN = 2; // texel thickness per grain line

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const ty = Math.floor(y / PIXEL);
            const n = seededRng(ty * 79 + seed)();
            let [r, g, b] = BASE;
            // Horizontal grain variation
            r = vary(r, 25, rng);
            g = vary(g, 18, rng);
            b = vary(b, 12, rng);
            // Grain lines every 2 texels
            if (ty % GRAIN === 0) { r -= n < 0.5 ? 18 : 8; g -= n < 0.5 ? 12 : 6; b -= n < 0.5 ? 6 : 3; }
            // Knot: random darker circle once in a while
            const knotY = Math.floor(ty / 16) * 16 + 8;
            const knotX = Math.floor((seed * 13 + Math.floor(ty / 16) * 7) % (SIZE / PIXEL));
            const tx = Math.floor(x / PIXEL);
            if (Math.hypot(tx - knotX, ty - knotY) < 3) { r -= 30; g -= 20; }
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
            setPixel(data, x, y, SIZE, r, g, b);
        }
    }
    return new ImageData(data, SIZE, SIZE);
}

function makeMetal(seed = 6): ImageData {
    const rng = seededRng(seed);
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    const BASE: [number, number, number] = [100, 115, 128];
    const STRIPE = 4;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const ty = Math.floor(y / PIXEL);
            let [r, g, b] = BASE;
            // Brushed metal horizontal stripes
            const stripe = Math.floor(ty / STRIPE) % 2;
            const bright = stripe === 0 ? 20 : -10;
            r = vary(r + bright, 8, rng);
            g = vary(g + bright, 8, rng);
            b = vary(b + bright, 8, rng);
            // Rivet-like dots at corners of panels
            const tx = Math.floor(x / PIXEL);
            const panelX = tx % 10;
            const panelY = ty % 6;
            if ((panelX === 0 || panelX === 9) && (panelY === 0 || panelY === 5)) {
                r = 180; g = 185; b = 190;
            }
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
            setPixel(data, x, y, SIZE, r, g, b);
        }
    }
    return new ImageData(data, SIZE, SIZE);
}

// ──────────────────────────────────────────────────────────────
// Cache + public API
// ──────────────────────────────────────────────────────────────
const patternCache = new Map<string, CanvasPattern>();
const imageDataCache = new Map<Material, ImageData>();

/** Pre-generate all ImageData objects (cheap, no DOM) */
export function pregenerate(): void {
    imageDataCache.set(Material.DIRT, makeDirt(1));
    imageDataCache.set(Material.GRASS, makeGrass(2));
    imageDataCache.set(Material.ROCK, makeRock(3));
    imageDataCache.set(Material.CONCRETE, makeConcrete(4));
    imageDataCache.set(Material.WOOD, makeWood(5));
    imageDataCache.set(Material.METAL, makeMetal(6));
}

/** Get or create a CanvasPattern for the given material & context. */
export function getPattern(material: Material, ctx: CanvasRenderingContext2D): CanvasPattern | null {
    const key = material;
    if (patternCache.has(key)) return patternCache.get(key)!;

    if (!imageDataCache.has(material)) pregenerate();
    const imageData = imageDataCache.get(material);
    if (!imageData) return null;

    const offscreen = document.createElement('canvas');
    offscreen.width = SIZE;
    offscreen.height = SIZE;
    const octx = offscreen.getContext('2d')!;
    octx.putImageData(imageData, 0, 0);

    const pattern = ctx.createPattern(offscreen, 'repeat');
    if (pattern) patternCache.set(key, pattern);
    return pattern;
}

/** Draw a TexturedPolygon thumbnail onto a small canvas for the preset gallery */
export function drawThumbnail(
    canvas: HTMLCanvasElement,
    vertices: { x: number; y: number }[],
    material: Material,
    w: number,
    h: number
): void {
    const ctx = canvas.getContext('2d')!;
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    if (vertices.length < 2) return;

    // Compute bounding box of vertices
    const minX = Math.min(...vertices.map(v => v.x));
    const maxX = Math.max(...vertices.map(v => v.x));
    const minY = Math.min(...vertices.map(v => v.y));
    const maxY = Math.max(...vertices.map(v => v.y));
    const vw = maxX - minX || 1;
    const vh = maxY - minY || 1;

    const pad = 4;
    const scaleX = (cw - pad * 2) / vw;
    const scaleY = (ch - pad * 2) / vh;
    const scale = Math.min(scaleX, scaleY);
    const offX = pad + (cw - pad * 2 - vw * scale) / 2 - minX * scale;
    const offY = pad + (ch - pad * 2 - vh * scale) / 2 - minY * scale;

    ctx.save();
    ctx.beginPath();
    vertices.forEach((v, i) => {
        const sx = v.x * scale + offX;
        const sy = v.y * scale + offY;
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    });
    ctx.closePath();

    // Try texture fill
    const pattern = getPattern(material, ctx);
    if (pattern) {
        ctx.save();
        ctx.clip();
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
    }

    // Outline
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}
