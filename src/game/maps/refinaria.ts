import { Vector2 } from '../../engine/Vector2';
import { MapData, PolygonType, Material, PickupType, SceneryItem, MapPolygon } from '../GameMap';
import { PALETTE } from '../Assets';

/**
 * REFINARIA DO PÂNTANO — mapa Capture the Flag.
 *
 * Layout (esquerda → direita):
 *  [Base Azul: galpão industrial] → rampa → [Pântano Oeste: ponte de madeira]
 *  → [Colina da Refinaria: túnel-caverna embaixo / plataformas de metal em cima]
 *  → [Pântano Leste: ponte] → rampa → [Base Vermelha: fábrica em ruínas]
 *
 * Rotas: superior (topo da colina, exposta, rápida de jato),
 *        média (pontes one-way), inferior (túnel da caverna, protegida).
 */

const P = PALETTE;
const BOTTOM = 2400;
const V = (x: number, y: number) => new Vector2(x, y);

/** Coluna sólida de terreno do topo até o fundo do mapa */
function ground(
    x1: number, y1: number, x2: number, y2: number,
    color: string, material: Material, grassTop?: string
): MapPolygon {
    return {
        vertices: [V(x1, y1), V(x2, y2), V(x2, BOTTOM), V(x1, BOTTOM)],
        type: PolygonType.SOLID,
        color, material,
        facet: true,
        grassTop,
    };
}

/** Plataforma one-way fina */
function platform(x1: number, x2: number, y: number, color: string, material: Material): MapPolygon {
    return {
        vertices: [V(x1, y), V(x2, y), V(x2, y + 16), V(x1, y + 16)],
        type: PolygonType.ONE_WAY,
        color, material,
        facet: true,
    };
}

const scenery: SceneryItem[] = [
    // ===== BASE AZUL (x -100..1500, chão 600) =====
    { x: 180, y: 600, type: 'watch_tower', zIndex: -1 },
    { x: 620, y: 600, type: 'sandbags', zIndex: 1 },
    { x: 760, y: 600, type: 'crate', zIndex: 1 },
    { x: 820, y: 600, type: 'crate', zIndex: 1, scale: 0.7 },
    { x: 950, y: 600, type: 'barrel', zIndex: 1 },
    { x: 1100, y: 600, type: 'fence', zIndex: -2 },
    { x: 1300, y: 600, type: 'tank_trap', zIndex: 1 },
    { x: 520, y: 600, type: 'grass_tuft', zIndex: 1 },
    { x: 880, y: 600, type: 'grass_tuft', zIndex: 1 },
    { x: 60, y: 600, type: 'pine_tree', zIndex: -2 },

    // rampa oeste
    { x: 1800, y: 780, type: 'boulder', zIndex: -1, scale: 0.7 },
    { x: 2050, y: 890, type: 'bush', zIndex: 1 },

    // ===== PÂNTANO OESTE (x 2200..4600, chão 950) =====
    { x: 2400, y: 950, type: 'cattail', zIndex: 1 },
    { x: 2560, y: 950, type: 'swamp_log', zIndex: -1 },
    { x: 2900, y: 950, type: 'truck_wreck', zIndex: -1 },
    { x: 3200, y: 950, type: 'cattail', zIndex: 1 },
    { x: 3350, y: 950, type: 'dead_tree', zIndex: -2 },
    { x: 3700, y: 950, type: 'girder_debris', zIndex: -1 },
    { x: 3950, y: 950, type: 'cattail', zIndex: 1 },
    { x: 4100, y: 950, type: 'swamp_log', zIndex: 1, scale: 0.8 },
    { x: 4350, y: 950, type: 'bush', zIndex: -1 },
    { x: 2700, y: 950, type: 'grass_tuft', zIndex: 1 },
    { x: 3500, y: 950, type: 'grass_tuft', zIndex: 1 },

    // degrau de acesso ao topo (oeste)
    { x: 4400, y: 760, type: 'boulder', zIndex: -1, scale: 0.6 },

    // ===== COLINA DA REFINARIA (topo do teto: 250) =====
    { x: 5000, y: 250, type: 'chimney', zIndex: -2 },
    { x: 5350, y: 250, type: 'silo', zIndex: -2 },
    { x: 5700, y: 250, type: 'pipe_rack', zIndex: -2 },
    { x: 6200, y: 250, type: 'radio_tower', zIndex: -2 },
    { x: 6700, y: 250, type: 'sandbags', zIndex: 1 },
    { x: 6950, y: 250, type: 'rubble_pile', zIndex: -1 },
    { x: 7300, y: 250, type: 'barrel', zIndex: -1 },
    { x: 7380, y: 250, type: 'barrel', zIndex: -1, scale: 0.85 },
    { x: 5550, y: 250, type: 'tank_trap', zIndex: 1, scale: 0.8 },
    { x: 6450, y: 250, type: 'grass_tuft', zIndex: 1 },

    // interior da caverna (chão 950) — zIndex 1: o fundo da caverna cobriria itens "atrás"
    { x: 5000, y: 950, type: 'crate', zIndex: 1 },
    { x: 5450, y: 950, type: 'barrel', zIndex: 1 },
    { x: 6150, y: 950, type: 'rubble_pile', zIndex: 1, scale: 0.7 },
    { x: 7100, y: 950, type: 'girder_debris', zIndex: 1, scale: 0.8 },
    { x: 7500, y: 950, type: 'ladder', zIndex: 1 },

    // degrau leste
    { x: 8000, y: 760, type: 'boulder', zIndex: -1, scale: 0.6 },

    // ===== PÂNTANO LESTE (x 7800..10000, chão 950) =====
    { x: 8300, y: 950, type: 'cattail', zIndex: 1 },
    { x: 8500, y: 950, type: 'rubble_pile', zIndex: -1 },
    { x: 8850, y: 950, type: 'dead_tree', zIndex: -2 },
    { x: 9100, y: 950, type: 'swamp_log', zIndex: -1 },
    { x: 9400, y: 950, type: 'girder_debris', zIndex: -1 },
    { x: 9650, y: 950, type: 'cattail', zIndex: 1 },
    { x: 9800, y: 950, type: 'bush', zIndex: 1 },
    { x: 8700, y: 950, type: 'grass_tuft', zIndex: 1 },

    // rampa leste
    { x: 10350, y: 830, type: 'boulder', zIndex: -1, scale: 0.7 },

    // ===== BASE VERMELHA (x 10700..12100, chão 600) =====
    { x: 10850, y: 600, type: 'tank_trap', zIndex: 1 },
    { x: 11000, y: 600, type: 'fence', zIndex: -2 },
    { x: 11200, y: 600, type: 'barrel', zIndex: 1 },
    { x: 11350, y: 600, type: 'sandbags', zIndex: 1 },
    { x: 11500, y: 600, type: 'crate', zIndex: 1 },
    { x: 11560, y: 600, type: 'crate', zIndex: 1, scale: 0.7 },
    { x: 11920, y: 600, type: 'watch_tower', zIndex: -1 },
    { x: 11750, y: 600, type: 'grass_tuft', zIndex: 1 },
    { x: 12050, y: 600, type: 'pine_tree', zIndex: -2 },
];

export const refinaria: MapData = {
    name: 'Refinaria do Pântano — CTF',
    bgColor: '#b8ccc0',
    bgGradientTop: '#9fc4bc',
    bgGradientBottom: '#d8cfa4',
    bounds: { left: -400, top: -1600, right: 12400, bottom: BOTTOM },

    weather: {
        type: 'rain',
        intensity: 0.12,
        windX: -0.8,
        color: 'rgba(190,210,200,0.30)',
    },

    spawns: [
        // Time 1 (Azul) — base oeste
        { position: V(250, 540), team: 1 },
        { position: V(500, 540), team: 1 },
        { position: V(750, 540), team: 1 },
        { position: V(1000, 540), team: 1 },
        // Time 2 (Vermelho) — base leste
        { position: V(11750, 540), team: 2 },
        { position: V(11500, 540), team: 2 },
        { position: V(11250, 540), team: 2 },
        { position: V(11000, 540), team: 2 },
    ],

    pickups: [
        { x: 700, y: 590, type: PickupType.HEALTH, timer: 0 },
        { x: 1200, y: 590, type: PickupType.GRENADES, timer: 0 },
        { x: 3400, y: 720, type: PickupType.HEALTH, timer: 0 },   // ponte oeste
        { x: 2800, y: 940, type: PickupType.GRENADES, timer: 0 },
        { x: 6200, y: 940, type: PickupType.HEALTH, timer: 0 },   // caverna central
        { x: 6100, y: 230, type: PickupType.GRENADES, timer: 0 }, // topo da colina
        { x: 5600, y: 230, type: PickupType.HEALTH, timer: 0 },
        { x: 9000, y: 720, type: PickupType.HEALTH, timer: 0 },   // ponte leste
        { x: 9500, y: 940, type: PickupType.GRENADES, timer: 0 },
        { x: 11400, y: 590, type: PickupType.HEALTH, timer: 0 },
        { x: 10900, y: 590, type: PickupType.GRENADES, timer: 0 },
    ],

    scenery,

    parallaxLayers: [
        {
            zIndex: -4,
            scrollFactor: 0.05,
            elements: [
                {
                    type: 'painter', painter: 'mountains', x: 0, y: 0,
                    painterArgs: [-2000, 4000, 820, 560], color: '#a8b8a4', opacity: 0.75, seed: 11,
                },
            ],
        },
        {
            zIndex: -3,
            scrollFactor: 0.12,
            elements: [
                {
                    type: 'painter', painter: 'industrial', x: 0, y: 0,
                    painterArgs: [-1500, 3200, 780], color: '#8a9a8c', opacity: 0.8, seed: 23,
                },
            ],
        },
        {
            zIndex: -2,
            scrollFactor: 0.25,
            elements: [
                {
                    type: 'painter', painter: 'mountains', x: 0, y: 0,
                    painterArgs: [-1200, 4200, 900, 380], color: '#7e9478', opacity: 0.9, seed: 37,
                },
            ],
        },
    ],

    polygons: [
        // ===== PAREDES LATERAIS =====
        {
            vertices: [V(-400, -1600), V(-100, -1600), V(-100, BOTTOM), V(-400, BOTTOM)],
            type: PolygonType.SOLID, material: Material.ROCK, color: P.rockDark, facet: true,
        },
        {
            vertices: [V(12100, -1600), V(12400, -1600), V(12400, BOTTOM), V(12100, BOTTOM)],
            type: PolygonType.SOLID, material: Material.ROCK, color: P.rockDark, facet: true,
        },

        // ===== FUNDO DA CAVERNA (interior escuro, atrás de tudo) =====
        {
            vertices: [V(4600, 650), V(7800, 650), V(7800, 950), V(4600, 950)],
            type: PolygonType.BACKGROUND, color: '#3a3830', facet: true,
        },
        // interior do galpão azul
        {
            vertices: [V(300, 320), V(1000, 320), V(1000, 600), V(300, 600)],
            type: PolygonType.BACKGROUND, color: '#6e7a74', facet: true,
        },
        // interior da fábrica vermelha
        {
            vertices: [V(11200, 320), V(11900, 320), V(11900, 600), V(11200, 600)],
            type: PolygonType.BACKGROUND, color: '#7a6e6a', facet: true,
        },
        // água do pântano (visual, atrás do jogador)
        {
            vertices: [V(2200, 905), V(4600, 905), V(4600, 950), V(2200, 950)],
            type: PolygonType.BACKGROUND, color: 'rgba(74,104,94,0.85)',
        },
        {
            vertices: [V(7800, 905), V(10000, 905), V(10000, 950), V(7800, 950)],
            type: PolygonType.BACKGROUND, color: 'rgba(74,104,94,0.85)',
        },

        // ===== TERRENO PRINCIPAL (oeste → leste) =====
        // Base Azul (planalto)
        ground(-100, 600, 1500, 600, P.dirt, Material.GRASS, P.grass),
        // Rampa descendo ao pântano
        ground(1500, 600, 2200, 950, P.dirt, Material.DIRT, P.grassDark),
        // Pântano Oeste
        ground(2200, 950, 4600, 950, P.swamp, Material.DIRT, '#66804e'),
        // Chão da caverna (colina central)
        ground(4600, 950, 7800, 950, P.rockDark, Material.ROCK),
        // Pântano Leste
        ground(7800, 950, 10000, 950, P.swamp, Material.DIRT, '#66804e'),
        // Rampa subindo à base vermelha
        ground(10000, 950, 10700, 600, P.dirt, Material.DIRT, P.grassDark),
        // Base Vermelha (planalto)
        ground(10700, 600, 12100, 600, P.dirt, Material.GRASS, P.grass),

        // ===== COLINA DA REFINARIA: LAJE-TETO (rota superior + teto da caverna) =====
        {
            vertices: [V(4600, 250), V(7800, 250), V(7800, 650), V(4600, 650)],
            type: PolygonType.SOLID, material: Material.ROCK, color: P.rock, facet: true, grassTop: P.grassDark,
        },
        // Pilares de sustentação dentro da caverna (dividem o túnel em câmaras)
        {
            vertices: [V(5600, 650), V(5800, 650), V(5800, 950), V(5600, 950)],
            type: PolygonType.SOLID, material: Material.ROCK, color: P.rockDark, facet: true,
        },
        {
            vertices: [V(6600, 650), V(6800, 650), V(6800, 950), V(6600, 950)],
            type: PolygonType.SOLID, material: Material.ROCK, color: P.rockDark, facet: true,
        },
        // Encostas laterais da laje (rampas de acesso ao topo)
        {
            vertices: [V(4200, 760), V(4600, 650), V(4600, 950), V(4200, 950)],
            type: PolygonType.SOLID, material: Material.ROCK, color: P.rock, facet: true, grassTop: P.grassDark,
        },
        {
            vertices: [V(7800, 650), V(8200, 760), V(8200, 950), V(7800, 950)],
            type: PolygonType.SOLID, material: Material.ROCK, color: P.rock, facet: true, grassTop: P.grassDark,
        },
        // Degraus rochosos para subir na laje
        {
            vertices: [V(4200, 500), V(4600, 420), V(4600, 650), V(4200, 760)],
            type: PolygonType.SOLID, material: Material.ROCK, color: P.rockDark, facet: true,
        },
        {
            vertices: [V(7800, 420), V(8200, 500), V(8200, 760), V(7800, 650)],
            type: PolygonType.SOLID, material: Material.ROCK, color: P.rockDark, facet: true,
        },

        // ===== ESTRUTURAS DAS BASES (telhados sólidos - defesa) =====
        // Galpão azul: telhado
        {
            vertices: [V(280, 300), V(1020, 300), V(1020, 340), V(280, 340)],
            type: PolygonType.SOLID, material: Material.METAL, color: P.metal, facet: true,
        },
        // paredes curtas do galpão (deixam vãos de porta)
        {
            vertices: [V(280, 340), V(320, 340), V(320, 480), V(280, 480)],
            type: PolygonType.SOLID, material: Material.METAL, color: P.metalDark, facet: true,
        },
        {
            vertices: [V(980, 340), V(1020, 340), V(1020, 480), V(980, 480)],
            type: PolygonType.SOLID, material: Material.METAL, color: P.metalDark, facet: true,
        },
        // Fábrica vermelha: telhado
        {
            vertices: [V(11180, 300), V(11920, 300), V(11920, 340), V(11180, 340)],
            type: PolygonType.SOLID, material: Material.METAL, color: P.rust, facet: true,
        },
        {
            vertices: [V(11180, 340), V(11220, 340), V(11220, 480), V(11180, 480)],
            type: PolygonType.SOLID, material: Material.METAL, color: P.metalDark, facet: true,
        },
        {
            vertices: [V(11880, 340), V(11920, 340), V(11920, 480), V(11880, 480)],
            type: PolygonType.SOLID, material: Material.METAL, color: P.metalDark, facet: true,
        },

        // ===== PLATAFORMAS ONE-WAY =====
        // Pontes de madeira sobre os pântanos
        platform(2500, 4400, 740, P.wood, Material.WOOD),
        platform(8000, 9900, 740, P.wood, Material.WOOD),
        // Passarelas de metal sobre a colina
        platform(5200, 5900, 120, P.metal, Material.METAL),
        platform(6500, 7200, 120, P.metal, Material.METAL),
        // Sacadas das bases
        platform(1050, 1480, 420, P.metal, Material.METAL),
        platform(10720, 11150, 420, P.metal, Material.METAL),
        // Plataformas intermediárias nas rampas (fluxo vertical)
        platform(1900, 2250, 700, P.wood, Material.WOOD),
        platform(9950, 10300, 700, P.wood, Material.WOOD),
    ],
};

/** Posições das bandeiras CTF (linha do chão de cada base) */
export const REFINARIA_FLAGS = {
    blue: V(400, 600),
    red: V(11700, 600),
};
