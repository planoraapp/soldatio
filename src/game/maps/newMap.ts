import { Vector2 } from '../../engine/Vector2';
import { MapData, PolygonType, Material, PickupType } from '../GameMap';

/**
 * Premium Sideview Map
 * Uses the new tileset and provides a tactical landscape.
 */
export const newMap: MapData = {
    name: 'Tactical_Ridge',
    bgColor: '#0a0b10',
    bgGradientTop: '#111827',
    bgGradientBottom: '#1f2937',
    bounds: { left: -500, top: -800, right: 3500, bottom: 1200 },
    spawns: [
        { position: new Vector2(100, 400), team: 1 },
        { position: new Vector2(200, 400), team: 1 },
        { position: new Vector2(3000, 400), team: 2 },
        { position: new Vector2(3100, 400), team: 2 },
        { position: new Vector2(1600, 200), team: 0 },
    ],
    polygons: [
        // LEFT BASE
        {
            vertices: [new Vector2(-500, 500), new Vector2(800, 500), new Vector2(800, 1000), new Vector2(-500, 1000)],
            type: PolygonType.SOLID,
            color: '#34d399',
            material: Material.GRASS,
        },
        // CENTRAL RIDGE
        {
            vertices: [new Vector2(800, 500), new Vector2(1200, 300), new Vector2(2000, 300), new Vector2(2400, 500), new Vector2(2400, 1000), new Vector2(800, 1000)],
            type: PolygonType.SOLID,
            color: '#94a3b8',
            material: Material.ROCK,
        },
        // RIGHT BASE
        {
            vertices: [new Vector2(2400, 500), new Vector2(3500, 500), new Vector2(3500, 1000), new Vector2(2400, 1000)],
            type: PolygonType.SOLID,
            color: '#fbbf24',
            material: Material.DIRT,
        },
        // FLOATING CONCRETE PLATFORM
        {
            vertices: [new Vector2(1400, 100), new Vector2(1800, 100), new Vector2(1800, 140), new Vector2(1400, 140)],
            type: PolygonType.SOLID,
            color: '#94a3b8',
            material: Material.CONCRETE,
        },
        // ONE-WAY WOODEN STEPS
        {
            vertices: [new Vector2(1000, 400), new Vector2(1150, 400), new Vector2(1150, 420), new Vector2(1000, 420)],
            type: PolygonType.ONE_WAY,
            color: '#8b5cf6',
            material: Material.WOOD,
        },
        {
            vertices: [new Vector2(2050, 400), new Vector2(2200, 400), new Vector2(2200, 420), new Vector2(2050, 420)],
            type: PolygonType.ONE_WAY,
            color: '#8b5cf6',
            material: Material.WOOD,
        },
        // PIT (DEADLY)
        {
            vertices: [new Vector2(1500, 1000), new Vector2(1700, 1000), new Vector2(1700, 1200), new Vector2(1500, 1200)],
            type: PolygonType.DEADLY,
            color: '#ef4444',
        }
    ],
    scenery: [
        { x: 400, y: 500, type: 'crate', zIndex: 1, scale: 1.5 },
        { x: 600, y: 500, type: 'barrel', zIndex: -1, scale: 1.2 },
        { x: 1600, y: 100, type: 'flag', team: 0, zIndex: 1, scale: 1.0 },
        { x: 2800, y: 500, type: 'sandbag', zIndex: 1, scale: 1.3 },
    ],
    pickups: [
        { x: 1600, y: 80, type: PickupType.HEALTH, timer: 0 },
        { x: 400, y: 480, type: PickupType.GRENADES, timer: 0 },
        { x: 2800, y: 480, type: PickupType.GRENADES, timer: 0 },
    ],
    parallaxLayers: [
        {
            scrollFactor: 0.2, zIndex: -10,
            elements: [
                { type: 'rect', x: 200, y: -200, width: 400, height: 300, color: 'rgba(255,255,255,0.03)' },
                { type: 'rect', x: 1200, y: -400, width: 600, height: 400, color: 'rgba(255,255,255,0.02)' },
            ]
        }
    ]
};
