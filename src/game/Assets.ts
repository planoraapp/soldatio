/**
 * Assets.ts — Biblioteca procedural de assets em estilo low-poly facetado.
 *
 * Todo asset é desenhado com polígonos sombreados (luz vinda do alto-esquerda),
 * determinístico via seed, com origem no ponto de contato com o chão (0,0 = base).
 * A mesma biblioteca alimenta o jogo e o editor de mapas.
 */

// ========================
// Seeded RNG + cor
// ========================

export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Ajusta a luminosidade de uma cor hex. amt em [-1, 1]. */
export function shade(hex: string, amt: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt >= 0) {
        r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
    } else {
        r *= 1 + amt; g *= 1 + amt; b *= 1 + amt;
    }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
}

type Pt = { x: number; y: number };

function poly(ctx: CanvasRenderingContext2D, pts: Pt[], fill: string): void {
    if (pts.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
}

// ========================
// Preenchimento low-poly de terreno
// ========================

/**
 * Preenche um polígono de mapa com facetas triangulares jitteradas —
 * o visual "rocha low-poly". Clipa ao path já construído no ctx.
 * Determinístico por posição (mesmo terreno = mesmas facetas).
 */
export function lowPolyFacetFill(
    ctx: CanvasRenderingContext2D,
    verts: Pt[],
    baseColor: string,
    cellSize: number = 110,
    variance: number = 0.10
): void {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const v of verts) {
        minX = Math.min(minX, v.x); minY = Math.min(minY, v.y);
        maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y);
    }
    const rng = mulberry32((minX * 73856093) ^ (minY * 19349663));

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = baseColor;
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

    const cols = Math.ceil((maxX - minX) / cellSize) + 1;
    const rows = Math.ceil((maxY - minY) / cellSize) + 1;

    // Grade de pontos jitterados
    const grid: Pt[][] = [];
    for (let r = 0; r <= rows; r++) {
        grid[r] = [];
        for (let c = 0; c <= cols; c++) {
            grid[r][c] = {
                x: minX + c * cellSize + (rng() - 0.5) * cellSize * 0.7,
                y: minY + r * cellSize + (rng() - 0.5) * cellSize * 0.7,
            };
        }
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const p00 = grid[r][c], p10 = grid[r][c + 1];
            const p01 = grid[r + 1][c], p11 = grid[r + 1][c + 1];
            // Luz do alto-esquerda: facetas superiores mais claras + jitter
            const t1 = (rng() - 0.35) * variance * 2;
            const t2 = (rng() - 0.55) * variance * 2;
            poly(ctx, [p00, p10, p11], shade(baseColor, t1));
            poly(ctx, [p00, p11, p01], shade(baseColor, t2));
        }
    }
    ctx.restore();
}

/**
 * Faixa de grama/musgo no topo de um polígono: banda clara ao longo
 * das arestas cujo normal aponta para cima.
 */
export function topGrassBand(
    ctx: CanvasRenderingContext2D,
    verts: Pt[],
    color: string,
    thickness: number = 14
): void {
    // centroide para determinar o lado interno de cada aresta
    let cx = 0, cy = 0;
    for (const v of verts) { cx += v.x; cy += v.y; }
    cx /= verts.length; cy /= verts.length;

    for (let i = 0; i < verts.length; i++) {
        const a = verts[i], b = verts[(i + 1) % verts.length];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len < 4) continue;
        // aresta "topo": aproximadamente horizontal e com o interior abaixo dela
        const midY = (a.y + b.y) / 2;
        const isTopEdge = Math.abs(dy) < Math.abs(dx) * 0.8 && cy > midY + 2;
        if (isTopEdge) {
            const ox = 0, oy = thickness; // banda desce para dentro do polígono
            poly(ctx, [a, b, { x: b.x + ox, y: b.y + oy }, { x: a.x + ox, y: a.y + oy }], color);
            // linha de highlight na borda
            ctx.strokeStyle = shade(color, 0.22);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
    }
}

// ========================
// Paleta da direção de arte
// ========================

export const PALETTE = {
    rock: '#c49a6c',
    rockDark: '#9c7850',
    dirt: '#8a6a48',
    grass: '#7a9944',
    grassDark: '#5c7a34',
    swamp: '#5c7050',
    metal: '#6e7478',
    metalDark: '#4a5054',
    rust: '#8a5a38',
    wood: '#8a6844',
    woodDark: '#66492e',
    canvasTan: '#b0a070',
    concrete: '#9a948a',
    teamBlue: '#3a6ea8',
    teamRed: '#b04038',
    foliage: '#4a7038',
    foliageDark: '#35542a',
};

// ========================
// Painters de assets
// ========================

export interface AssetDef {
    /** dimensões nominais (escala 1) para bounding no editor */
    w: number;
    h: number;
    category: 'natureza' | 'militar' | 'industrial' | 'objetivo';
    draw: (ctx: CanvasRenderingContext2D, seed: number, team?: number) => void;
}

const A = PALETTE;

export const ASSET_LIBRARY: Record<string, AssetDef> = {

    // ---------- NATUREZA ----------

    boulder: {
        w: 90, h: 60, category: 'natureza',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const w = 40 + r() * 20;
            const pts: Pt[] = [];
            const n = 7;
            for (let i = 0; i < n; i++) {
                const ang = Math.PI + (i / (n - 1)) * Math.PI;
                const rad = w * (0.75 + r() * 0.4);
                pts.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad * 0.72 });
            }
            poly(ctx, pts, A.rock);
            // facetas internas
            poly(ctx, [pts[0], pts[1], { x: 0, y: -w * 0.2 }], shade(A.rock, 0.12));
            poly(ctx, [pts[1], pts[2], { x: 0, y: -w * 0.25 }], shade(A.rock, 0.2));
            poly(ctx, [pts[n - 2], pts[n - 1], { x: w * 0.1, y: -w * 0.15 }], shade(A.rock, -0.18));
            poly(ctx, [{ x: -w * 0.6, y: 0 }, { x: w * 0.7, y: 0 }, { x: w * 0.3, y: -w * 0.18 }], shade(A.rock, -0.28));
        },
    },

    pine_tree: {
        w: 70, h: 150, category: 'natureza',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const h = 120 + r() * 60;
            const w = 32 + r() * 14;
            // tronco
            poly(ctx, [{ x: -3, y: 0 }, { x: 3, y: 0 }, { x: 2, y: -h * 0.35 }, { x: -2, y: -h * 0.35 }], A.woodDark);
            // camadas de copa (triângulos facetados)
            const layers = 4;
            for (let i = 0; i < layers; i++) {
                const t = i / layers;
                const ly = -h * (0.22 + t * 0.78);
                const lw = w * (1 - t * 0.72);
                const lh = h * 0.30;
                const c = shade(A.foliage, -0.12 + t * 0.16 + (r() - 0.5) * 0.08);
                poly(ctx, [{ x: -lw, y: ly + lh }, { x: lw, y: ly + lh }, { x: 0, y: ly }], c);
                // metade iluminada
                poly(ctx, [{ x: -lw, y: ly + lh }, { x: 0, y: ly + lh }, { x: 0, y: ly }], shade(c, 0.14));
            }
        },
    },

    dead_tree: {
        w: 60, h: 120, category: 'natureza',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const h = 90 + r() * 50;
            ctx.strokeStyle = shade(A.woodDark, -0.25);
            ctx.lineCap = 'round';
            ctx.lineWidth = 7;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2, -h * 0.6); ctx.stroke();
            ctx.lineWidth = 4;
            const branches = 3 + Math.floor(r() * 3);
            for (let i = 0; i < branches; i++) {
                const by = -h * (0.3 + r() * 0.35);
                const dir = r() > 0.5 ? 1 : -1;
                ctx.beginPath();
                ctx.moveTo(1, by);
                ctx.lineTo(dir * (14 + r() * 22), by - (10 + r() * 26));
                ctx.stroke();
            }
        },
    },

    bush: {
        w: 60, h: 36, category: 'natureza',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            for (let i = 0; i < 4; i++) {
                const cx = (r() - 0.5) * 34;
                const rad = 10 + r() * 10;
                const c = shade(A.foliage, (r() - 0.5) * 0.25);
                const pts: Pt[] = [];
                for (let k = 0; k < 6; k++) {
                    const ang = Math.PI + (k / 5) * Math.PI;
                    pts.push({ x: cx + Math.cos(ang) * rad, y: Math.sin(ang) * rad });
                }
                poly(ctx, pts, c);
            }
        },
    },

    grass_tuft: {
        w: 26, h: 18, category: 'natureza',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            ctx.strokeStyle = shade(A.grass, 0.1);
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            for (let i = 0; i < 5; i++) {
                const bx = (r() - 0.5) * 18;
                ctx.beginPath();
                ctx.moveTo(bx, 0);
                ctx.quadraticCurveTo(bx + (r() - 0.5) * 8, -8, bx + (r() - 0.5) * 14, -10 - r() * 8);
                ctx.stroke();
            }
        },
    },

    cattail: {
        w: 24, h: 60, category: 'natureza',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            for (let i = 0; i < 3; i++) {
                const bx = (i - 1) * 7 + (r() - 0.5) * 4;
                const h = 34 + r() * 22;
                ctx.strokeStyle = A.swamp;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 2, -h); ctx.stroke();
                ctx.fillStyle = A.rust;
                ctx.fillRect(bx, -h - 10, 4, 12);
            }
        },
    },

    swamp_log: {
        w: 90, h: 24, category: 'natureza',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const len = 60 + r() * 40;
            poly(ctx, [
                { x: -len / 2, y: 0 }, { x: len / 2, y: -4 },
                { x: len / 2, y: -16 }, { x: -len / 2, y: -13 },
            ], A.woodDark);
            poly(ctx, [
                { x: -len / 2, y: -13 }, { x: len / 2, y: -16 },
                { x: len / 2 - 6, y: -18 }, { x: -len / 2 + 4, y: -15 },
            ], shade(A.woodDark, 0.18));
            ctx.fillStyle = shade(A.woodDark, -0.3);
            ctx.beginPath();
            ctx.ellipse(len / 2, -10, 3.5, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        },
    },

    // ---------- MILITAR ----------

    sandbags: {
        w: 76, h: 42, category: 'militar',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const rows = 3;
            for (let row = 0; row < rows; row++) {
                const count = rows - row + 1;
                const y = -row * 12;
                for (let i = 0; i < count; i++) {
                    const x = (i - (count - 1) / 2) * 24 + (r() - 0.5) * 3;
                    const c = shade(A.canvasTan, (r() - 0.5) * 0.14 + row * 0.05);
                    // saco: retângulo arredondado facetado
                    poly(ctx, [
                        { x: x - 12, y: y - 1 }, { x: x + 12, y: y - 1 },
                        { x: x + 10, y: y - 11 }, { x: x - 10, y: y - 11 },
                    ], c);
                    poly(ctx, [
                        { x: x - 10, y: y - 11 }, { x: x + 10, y: y - 11 },
                        { x: x + 6, y: y - 13 }, { x: x - 6, y: y - 13 },
                    ], shade(c, 0.16));
                }
            }
        },
    },

    crate: {
        w: 44, h: 44, category: 'militar',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const s = 36 + r() * 8;
            const c = shade(A.wood, (r() - 0.5) * 0.1);
            poly(ctx, [{ x: -s / 2, y: 0 }, { x: s / 2, y: 0 }, { x: s / 2, y: -s }, { x: -s / 2, y: -s }], c);
            // topo iluminado
            poly(ctx, [{ x: -s / 2, y: -s }, { x: s / 2, y: -s }, { x: s / 2 - 4, y: -s + 5 }, { x: -s / 2 + 4, y: -s + 5 }], shade(c, 0.2));
            // travas diagonais
            ctx.strokeStyle = shade(c, -0.28);
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-s / 2 + 2, -2); ctx.lineTo(s / 2 - 2, -s + 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(s / 2 - 2, -2); ctx.lineTo(-s / 2 + 2, -s + 2); ctx.stroke();
            ctx.strokeRect(-s / 2, -s, s, s);
        },
    },

    barrel: {
        w: 30, h: 42, category: 'militar',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const c = r() > 0.5 ? '#5a6a4a' : A.rust;
            poly(ctx, [{ x: -13, y: 0 }, { x: 13, y: 0 }, { x: 14, y: -36 }, { x: -14, y: -36 }], c);
            poly(ctx, [{ x: -13, y: 0 }, { x: -4, y: 0 }, { x: -5, y: -36 }, { x: -14, y: -36 }], shade(c, 0.14));
            ctx.fillStyle = shade(c, -0.25);
            ctx.fillRect(-14, -12, 28, 3);
            ctx.fillRect(-14, -26, 28, 3);
            ctx.fillStyle = shade(c, 0.25);
            ctx.beginPath(); ctx.ellipse(0, -36, 14, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        },
    },

    tank_trap: {
        w: 56, h: 48, category: 'militar',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            ctx.strokeStyle = shade(A.metalDark, (r() - 0.5) * 0.2);
            ctx.lineWidth = 7;
            ctx.lineCap = 'square';
            ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, -40); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-20, -40); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -44); ctx.stroke();
            ctx.strokeStyle = A.rust;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(6, -26); ctx.stroke();
        },
    },

    watch_tower: {
        w: 110, h: 240, category: 'militar',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const h = 200 + r() * 40;
            const legSpread = 38;
            ctx.strokeStyle = A.woodDark;
            ctx.lineWidth = 7;
            // pernas
            ctx.beginPath(); ctx.moveTo(-legSpread, 0); ctx.lineTo(-16, -h + 50); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(legSpread, 0); ctx.lineTo(16, -h + 50); ctx.stroke();
            // travessas
            ctx.lineWidth = 4;
            for (let i = 1; i <= 3; i++) {
                const t = i / 4;
                const y = -h * t * 0.72;
                const sp = legSpread * (1 - t * 0.55);
                ctx.beginPath(); ctx.moveTo(-sp, y); ctx.lineTo(sp, y - 14); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sp, y); ctx.lineTo(-sp, y - 14); ctx.stroke();
            }
            // cabine
            poly(ctx, [{ x: -30, y: -h + 52 }, { x: 30, y: -h + 52 }, { x: 30, y: -h + 10 }, { x: -30, y: -h + 10 }], A.wood);
            poly(ctx, [{ x: -30, y: -h + 24 }, { x: -12, y: -h + 24 }, { x: -12, y: -h + 40 }, { x: -30, y: -h + 40 }], '#2a3038');
            poly(ctx, [{ x: 12, y: -h + 24 }, { x: 30, y: -h + 24 }, { x: 30, y: -h + 40 }, { x: 12, y: -h + 40 }], '#2a3038');
            // telhado
            poly(ctx, [{ x: -38, y: -h + 10 }, { x: 38, y: -h + 10 }, { x: 24, y: -h - 8 }, { x: -24, y: -h - 8 }], A.metalDark);
            poly(ctx, [{ x: -38, y: -h + 10 }, { x: 0, y: -h + 10 }, { x: -8, y: -h - 8 }, { x: -24, y: -h - 8 }], shade(A.metalDark, 0.15));
        },
    },

    ladder: {
        w: 26, h: 120, category: 'militar',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const h = 100 + r() * 40;
            ctx.strokeStyle = A.rust;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-9, -h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(9, -h); ctx.stroke();
            ctx.lineWidth = 3;
            for (let y = -12; y > -h + 4; y -= 16) {
                ctx.beginPath(); ctx.moveTo(-9, y); ctx.lineTo(9, y); ctx.stroke();
            }
        },
    },

    fence: {
        w: 120, h: 70, category: 'militar',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const w = 110;
            ctx.strokeStyle = A.metalDark;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -60); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, -60); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -60); ctx.stroke();
            // tela (grade diagonal leve)
            ctx.strokeStyle = 'rgba(110,116,120,0.55)';
            ctx.lineWidth = 1;
            for (let x = -w / 2; x < w / 2; x += 10) {
                ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x + 10, -56); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + 10, -4); ctx.lineTo(x, -56); ctx.stroke();
            }
            // arame no topo, meio caído
            ctx.strokeStyle = A.metalDark;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-w / 2, -60);
            ctx.quadraticCurveTo(0, -56 - r() * 8, w / 2, -60);
            ctx.stroke();
        },
    },

    truck_wreck: {
        w: 170, h: 80, category: 'militar',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const c = shade('#5a6a4a', (r() - 0.5) * 0.15);
            // caçamba
            poly(ctx, [{ x: -80, y: -16 }, { x: 10, y: -16 }, { x: 10, y: -52 }, { x: -80, y: -46 }], c);
            poly(ctx, [{ x: -80, y: -46 }, { x: 10, y: -52 }, { x: 4, y: -58 }, { x: -74, y: -52 }], shade(c, 0.16));
            // cabine amassada
            poly(ctx, [{ x: 10, y: -16 }, { x: 62, y: -16 }, { x: 58, y: -44 }, { x: 26, y: -48 }, { x: 10, y: -40 }], shade(c, -0.08));
            poly(ctx, [{ x: 28, y: -30 }, { x: 52, y: -28 }, { x: 50, y: -40 }, { x: 30, y: -42 }], '#232a30');
            // rodas (uma faltando)
            ctx.fillStyle = '#20242a';
            ctx.beginPath(); ctx.arc(-52, -12, 14, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(40, -12, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#3a4046';
            ctx.beginPath(); ctx.arc(-52, -12, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(40, -12, 6, 0, Math.PI * 2); ctx.fill();
            // ferrugem
            poly(ctx, [{ x: -30, y: -46 }, { x: -8, y: -49 }, { x: -18, y: -38 }], A.rust);
        },
    },

    // ---------- INDUSTRIAL ----------

    chimney: {
        w: 60, h: 260, category: 'industrial',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const h = 220 + r() * 60;
            const c = shade('#8a5a48', (r() - 0.5) * 0.1);
            poly(ctx, [{ x: -22, y: 0 }, { x: 22, y: 0 }, { x: 14, y: -h }, { x: -14, y: -h }], c);
            poly(ctx, [{ x: -22, y: 0 }, { x: -6, y: 0 }, { x: -4, y: -h }, { x: -14, y: -h }], shade(c, 0.13));
            // anéis
            ctx.fillStyle = shade(c, -0.3);
            for (let i = 1; i <= 4; i++) {
                const y = -h * (i / 5);
                const w = 22 - (8 * i) / 5;
                ctx.fillRect(-w - 1, y, w * 2 + 2, 4);
            }
            // boca
            ctx.fillStyle = '#2a2624';
            ctx.fillRect(-14, -h - 4, 28, 6);
        },
    },

    silo: {
        w: 90, h: 180, category: 'industrial',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const h = 150 + r() * 40;
            const c = shade(A.concrete, (r() - 0.5) * 0.1);
            poly(ctx, [{ x: -34, y: 0 }, { x: 34, y: 0 }, { x: 34, y: -h }, { x: -34, y: -h }], c);
            poly(ctx, [{ x: -34, y: 0 }, { x: -14, y: 0 }, { x: -14, y: -h }, { x: -34, y: -h }], shade(c, 0.12));
            // cúpula facetada
            poly(ctx, [{ x: -34, y: -h }, { x: 34, y: -h }, { x: 18, y: -h - 22 }, { x: -18, y: -h - 22 }], shade(c, 0.05));
            poly(ctx, [{ x: -18, y: -h - 22 }, { x: 18, y: -h - 22 }, { x: 0, y: -h - 32 }], shade(c, 0.18));
            // mancha de ferrugem escorrida
            ctx.fillStyle = 'rgba(138,90,56,0.5)';
            ctx.fillRect(10 + r() * 10, -h + 8, 5, 30 + r() * 30);
        },
    },

    pipe_rack: {
        w: 150, h: 90, category: 'industrial',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            ctx.strokeStyle = A.metalDark;
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-60, -70); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(60, -70); ctx.stroke();
            const pipeColors = [A.rust, A.metal, shade(A.metal, -0.2)];
            for (let i = 0; i < 3; i++) {
                ctx.strokeStyle = pipeColors[i];
                ctx.lineWidth = 7 - i;
                const y = -66 + i * 12 + (r() - 0.5) * 3;
                ctx.beginPath(); ctx.moveTo(-72, y); ctx.lineTo(72, y); ctx.stroke();
            }
        },
    },

    rubble_pile: {
        w: 130, h: 55, category: 'industrial',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            // monte base
            const pts: Pt[] = [{ x: -60, y: 0 }];
            for (let i = 1; i < 6; i++) {
                pts.push({ x: -60 + (i / 6) * 120, y: -12 - r() * 34 });
            }
            pts.push({ x: 60, y: 0 });
            poly(ctx, pts, shade(A.concrete, -0.2));
            // blocos soltos
            for (let i = 0; i < 6; i++) {
                const x = (r() - 0.5) * 100;
                const y = -r() * 26;
                const s = 6 + r() * 12;
                const c = shade(A.concrete, (r() - 0.5) * 0.3);
                poly(ctx, [
                    { x: x - s, y }, { x: x + s, y },
                    { x: x + s * 0.7, y: y - s }, { x: x - s * 0.8, y: y - s * 0.85 },
                ], c);
            }
            // vergalhões
            ctx.strokeStyle = A.rust;
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const x = (r() - 0.5) * 80;
                ctx.beginPath();
                ctx.moveTo(x, -8);
                ctx.lineTo(x + (r() - 0.5) * 30, -30 - r() * 18);
                ctx.stroke();
            }
        },
    },

    girder_debris: {
        w: 120, h: 60, category: 'industrial',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            ctx.save();
            ctx.rotate(-0.28 + (r() - 0.5) * 0.2);
            const len = 100 + r() * 30;
            poly(ctx, [{ x: -len / 2, y: 0 }, { x: len / 2, y: 0 }, { x: len / 2, y: -6 }, { x: -len / 2, y: -6 }], A.rust);
            poly(ctx, [{ x: -len / 2, y: -6 }, { x: len / 2, y: -6 }, { x: len / 2, y: -9 }, { x: -len / 2, y: -9 }], shade(A.rust, 0.2));
            // furos de treliça
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            for (let x = -len / 2 + 12; x < len / 2 - 8; x += 18) {
                ctx.beginPath(); ctx.arc(x, -3.5, 2.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        },
    },

    radio_tower: {
        w: 80, h: 300, category: 'industrial',
        draw(ctx, seed) {
            const r = mulberry32(seed);
            const h = 260 + r() * 60;
            ctx.strokeStyle = A.metalDark;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-4, -h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(4, -h); ctx.stroke();
            ctx.lineWidth = 2;
            for (let i = 1; i <= 6; i++) {
                const t = i / 7;
                const y = -h * t;
                const sp = 26 * (1 - t * 0.85);
                ctx.beginPath(); ctx.moveTo(-sp, y); ctx.lineTo(sp, y); ctx.stroke();
                const spPrev = 26 * (1 - (t - 1 / 7) * 0.85);
                ctx.beginPath(); ctx.moveTo(-spPrev, y + h / 7); ctx.lineTo(sp, y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(spPrev, y + h / 7); ctx.lineTo(-sp, y); ctx.stroke();
            }
            // antena + luz
            ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0, -h - 24); ctx.stroke();
            ctx.fillStyle = '#e04040';
            ctx.beginPath(); ctx.arc(0, -h - 26, 3, 0, Math.PI * 2); ctx.fill();
        },
    },

    // ---------- OBJETIVO ----------

    flag: {
        w: 60, h: 110, category: 'objetivo',
        draw(ctx, _seed, team = 1) {
            const c = team === 2 ? A.teamRed : A.teamBlue;
            // mastro
            ctx.strokeStyle = '#d8d0c0';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -96); ctx.stroke();
            // base
            poly(ctx, [{ x: -10, y: 0 }, { x: 10, y: 0 }, { x: 7, y: -7 }, { x: -7, y: -7 }], A.metalDark);
            // bandeira ondulada (facetada em 3 segmentos)
            const wave = Math.sin(Date.now() * 0.004) * 5;
            poly(ctx, [
                { x: 0, y: -96 }, { x: 22, y: -92 + wave * 0.5 },
                { x: 22, y: -70 + wave * 0.5 }, { x: 0, y: -66 },
            ], c);
            poly(ctx, [
                { x: 22, y: -92 + wave * 0.5 }, { x: 44, y: -88 + wave },
                { x: 44, y: -66 + wave }, { x: 22, y: -70 + wave * 0.5 },
            ], shade(c, -0.14));
            poly(ctx, [
                { x: 0, y: -96 }, { x: 22, y: -92 + wave * 0.5 },
                { x: 22, y: -81 + wave * 0.5 }, { x: 0, y: -81 },
            ], shade(c, 0.12));
            // topo do mastro
            ctx.fillStyle = '#e8dfa0';
            ctx.beginPath(); ctx.arc(0, -99, 3.5, 0, Math.PI * 2); ctx.fill();
        },
    },
};

/**
 * Desenha um asset da biblioteca em (x, y) — y é a linha do chão.
 */
export function drawAsset(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    scale: number = 1,
    rotation: number = 0,
    seed?: number,
    team?: number
): boolean {
    const def = ASSET_LIBRARY[name];
    if (!def) return false;
    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    ctx.scale(scale, scale);
    // seed padrão derivado da posição → aparência estável por instância
    def.draw(ctx, seed ?? (((x | 0) * 92837111) ^ ((y | 0) * 689287499)), team);
    ctx.restore();
    return true;
}

// ========================
// Painters de paralaxe (fundos)
// ========================

/** Cadeia de montanhas facetadas, para camadas de fundo. */
export function drawMountainRange(
    ctx: CanvasRenderingContext2D,
    startX: number,
    endX: number,
    baseY: number,
    peakHeight: number,
    color: string,
    seed: number
): void {
    const rng = mulberry32(seed);
    const pts: Pt[] = [{ x: startX, y: baseY }];
    let x = startX;
    while (x < endX) {
        x += 220 + rng() * 320;
        pts.push({ x, y: baseY - peakHeight * (0.35 + rng() * 0.65) });
        x += 160 + rng() * 260;
        pts.push({ x, y: baseY - peakHeight * (0.05 + rng() * 0.25) });
    }
    pts.push({ x: x + 200, y: baseY });
    poly(ctx, pts, color);
    // facetas de luz nos picos
    for (let i = 1; i < pts.length - 1; i += 2) {
        const peak = pts[i];
        const next = pts[i + 1];
        if (!next) break;
        poly(ctx, [peak, next, { x: (peak.x + next.x) / 2, y: baseY }], shade(color, 0.08));
    }
}

/** Silhueta de complexo industrial (fábricas, chaminés, tanques) para paralaxe. */
export function drawIndustrialSkyline(
    ctx: CanvasRenderingContext2D,
    startX: number,
    endX: number,
    baseY: number,
    color: string,
    seed: number
): void {
    const rng = mulberry32(seed);
    let x = startX;
    while (x < endX) {
        const kind = rng();
        if (kind < 0.4) {
            // galpão com telhado serrilhado
            const w = 260 + rng() * 200, h = 110 + rng() * 70;
            poly(ctx, [{ x, y: baseY }, { x: x + w, y: baseY }, { x: x + w, y: baseY - h }, { x, y: baseY - h }], color);
            const teeth = 4;
            for (let i = 0; i < teeth; i++) {
                const tx = x + (i / teeth) * w;
                poly(ctx, [
                    { x: tx, y: baseY - h }, { x: tx + w / teeth, y: baseY - h },
                    { x: tx + w / teeth, y: baseY - h - 26 },
                ], color);
            }
            x += w + 60 + rng() * 120;
        } else if (kind < 0.7) {
            // chaminé
            const h = 200 + rng() * 160;
            poly(ctx, [{ x, y: baseY }, { x: x + 34, y: baseY }, { x: x + 26, y: baseY - h }, { x: x + 8, y: baseY - h }], color);
            x += 90 + rng() * 140;
        } else {
            // tanque esférico
            const r = 50 + rng() * 40;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x + r, baseY - r - 16, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(x + r - 5, baseY - 18, 10, 18);
            x += r * 2 + 70 + rng() * 100;
        }
    }
}
