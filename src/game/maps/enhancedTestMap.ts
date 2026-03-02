import { Vector2 } from '../../engine/Vector2';
import { MapData, PolygonType, Material, PickupType } from '../GameMap';

/**
 * A rich, larger test arena featuring:
 * - Parallax backgrounds
 * - Different materials (metal, dirt, concrete)
 * - One-way platforms
 * - Decorative scenery props
 * - Weather (Rain)
 */
export const enhancedTestMap: MapData = {
    name: 'Soldat_Industrial_Rain',
    bgColor: '#0a0a1a',
    bgGradientTop: '#050510',
    bgGradientBottom: '#1a1a3a',
    bgImage: '/skytest.png',
    bounds: { left: -500, top: -800, right: 3000, bottom: 1200 },

    weather: {
        type: 'rain',
        intensity: 0.6,
        windX: -2,
        color: 'rgba(150, 170, 255, 0.4)'
    },

    spawns: [
        { position: new Vector2(100, 300), team: 1 },
        { position: new Vector2(500, 450), team: 0 },
        { position: new Vector2(1200, 100), team: 0 },
        { position: new Vector2(2500, 450), team: 2 },
    ],

    pickups: [
        { x: 150, y: 485, type: PickupType.HEALTH, timer: 0 },
        { x: 1350, y: 185, type: PickupType.GRENADES, timer: 0 },
        { x: 2500, y: 485, type: PickupType.HEALTH, timer: 0 },
        { x: 600, y: 485, type: PickupType.GRENADES, timer: 0 },
    ],

    parallaxLayers: [
        {
            zIndex: -2,
            scrollFactor: 0.05,
            elements: [
                { type: 'rect', x: 200, y: 100, width: 250, height: 150, image: '/cloud1.png', color: 'white', opacity: 0.3 },
                { type: 'rect', x: 1200, y: 50, width: 300, height: 180, image: '/cloud2.png', color: 'white', opacity: 0.25 },
                { type: 'rect', x: 2200, y: 150, width: 200, height: 120, image: '/cloud3.png', color: 'white', opacity: 0.35 },
            ]
        },
        {
            zIndex: -1,
            scrollFactor: 0.15,
            elements: [
                { type: 'rect', x: 600, y: 200, width: 400, height: 250, image: '/cloud4.png', color: 'white', opacity: 0.4 },
                { type: 'rect', x: 1800, y: 150, width: 350, height: 220, image: '/cloud1.png', color: 'white', opacity: 0.3 },
            ]
        }
    ],


    scenery: [
        { x: 300, y: 490, type: 'crate', zIndex: -1 },
        { x: 330, y: 490, type: 'crate', zIndex: -1, scale: 0.8 },
        { x: 600, y: 490, type: 'barrel', zIndex: -1 },
        { x: 1100, y: 195, type: 'flag', zIndex: -1, team: 1 },
        { x: 2300, y: 490, type: 'sandbag', zIndex: -1 },
        { x: 2340, y: 490, type: 'sandbag', zIndex: -1 },
        { x: 1500, y: 400, type: 'bush', zIndex: -1 },
        { x: 1000, y: 500, type: 'pillar', zIndex: -1, scale: 1.5, color: '#444' },
        { x: 1700, y: 700, type: 'sign', zIndex: 1 }, // In front
    ],

    polygons: [
        // Left Base (Dirt/Concrete)
        {
            vertices: [new Vector2(-500, 500), new Vector2(800, 500), new Vector2(800, 900), new Vector2(-500, 900)],
            type: PolygonType.SOLID,
            material: Material.CONCRETE,
            color: '#333344',
            shadowColor: 'rgba(0,0,0,0.5)'
        },
        // Ramp to middle
        {
            vertices: [new Vector2(800, 500), new Vector2(1100, 200), new Vector2(1100, 500)],
            type: PolygonType.SOLID,
            material: Material.DIRT,
            color: '#443322'
        },
        // Middle Platform
        {
            vertices: [new Vector2(1100, 200), new Vector2(1600, 200), new Vector2(1600, 500), new Vector2(1100, 500)],
            type: PolygonType.SOLID,
            material: Material.METAL,
            color: '#555566'
        },
        // One-way platforms in middle
        {
            vertices: [new Vector2(1200, 50), new Vector2(1500, 50), new Vector2(1500, 65), new Vector2(1200, 65)],
            type: PolygonType.ONE_WAY,
            material: Material.WOOD,
            color: '#664422'
        },
        // Right steep hill
        {
            vertices: [new Vector2(1600, 200), new Vector2(2200, 500), new Vector2(1600, 500)],
            type: PolygonType.SOLID,
            material: Material.GRASS,
            color: '#224422'
        },
        // Right Base
        {
            vertices: [new Vector2(2200, 500), new Vector2(3000, 500), new Vector2(3000, 900), new Vector2(2200, 900)],
            type: PolygonType.SOLID,
            material: Material.CONCRETE,
            color: '#333344'
        },
        // Pit of death
        {
            vertices: [new Vector2(1600, 800), new Vector2(2200, 800), new Vector2(2200, 1200), new Vector2(1600, 1200)],
            type: PolygonType.DEADLY,
            color: '#ff2200'
        },
        // Background decor polygons
        {
            vertices: [new Vector2(200, 100), new Vector2(400, 50), new Vector2(350, 150)],
            type: PolygonType.BACKGROUND,
            color: 'rgba(50, 50, 100, 0.2)'
        }
    ]
};
