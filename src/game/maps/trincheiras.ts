import { Vector2 } from '../../engine/Vector2';
import { MapData, PolygonType, Material, PickupType } from '../GameMap';

/**
 * Trincheiras — A large Soldat-style symmetrical warfare map.
 *
 * Layout (6 sections wide, 3 levels tall):
 *
 *  ┌────────────────────────────────────────────────────────────────────┐
 *  │   [Left Cliff]   [Upper Bridge]   [Peak]   [Upper Bridge]   [Right Cliff]  │  ← Sky / Upper (y -400..600)
 *  │──── Ground Left ──── Ramp ──── Valley ──── Ramp ──── Ground Right ────│  ← Mid (y 600..1600)
 *  │   [Left Cave]──────────── Underground Tunnel ────────────[Right Cave]  │  ← Lower (y 1600..3200)
 *  └────────────────────────────────────────────────────────────────────┘
 *
 * Bounds: left=-800  top=-600  right=11500  bottom=3400
 */
export const trincheiras: MapData = {
    name: 'Trincheiras',
    bgColor: '#0d1a2e',
    bgGradientTop: '#0a1020',
    bgGradientBottom: '#1a2a3a',
    bounds: { left: -800, top: -600, right: 11500, bottom: 3400 },

    weather: {
        type: 'rain',
        intensity: 0.35,
        windX: -1.5,
        color: 'rgba(140,160,240,0.35)',
    },

    spawns: [
        // Team 1 — Left side
        { position: new Vector2(150, 420), team: 1 },
        { position: new Vector2(350, 420), team: 1 },
        { position: new Vector2(250, 1180), team: 1 },
        { position: new Vector2(500, 1180), team: 1 },
        // Neutral / deathmatch
        { position: new Vector2(2600, 320), team: 0 },
        { position: new Vector2(5500, 160), team: 0 },
        { position: new Vector2(8800, 320), team: 0 },
        // Team 2 — Right side
        { position: new Vector2(11100, 420), team: 2 },
        { position: new Vector2(10900, 420), team: 2 },
        { position: new Vector2(10950, 1180), team: 2 },
        { position: new Vector2(10700, 1180), team: 2 },
    ],

    pickups: [
        // Health
        { x: 400, y: 465, type: PickupType.HEALTH, timer: 0 },
        { x: 2200, y: 365, type: PickupType.HEALTH, timer: 0 },
        { x: 5500, y: 145, type: PickupType.HEALTH, timer: 0 },
        { x: 8200, y: 365, type: PickupType.HEALTH, timer: 0 },
        { x: 10900, y: 465, type: PickupType.HEALTH, timer: 0 },
        // Underground health
        { x: 1000, y: 2280, type: PickupType.HEALTH, timer: 0 },
        { x: 5500, y: 2280, type: PickupType.HEALTH, timer: 0 },
        { x: 10000, y: 2280, type: PickupType.HEALTH, timer: 0 },
        // Grenades
        { x: 700, y: 465, type: PickupType.GRENADES, timer: 0 },
        { x: 3400, y: 465, type: PickupType.GRENADES, timer: 0 },
        { x: 7000, y: 465, type: PickupType.GRENADES, timer: 0 },
        { x: 10600, y: 465, type: PickupType.GRENADES, timer: 0 },
    ],

    scenery: [
        // Left base
        { x: 200, y: 465, type: 'sandbag', zIndex: -1 },
        { x: 240, y: 465, type: 'sandbag', zIndex: -1 },
        { x: 600, y: 465, type: 'crate', zIndex: -1 },
        { x: 640, y: 465, type: 'crate', zIndex: -1, scale: 0.8 },
        { x: 100, y: 465, type: 'barrel', zIndex: -1 },
        // Left flag
        { x: 550, y: 465, type: 'flag', zIndex: -1, team: 1 },
        // Left raised area
        { x: 1600, y: 1085, type: 'pillar', zIndex: -1, scale: 1.2, color: '#556' },
        // Centre mountain
        { x: 5200, y: 145, type: 'bush', zIndex: -1 },
        { x: 5700, y: 145, type: 'bush', zIndex: -1 },
        // Right flag
        { x: 10750, y: 465, type: 'flag', zIndex: -1, team: 2 },
        // Right base
        { x: 10600, y: 465, type: 'sandbag', zIndex: -1 },
        { x: 10640, y: 465, type: 'sandbag', zIndex: -1 },
        { x: 10660, y: 465, type: 'crate', zIndex: -1 },
        { x: 11000, y: 465, type: 'barrel', zIndex: -1 },
        // Underground props
        { x: 2500, y: 2465, type: 'barrel', zIndex: -1 },
        { x: 4500, y: 2465, type: 'sign', zIndex: -1 },
        { x: 8500, y: 2465, type: 'sign', zIndex: -1 },
    ],

    parallaxLayers: [
        {
            zIndex: -3,
            scrollFactor: 0.04,
            elements: [
                { type: 'rect', x: 800, y: -200, width: 350, height: 200, color: 'rgba(200,220,255,0.15)', opacity: 0.15 },
                { type: 'rect', x: 3000, y: -300, width: 450, height: 250, color: 'rgba(200,220,255,0.12)', opacity: 0.12 },
                { type: 'rect', x: 6000, y: -200, width: 300, height: 180, color: 'rgba(200,220,255,0.18)', opacity: 0.18 },
                { type: 'rect', x: 9500, y: -280, width: 400, height: 220, color: 'rgba(200,220,255,0.13)', opacity: 0.13 },
            ],
        },
    ],

    polygons: [

        // ════════════════════════════════════════════
        // 1. FAR LEFT WALL / BORDER
        // ════════════════════════════════════════════
        {
            vertices: [
                new Vector2(-800, -600), new Vector2(-100, -600),
                new Vector2(-100, 3400), new Vector2(-800, 3400),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#444455',
            shadowColor: 'rgba(0,0,0,0.6)',
        },

        // ════════════════════════════════════════════
        // 2. FAR RIGHT WALL / BORDER
        // ════════════════════════════════════════════
        {
            vertices: [
                new Vector2(11300, -600), new Vector2(11800, -600),
                new Vector2(11800, 3400), new Vector2(11300, 3400),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#444455',
            shadowColor: 'rgba(0,0,0,0.6)',
        },

        // ════════════════════════════════════════════
        // 3. LEFT CLIFF FACE & BASE (MAIN GROUND)
        //    Dirt/rock cliff rising high on the left
        // ════════════════════════════════════════════
        // Left base ground slab
        {
            vertices: [
                new Vector2(-100, 460), new Vector2(1800, 460),
                new Vector2(1800, 3400), new Vector2(-100, 3400),
            ],
            type: PolygonType.SOLID,
            material: Material.DIRT,
            color: '#5a4232',
            shadowColor: 'rgba(0,0,0,0.5)',
        },
        // Left upper cliff overhang
        {
            vertices: [
                new Vector2(-100, -600), new Vector2(900, -600),
                new Vector2(900, 200), new Vector2(400, 460), new Vector2(-100, 460),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#4a4050',
            shadowColor: 'rgba(0,0,0,0.55)',
        },
        // Left cliff face detail layer (cracked rock face)
        {
            vertices: [
                new Vector2(850, 50), new Vector2(1200, 200),
                new Vector2(1200, 460), new Vector2(900, 460), new Vector2(850, 200),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#554455',
            shadowColor: 'rgba(0,0,0,0.4)',
        },
        // Grassy ledge on top of left cliff
        {
            vertices: [
                new Vector2(200, -10), new Vector2(850, -10),
                new Vector2(850, 50), new Vector2(200, 50),
            ],
            type: PolygonType.SOLID,
            material: Material.GRASS,
            color: '#2a5a2a',
        },

        // ════════════════════════════════════════════
        // 4. LEFT RAISED PLATFORM (mid-left)
        // ════════════════════════════════════════════
        // Platform surface
        {
            vertices: [
                new Vector2(1200, 460), new Vector2(2800, 460),
                new Vector2(2800, 600), new Vector2(1200, 600),
            ],
            type: PolygonType.SOLID,
            material: Material.DIRT,
            color: '#5a4232',
            shadowColor: 'rgba(0,0,0,0.4)',
        },
        // Under platform fill
        {
            vertices: [
                new Vector2(1800, 600), new Vector2(2800, 600),
                new Vector2(2800, 3400), new Vector2(1800, 3400),
            ],
            type: PolygonType.SOLID,
            material: Material.DIRT,
            color: '#4a3428',
        },
        // Left side ramp up to raised area (going from base toward centre)
        {
            vertices: [
                new Vector2(1200, 200), new Vector2(2000, 460),
                new Vector2(1200, 460),
            ],
            type: PolygonType.SOLID,
            material: Material.GRASS,
            color: '#2a5a22',
        },

        // ════════════════════════════════════════════
        // 5. LEFT-CENTRE VALLEY + RAMP
        // ════════════════════════════════════════════
        // Ramp from raised platform down to valley
        {
            vertices: [
                new Vector2(2800, 460), new Vector2(3400, 760),
                new Vector2(2800, 760),
            ],
            type: PolygonType.SOLID,
            material: Material.DIRT,
            color: '#6a5040',
        },
        // Valley floor fill (left side of valley)
        {
            vertices: [
                new Vector2(2800, 760), new Vector2(4200, 760),
                new Vector2(4200, 3400), new Vector2(2800, 3400),
            ],
            type: PolygonType.SOLID,
            material: Material.CONCRETE,
            color: '#404050',
            shadowColor: 'rgba(0,0,0,0.4)',
        },
        // Lower access ramp left side
        {
            vertices: [
                new Vector2(2800, 1600), new Vector2(3200, 1800),
                new Vector2(2800, 1800),
            ],
            type: PolygonType.SOLID,
            material: Material.CONCRETE,
            color: '#383848',
        },

        // ════════════════════════════════════════════
        // 6. CENTRAL PEAK / MOUNTAIN
        // ════════════════════════════════════════════
        // Mountain body
        {
            vertices: [
                new Vector2(4200, 760), new Vector2(5500, -200),
                new Vector2(6800, 760),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#4a4555',
            shadowColor: 'rgba(0,0,0,0.5)',
        },
        // Grass top of central peak
        {
            vertices: [
                new Vector2(5100, 200), new Vector2(5500, -200),
                new Vector2(5900, 200), new Vector2(5500, 240),
            ],
            type: PolygonType.SOLID,
            material: Material.GRASS,
            color: '#2a6022',
        },
        // Left shoulder of mountain (extends the slope)
        {
            vertices: [
                new Vector2(3800, 760), new Vector2(4500, 580),
                new Vector2(4800, 760),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#454065',
        },
        // Right shoulder of mountain
        {
            vertices: [
                new Vector2(6200, 760), new Vector2(6500, 580),
                new Vector2(7200, 760),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#454065',
        },
        // Mountain base fill (centre)
        {
            vertices: [
                new Vector2(4200, 760), new Vector2(6800, 760),
                new Vector2(6800, 3400), new Vector2(4200, 3400),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#3a3545',
        },

        // ════════════════════════════════════════════
        // 7. RIGHT-CENTRE VALLEY + RAMP (mirror of 5)
        // ════════════════════════════════════════════
        {
            vertices: [
                new Vector2(6800, 760), new Vector2(8200, 760),
                new Vector2(8200, 3400), new Vector2(6800, 3400),
            ],
            type: PolygonType.SOLID,
            material: Material.CONCRETE,
            color: '#404050',
            shadowColor: 'rgba(0,0,0,0.4)',
        },
        // Right valley ramp
        {
            vertices: [
                new Vector2(7600, 460), new Vector2(8200, 760),
                new Vector2(7600, 760),
            ],
            type: PolygonType.SOLID,
            material: Material.DIRT,
            color: '#6a5040',
        },
        // Lower access ramp right side
        {
            vertices: [
                new Vector2(8200, 1600), new Vector2(8200, 1800),
                new Vector2(7800, 1800),
            ],
            type: PolygonType.SOLID,
            material: Material.CONCRETE,
            color: '#383848',
        },

        // ════════════════════════════════════════════
        // 8. RIGHT RAISED PLATFORM (mirror of 4)
        // ════════════════════════════════════════════
        {
            vertices: [
                new Vector2(8200, 460), new Vector2(9800, 460),
                new Vector2(9800, 600), new Vector2(8200, 600),
            ],
            type: PolygonType.SOLID,
            material: Material.DIRT,
            color: '#5a4232',
            shadowColor: 'rgba(0,0,0,0.4)',
        },
        {
            vertices: [
                new Vector2(8200, 600), new Vector2(9200, 600),
                new Vector2(9200, 3400), new Vector2(8200, 3400),
            ],
            type: PolygonType.SOLID,
            material: Material.DIRT,
            color: '#4a3428',
        },
        // Right ramp from flat area up toward right cliff
        {
            vertices: [
                new Vector2(9000, 460), new Vector2(9800, 200),
                new Vector2(9800, 460),
            ],
            type: PolygonType.SOLID,
            material: Material.GRASS,
            color: '#2a5a22',
        },

        // ════════════════════════════════════════════
        // 9. RIGHT CLIFF FACE & BASE (mirror of 3)
        // ════════════════════════════════════════════
        {
            vertices: [
                new Vector2(9200, 460), new Vector2(11300, 460),
                new Vector2(11300, 3400), new Vector2(9200, 3400),
            ],
            type: PolygonType.SOLID,
            material: Material.DIRT,
            color: '#5a4232',
            shadowColor: 'rgba(0,0,0,0.5)',
        },
        // Right upper cliff
        {
            vertices: [
                new Vector2(10100, -600), new Vector2(11300, -600),
                new Vector2(11300, 460), new Vector2(10600, 460), new Vector2(10100, 200),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#4a4050',
            shadowColor: 'rgba(0,0,0,0.55)',
        },
        // Right cliff face rock detail
        {
            vertices: [
                new Vector2(9800, 50), new Vector2(10100, 200),
                new Vector2(10100, 460), new Vector2(9800, 460),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#554455',
        },
        // Grassy ledge right cliff top
        {
            vertices: [
                new Vector2(10100, -10), new Vector2(10750, -10),
                new Vector2(10750, 50), new Vector2(10100, 50),
            ],
            type: PolygonType.SOLID,
            material: Material.GRASS,
            color: '#2a5a2a',
        },

        // ════════════════════════════════════════════
        // 10. UNDERGROUND — WIDE TUNNEL
        //     Running the full width at y 2300..2550
        // ════════════════════════════════════════════
        // Left underground cave entry (carved mouth into left base)
        {
            vertices: [
                new Vector2(-100, 2300), new Vector2(1200, 2300),
                new Vector2(1200, 2550), new Vector2(-100, 2550),
            ],
            type: PolygonType.BACKGROUND,
            material: Material.ROCK,
            color: '#1a1520',
        },
        // TUNNEL ROOF (solid ceiling over the tunnel space)
        {
            vertices: [
                new Vector2(-100, 1800), new Vector2(11300, 1800),
                new Vector2(11300, 2300), new Vector2(-100, 2300),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#3a3540',
            shadowColor: 'rgba(0,0,0,0.7)',
        },
        // TUNNEL FLOOR (solid floor under tunnel space)
        {
            vertices: [
                new Vector2(-100, 2550), new Vector2(11300, 2550),
                new Vector2(11300, 3400), new Vector2(-100, 3400),
            ],
            type: PolygonType.SOLID,
            material: Material.CONCRETE,
            color: '#282830',
            shadowColor: 'rgba(0,0,0,0.8)',
        },
        // Left tunnel entry gap (carved hole from mid level to underground)
        // This is the open space — no polygon here, columns seal the sides
        // Left column/separator (left of left entry)
        {
            vertices: [
                new Vector2(700, 1600), new Vector2(900, 1600),
                new Vector2(900, 2300), new Vector2(700, 2300),
            ],
            type: PolygonType.SOLID,
            material: Material.CONCRETE,
            color: '#484858',
        },
        // Left entry right column
        {
            vertices: [
                new Vector2(1400, 1600), new Vector2(1600, 1600),
                new Vector2(1600, 2300), new Vector2(1400, 2300),
            ],
            type: PolygonType.SOLID,
            material: Material.CONCRETE,
            color: '#484858',
        },
        // Centre column left
        {
            vertices: [
                new Vector2(4800, 1800), new Vector2(5000, 1800),
                new Vector2(5000, 2550), new Vector2(4800, 2550),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#3a3545',
        },
        // Centre column right
        {
            vertices: [
                new Vector2(6000, 1800), new Vector2(6200, 1800),
                new Vector2(6200, 2550), new Vector2(6000, 2550),
            ],
            type: PolygonType.SOLID,
            material: Material.ROCK,
            color: '#3a3545',
        },
        // Right entry left column
        {
            vertices: [
                new Vector2(9400, 1600), new Vector2(9600, 1600),
                new Vector2(9600, 2300), new Vector2(9400, 2300),
            ],
            type: PolygonType.SOLID,
            material: Material.CONCRETE,
            color: '#484858',
        },
        // Right entry right column
        {
            vertices: [
                new Vector2(10100, 1600), new Vector2(10300, 1600),
                new Vector2(10300, 2300), new Vector2(10100, 2300),
            ],
            type: PolygonType.SOLID,
            material: Material.CONCRETE,
            color: '#484858',
        },

        // ════════════════════════════════════════════
        // 11. ONE-WAY PLATFORMS
        //     Suspended mid-air for extra verticality
        // ════════════════════════════════════════════
        // Left side floating platform
        {
            vertices: [
                new Vector2(300, 220), new Vector2(750, 220),
                new Vector2(750, 240), new Vector2(300, 240),
            ],
            type: PolygonType.ONE_WAY,
            material: Material.WOOD,
            color: '#6b4a22',
        },
        // Left-centre floating platform
        {
            vertices: [
                new Vector2(1600, 200), new Vector2(2200, 200),
                new Vector2(2200, 220), new Vector2(1600, 220),
            ],
            type: PolygonType.ONE_WAY,
            material: Material.WOOD,
            color: '#6b4a22',
        },
        // Left valley suspended platform
        {
            vertices: [
                new Vector2(3000, 600), new Vector2(3700, 600),
                new Vector2(3700, 618), new Vector2(3000, 618),
            ],
            type: PolygonType.ONE_WAY,
            material: Material.METAL,
            color: '#556677',
        },
        // Left valley lower platform
        {
            vertices: [
                new Vector2(3200, 1000), new Vector2(3900, 1000),
                new Vector2(3900, 1018), new Vector2(3200, 1018),
            ],
            type: PolygonType.ONE_WAY,
            material: Material.METAL,
            color: '#556677',
        },
        // Centre left platform (floating near peak)
        {
            vertices: [
                new Vector2(4500, 420), new Vector2(5100, 420),
                new Vector2(5100, 440), new Vector2(4500, 440),
            ],
            type: PolygonType.ONE_WAY,
            material: Material.WOOD,
            color: '#7b5a32',
        },
        // Centre right platform
        {
            vertices: [
                new Vector2(5900, 420), new Vector2(6500, 420),
                new Vector2(6500, 440), new Vector2(5900, 440),
            ],
            type: PolygonType.ONE_WAY,
            material: Material.WOOD,
            color: '#7b5a32',
        },
        // Right valley lower platform
        {
            vertices: [
                new Vector2(7100, 1000), new Vector2(7800, 1000),
                new Vector2(7800, 1018), new Vector2(7100, 1018),
            ],
            type: PolygonType.ONE_WAY,
            material: Material.METAL,
            color: '#556677',
        },
        // Right valley suspended platform
        {
            vertices: [
                new Vector2(7300, 600), new Vector2(8000, 600),
                new Vector2(8000, 618), new Vector2(7300, 618),
            ],
            type: PolygonType.ONE_WAY,
            material: Material.METAL,
            color: '#556677',
        },
        // Right-centre floating platform
        {
            vertices: [
                new Vector2(8800, 200), new Vector2(9400, 200),
                new Vector2(9400, 220), new Vector2(8800, 220),
            ],
            type: PolygonType.ONE_WAY,
            material: Material.WOOD,
            color: '#6b4a22',
        },
        // Right side floating platform
        {
            vertices: [
                new Vector2(10200, 220), new Vector2(10700, 220),
                new Vector2(10700, 240), new Vector2(10200, 240),
            ],
            type: PolygonType.ONE_WAY,
            material: Material.WOOD,
            color: '#6b4a22',
        },

        // ════════════════════════════════════════════
        // 12. BACKGROUND DECORATION POLYGONS
        // ════════════════════════════════════════════
        // Distant mountain shapes in sky
        {
            vertices: [
                new Vector2(500, -600), new Vector2(1800, -200),
                new Vector2(500, 200),
            ],
            type: PolygonType.BACKGROUND,
            color: 'rgba(60,50,90,0.35)',
        },
        {
            vertices: [
                new Vector2(3000, -600), new Vector2(4500, -350),
                new Vector2(3000, -100),
            ],
            type: PolygonType.BACKGROUND,
            color: 'rgba(50,60,80,0.28)',
        },
        {
            vertices: [
                new Vector2(6500, -600), new Vector2(8000, -300),
                new Vector2(6500, -50),
            ],
            type: PolygonType.BACKGROUND,
            color: 'rgba(60,55,85,0.3)',
        },
        {
            vertices: [
                new Vector2(9500, -600), new Vector2(11000, -200),
                new Vector2(9500, 200),
            ],
            type: PolygonType.BACKGROUND,
            color: 'rgba(60,50,90,0.35)',
        },
        // Dark underground BG hints
        {
            vertices: [
                new Vector2(-100, 1600), new Vector2(11300, 1600),
                new Vector2(11300, 1800), new Vector2(-100, 1800),
            ],
            type: PolygonType.BACKGROUND,
            color: 'rgba(15,10,25,0.6)',
        },
    ],
};
