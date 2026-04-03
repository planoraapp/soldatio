import { Vector2 } from '../../engine/Vector2';
import { MapData, PolygonType, Material, PickupType } from '../GameMap';

/**
 * Massive 4x Tactical Map
 * Optimized for Three.js 2.5D rendering.
 */
export const megaMap: MapData = {
    name: 'Mega_Tactical_Plateau',
    bgColor: '#05060b',
    bgGradientTop: '#0d1117',
    bgGradientBottom: '#1a1f2e',
    bounds: { left: -2000, top: -2000, right: 10000, bottom: 3000 },
    spawns: [
        { position: new Vector2(-1500, 400), team: 1 },
        { position: new Vector2(-1400, 400), team: 1 },
        { position: new Vector2(8000, 400), team: 2 },
        { position: new Vector2(8100, 400), team: 2 },
        { position: new Vector2(3000, 0), team: 0 },
        { position: new Vector2(4000, -200), team: 0 },
    ],
    polygons: [
        // ============================
        // LEFT SECTION (RED BASE)
        // ============================
        {
            vertices: [new Vector2(-2000, 500), new Vector2(1000, 500), new Vector2(1000, 1500), new Vector2(-2000, 1500)],
            type: PolygonType.SOLID,
            color: '#34d399',
            material: Material.GRASS,
        },
        // STEP UP TO LEFT RIDGE
        {
            vertices: [new Vector2(1000, 500), new Vector2(1500, 300), new Vector2(1500, 1500), new Vector2(1000, 1500)],
            type: PolygonType.SOLID,
            color: '#475569',
            material: Material.ROCK,
        },
        // LEFT RIDGE
        {
            vertices: [new Vector2(1500, 300), new Vector2(3000, 300), new Vector2(3000, 1500), new Vector2(1500, 1500)],
            type: PolygonType.SOLID,
            color: '#94a3b8',
            material: Material.DIRT,
        },
        // ============================
        // CENTRAL CHASM
        // ============================
        {
            vertices: [new Vector2(3000, 300), new Vector2(3000, 1500), new Vector2(3200, 1500), new Vector2(3200, 500)],
            type: PolygonType.SOLID,
            color: '#475569',
            material: Material.ROCK,
        },
        // CLIFF TO THE PIT
        {
            vertices: [new Vector2(3200, 500), new Vector2(3200, 1500), new Vector2(5000, 1500), new Vector2(5000, 800)],
            type: PolygonType.SOLID,
            color: '#334155',
            material: Material.ROCK,
        },
        // ============================
        // CENTRAL FLOATING CITADEL
        // ============================
        {
            vertices: [new Vector2(3800, -100), new Vector2(4400, -100), new Vector2(4400, 0), new Vector2(3800, 0)],
            type: PolygonType.SOLID,
            color: '#e2e8f0',
            material: Material.CONCRETE,
        },
        {
            vertices: [new Vector2(3600, -300), new Vector2(4600, -300), new Vector2(4600, -250), new Vector2(3600, -250)],
            type: PolygonType.SOLID,
            color: '#cbd5e1',
            material: Material.METAL,
        },
        // ============================
        // RIGHT SECTION (BLUE BASE)
        // ============================
        {
            vertices: [new Vector2(5000, 800), new Vector2(5000, 1500), new Vector2(7000, 1500), new Vector2(7000, 500)],
            type: PolygonType.SOLID,
            color: '#1e293b',
            material: Material.ROCK,
        },
        {
            vertices: [new Vector2(7000, 500), new Vector2(10000, 500), new Vector2(10000, 1500), new Vector2(7000, 1500)],
            type: PolygonType.SOLID,
            color: '#fbbf24',
            material: Material.GRASS,
        },
        // ============================
        // TACTICAL ONE-WAY PLATFORMS (Scattered)
        // ============================
        {
            vertices: [new Vector2(2000, 0), new Vector2(2300, 0), new Vector2(2300, 20), new Vector2(2000, 20)],
            type: PolygonType.ONE_WAY,
            color: '#8b5cf6',
            material: Material.WOOD,
        },
        {
            vertices: [new Vector2(6000, 200), new Vector2(6300, 200), new Vector2(6300, 220), new Vector2(6000, 220)],
            type: PolygonType.ONE_WAY,
            color: '#8b5cf6',
            material: Material.WOOD,
        },
        // ============================
        // DEATH PIT
        // ============================
        {
            vertices: [new Vector2(3000, 1800), new Vector2(5000, 1800), new Vector2(5000, 3000), new Vector2(3000, 3000)],
            type: PolygonType.DEADLY,
            color: '#ef4444',
        }
    ],
    scenery: [
        { x: -1400, y: 500, type: 'crate', zIndex: 1, scale: 2.0 },
        { x: -1200, y: 500, type: 'barrel', zIndex: -1, scale: 1.5 },
        { x: -1500, y: 400, type: 'flag', team: 1, zIndex: 1, scale: 1.5 },
        { x: 8000, y: 500, type: 'flag', team: 2, zIndex: 1, scale: 1.5 },
        { x: 4100, y: -100, type: 'pillar', zIndex: -1, scale: 2.5 },
        { x: 6500, y: 500, type: 'sandbag', zIndex: 1, scale: 1.8 },
    ],
    pickups: [
        { x: 4100, y: -150, type: PickupType.HEALTH, timer: 0 },
        { x: -1000, y: 480, type: PickupType.GRENADES, timer: 0 },
        { x: 9000, y: 480, type: PickupType.GRENADES, timer: 0 },
    ],
    parallaxLayers: [
        {
            scrollFactor: 0.1, zIndex: -20,
            elements: [
                { type: 'rect', x: 0, y: -500, width: 2000, height: 1000, color: 'rgba(255,255,255,0.01)' },
                { type: 'rect', x: 5000, y: -800, width: 3000, height: 1500, color: 'rgba(255,255,255,0.015)' },
            ]
        }
    ]
};
