import { PolygonType, Material } from '../game/GameMap';
import { EditVertex } from './MapEditor';

export interface PresetDef {
    id: string;
    name: string;
    category: 'ground' | 'wall' | 'slope' | 'platform' | 'special' | 'background';
    type: PolygonType;
    material: Material;
    color: string;
    vertices: EditVertex[];  // Centred at (0,0)
    /** Natural width for thumbnail scaling */
    w: number;
    /** Natural height for thumbnail scaling */
    h: number;
}

// ─── Colour map per material ───────────────────
export const MATERIAL_COLORS: Record<string, string> = {
    [Material.DIRT]: '#9b7a4a',
    [Material.ROCK]: '#6b6b6b',
    [Material.METAL]: '#7a9baa',
    [Material.CONCRETE]: '#8a8a8a',
    [Material.WOOD]: '#8B6914',
    [Material.GRASS]: '#4a8a4a',
};

// ─── Shape helpers ─────────────────────────────
function rect(w: number, h: number): EditVertex[] {
    return [
        { x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 },
        { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 },
    ];
}
function slopeRight(w: number, h: number): EditVertex[] {
    // Flat bottom, rises on right
    return [{ x: -w / 2, y: h / 2 }, { x: w / 2, y: h / 2 }, { x: w / 2, y: -h / 2 }];
}
function slopeLeft(w: number, h: number): EditVertex[] {
    // Flat bottom, rises on left
    return [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }];
}
function triangle(w: number, h: number): EditVertex[] {
    return [{ x: -w / 2, y: h / 2 }, { x: 0, y: -h / 2 }, { x: w / 2, y: h / 2 }];
}

// ─── Preset library ────────────────────────────
export const PRESETS: PresetDef[] = [
    // GROUND ─────────────────────────────────────
    { id: 'g1', name: 'Chão Terra', category: 'ground', type: PolygonType.SOLID, material: Material.DIRT, color: MATERIAL_COLORS[Material.DIRT], vertices: rect(300, 50), w: 300, h: 50 },
    { id: 'g2', name: 'Chão Grama', category: 'ground', type: PolygonType.SOLID, material: Material.GRASS, color: MATERIAL_COLORS[Material.GRASS], vertices: rect(300, 50), w: 300, h: 50 },
    { id: 'g3', name: 'Chão Concreto', category: 'ground', type: PolygonType.SOLID, material: Material.CONCRETE, color: MATERIAL_COLORS[Material.CONCRETE], vertices: rect(300, 40), w: 300, h: 40 },
    { id: 'g4', name: 'Chão Rocha', category: 'ground', type: PolygonType.SOLID, material: Material.ROCK, color: MATERIAL_COLORS[Material.ROCK], vertices: rect(300, 60), w: 300, h: 60 },
    { id: 'g5', name: 'Chão Metal', category: 'ground', type: PolygonType.SOLID, material: Material.METAL, color: MATERIAL_COLORS[Material.METAL], vertices: rect(300, 30), w: 300, h: 30 },
    { id: 'g6', name: 'Chão Madeira', category: 'ground', type: PolygonType.SOLID, material: Material.WOOD, color: MATERIAL_COLORS[Material.WOOD], vertices: rect(300, 40), w: 300, h: 40 },

    // WALL ───────────────────────────────────────
    { id: 'w1', name: 'Parede Alta', category: 'wall', type: PolygonType.SOLID, material: Material.CONCRETE, color: MATERIAL_COLORS[Material.CONCRETE], vertices: rect(40, 250), w: 40, h: 250 },
    { id: 'w2', name: 'Parede Rocha', category: 'wall', type: PolygonType.SOLID, material: Material.ROCK, color: MATERIAL_COLORS[Material.ROCK], vertices: rect(50, 200), w: 50, h: 200 },
    { id: 'w3', name: 'Parede Metal', category: 'wall', type: PolygonType.SOLID, material: Material.METAL, color: MATERIAL_COLORS[Material.METAL], vertices: rect(35, 200), w: 35, h: 200 },
    { id: 'w4', name: 'Parede Madeira', category: 'wall', type: PolygonType.SOLID, material: Material.WOOD, color: MATERIAL_COLORS[Material.WOOD], vertices: rect(30, 150), w: 30, h: 150 },

    // SLOPE ──────────────────────────────────────
    { id: 's1', name: 'Rampa → Terra', category: 'slope', type: PolygonType.SOLID, material: Material.DIRT, color: MATERIAL_COLORS[Material.DIRT], vertices: slopeRight(200, 100), w: 200, h: 100 },
    { id: 's2', name: 'Rampa ← Terra', category: 'slope', type: PolygonType.SOLID, material: Material.DIRT, color: MATERIAL_COLORS[Material.DIRT], vertices: slopeLeft(200, 100), w: 200, h: 100 },
    { id: 's3', name: 'Rampa → Rocha', category: 'slope', type: PolygonType.SOLID, material: Material.ROCK, color: MATERIAL_COLORS[Material.ROCK], vertices: slopeRight(150, 80), w: 150, h: 80 },
    { id: 's4', name: 'Rampa ← Rocha', category: 'slope', type: PolygonType.SOLID, material: Material.ROCK, color: MATERIAL_COLORS[Material.ROCK], vertices: slopeLeft(150, 80), w: 150, h: 80 },

    // PLATFORM ───────────────────────────────────
    { id: 'p1', name: 'Plat. Madeira', category: 'platform', type: PolygonType.ONE_WAY, material: Material.WOOD, color: MATERIAL_COLORS[Material.WOOD], vertices: rect(180, 18), w: 180, h: 18 },
    { id: 'p2', name: 'Plat. Metal', category: 'platform', type: PolygonType.ONE_WAY, material: Material.METAL, color: MATERIAL_COLORS[Material.METAL], vertices: rect(150, 14), w: 150, h: 14 },
    { id: 'p3', name: 'Plat. Pedra', category: 'platform', type: PolygonType.ONE_WAY, material: Material.ROCK, color: MATERIAL_COLORS[Material.ROCK], vertices: rect(130, 20), w: 130, h: 20 },

    // SPECIAL ────────────────────────────────────
    { id: 'sp1', name: 'Trampolim', category: 'special', type: PolygonType.BOUNCY, material: Material.METAL, color: '#cc8833', vertices: rect(120, 22), w: 120, h: 22 },
    { id: 'sp2', name: 'Zona Mortal', category: 'special', type: PolygonType.DEADLY, material: Material.METAL, color: '#cc3333', vertices: rect(160, 22), w: 160, h: 22 },
    { id: 'sp3', name: 'Bloco Sólido', category: 'special', type: PolygonType.SOLID, material: Material.CONCRETE, color: MATERIAL_COLORS[Material.CONCRETE], vertices: rect(80, 80), w: 80, h: 80 },

    // BACKGROUND ─────────────────────────────────
    { id: 'bg1', name: 'Montanha', category: 'background', type: PolygonType.BACKGROUND, material: Material.ROCK, color: '#556070', vertices: triangle(400, 250), w: 400, h: 250 },
    { id: 'bg2', name: 'Pedra BG', category: 'background', type: PolygonType.BACKGROUND, material: Material.ROCK, color: '#445060', vertices: rect(200, 150), w: 200, h: 150 },
];

export const CATEGORIES: { key: PresetDef['category']; label: string }[] = [
    { key: 'ground', label: 'Chão' },
    { key: 'wall', label: 'Parede' },
    { key: 'slope', label: 'Rampa' },
    { key: 'platform', label: 'Plat.' },
    { key: 'special', label: 'Especial' },
    { key: 'background', label: 'BG' },
];
