import { Vector2 } from '../../engine/Vector2';
import { MapData, PolygonType, Material, PickupType } from '../GameMap';

export const trincheiras: MapData = {
    name: 'Trincheiras V2',
    bgColor: '#0d1a2e',
    bgGradientTop: '#0a1020',
    bgGradientBottom: '#1a2a3a',
    bounds: { left: -800, top: -1000, right: 20800, bottom: 3400 },

    weather: {
        type: 'rain',
        intensity: 0.35,
        windX: -1.5,
        color: 'rgba(140,160,240,0.35)',
    },

    spawns: [
        { position: new Vector2(200, 360), team: 1 },
        { position: new Vector2(600, 360), team: 1 },
        { position: new Vector2(1000, 360), team: 1 },
        { position: new Vector2(1200, 360), team: 1 },

        { position: new Vector2(3200, 760), team: 0 },
        { position: new Vector2(5800, 260), team: 0 },
        { position: new Vector2(10000, -540), team: 0 },
        { position: new Vector2(10000, 760), team: 0 },
        { position: new Vector2(16750, 760), team: 0 },

        { position: new Vector2(19800, 360), team: 2 },
        { position: new Vector2(19400, 360), team: 2 },
        { position: new Vector2(19000, 360), team: 2 },
        { position: new Vector2(18800, 360), team: 2 },
    ],

    pickups: [
        { x: 100, y: 360, type: PickupType.HEALTH, timer: 0 },
        { x: 1300, y: 360, type: PickupType.GRENADES, timer: 0 },
        { x: 3250, y: 760, type: PickupType.HEALTH, timer: 0 },
        { x: 2800, y: 760, type: PickupType.GRENADES, timer: 0 },
        { x: 10000, y: -540, type: PickupType.HEALTH, timer: 0 },
        { x: 9000, y: -540, type: PickupType.HEALTH, timer: 0 },
        { x: 11000, y: -540, type: PickupType.GRENADES, timer: 0 },
        { x: 10000, y: 760, type: PickupType.HEALTH, timer: 0 },
        { x: 9000, y: 760, type: PickupType.GRENADES, timer: 0 },
        { x: 11000, y: 760, type: PickupType.GRENADES, timer: 0 },
        { x: 16750, y: 760, type: PickupType.HEALTH, timer: 0 },
        { x: 17200, y: 760, type: PickupType.GRENADES, timer: 0 },
        { x: 19900, y: 360, type: PickupType.HEALTH, timer: 0 },
        { x: 18700, y: 360, type: PickupType.GRENADES, timer: 0 },
    ],

    scenery: [
        { x: 500, y: 400, type: 'flag', zIndex: -1, team: 1 },
        { x: 300, y: 400, type: 'sandbag', zIndex: -1 },
        { x: 800, y: 400, type: 'crate', zIndex: -1 },
        { x: 19500, y: 400, type: 'flag', zIndex: -1, team: 2 },
        { x: 19700, y: 400, type: 'sandbag', zIndex: -1 },
        { x: 19200, y: 400, type: 'crate', zIndex: -1 },
        
        { x: 3000, y: 800, type: 'barrel', zIndex: -1 },
        { x: 3500, y: 800, type: 'bush', zIndex: -1 },
        { x: 6000, y: 300, type: 'sign', zIndex: -1 },
        { x: 10000, y: -500, type: 'pillar', zIndex: -1, scale: 1.5, color: '#334' },
        { x: 9500, y: -500, type: 'bush', zIndex: -1 },
        { x: 10500, y: -500, type: 'bush', zIndex: -1 },
        { x: 8000, y: 800, type: 'barrel', zIndex: -1 },
        { x: 12000, y: 800, type: 'barrel', zIndex: -1 },
        { x: 10000, y: 800, type: 'crate', zIndex: -1 },
        { x: 17000, y: 800, type: 'bush', zIndex: -1 },
        { x: 16500, y: 800, type: 'sign', zIndex: -1 },
    ],

    parallaxLayers: [
        {
            zIndex: -3,
            scrollFactor: 0.04,
            elements: [
                { type: 'rect', x: 800, y: -200, width: 350, height: 200, color: 'rgba(200,220,255,0.15)', opacity: 0.15 },
                { type: 'rect', x: 5000, y: -300, width: 450, height: 250, color: 'rgba(200,220,255,0.12)', opacity: 0.12 },
                { type: 'rect', x: 10000, y: -400, width: 500, height: 280, color: 'rgba(200,220,255,0.18)', opacity: 0.18 },
                { type: 'rect', x: 15000, y: -200, width: 300, height: 180, color: 'rgba(200,220,255,0.18)', opacity: 0.18 },
                { type: 'rect', x: 18500, y: -280, width: 400, height: 220, color: 'rgba(200,220,255,0.13)', opacity: 0.13 },
            ],
        },
    ],

    polygons: [
        {
            vertices: [
                new Vector2(-800, -1000), new Vector2(-100, -1000),
                new Vector2(-100, 3400), new Vector2(-800, 3400),
            ],
            type: PolygonType.SOLID, material: Material.ROCK, color: '#444455', shadowColor: 'rgba(0,0,0,0.6)',
        },
        {
            vertices: [
                new Vector2(-100, 400), new Vector2(1500, 400),
                new Vector2(1500, 3400), new Vector2(-100, 3400)
            ],
            type: PolygonType.SOLID, material: Material.GRASS, color: '#2a5a22'
        },
        {
            vertices: [
                new Vector2(1450, 400), new Vector2(2500, 800),
                new Vector2(2500, 3400), new Vector2(1450, 3400)
            ],
            type: PolygonType.SOLID, material: Material.GRASS, color: '#2a5a22'
        },
        {
            vertices: [
                new Vector2(2450, 800), new Vector2(4000, 800),
                new Vector2(4000, 3400), new Vector2(2450, 3400)
            ],
            type: PolygonType.SOLID, material: Material.DIRT, color: '#5a4232'
        },
        {
            vertices: [
                new Vector2(3950, 800), new Vector2(5000, 300),
                new Vector2(5000, 3400), new Vector2(3950, 3400)
            ],
            type: PolygonType.SOLID, material: Material.GRASS, color: '#2a5a22'
        },
        {
            vertices: [
                new Vector2(4950, 300), new Vector2(6500, 300),
                new Vector2(6500, 3400), new Vector2(4950, 3400)
            ],
            type: PolygonType.SOLID, material: Material.GRASS, color: '#2a5a22'
        },
        {
            vertices: [
                new Vector2(6450, 300), new Vector2(7500, 800),
                new Vector2(7500, 3400), new Vector2(6450, 3400)
            ],
            type: PolygonType.SOLID, material: Material.CONCRETE, color: '#383848'
        },
        {
            vertices: [
                new Vector2(7450, 800), new Vector2(12500, 800),
                new Vector2(12500, 3400), new Vector2(7450, 3400)
            ],
            type: PolygonType.SOLID, material: Material.CONCRETE, color: '#282830'
        },
        {
            vertices: [
                new Vector2(12450, 800), new Vector2(13500, 300),
                new Vector2(13500, 3400), new Vector2(12450, 3400)
            ],
            type: PolygonType.SOLID, material: Material.CONCRETE, color: '#383848'
        },
        {
            vertices: [
                new Vector2(5500, 300), new Vector2(6500, -100),
                new Vector2(6500, 100), new Vector2(5500, 300)
            ],
            type: PolygonType.SOLID, material: Material.ROCK, color: '#504a55'
        },
        {
            vertices: [
                new Vector2(6450, -100), new Vector2(8000, -500),
                new Vector2(8000, 100), new Vector2(6450, 100)
            ],
            type: PolygonType.SOLID, material: Material.ROCK, color: '#4a4555'
        },
        {
            vertices: [
                new Vector2(7950, -500), new Vector2(12000, -500),
                new Vector2(12000, 100), new Vector2(7950, 100)
            ],
            type: PolygonType.SOLID, material: Material.GRASS, color: '#3a6230'
        },
        {
            vertices: [
                new Vector2(11950, -500), new Vector2(13500, -100),
                new Vector2(13500, 100), new Vector2(11950, 100)
            ],
            type: PolygonType.SOLID, material: Material.ROCK, color: '#4a4555'
        },
        {
            vertices: [
                new Vector2(13450, -100), new Vector2(14500, 300),
                new Vector2(13450, 100), new Vector2(14500, 300)
            ],
            type: PolygonType.SOLID, material: Material.ROCK, color: '#504a55'
        },
        {
            vertices: [
                new Vector2(13450, 300), new Vector2(15000, 300),
                new Vector2(15000, 3400), new Vector2(13450, 3400)
            ],
            type: PolygonType.SOLID, material: Material.GRASS, color: '#2a5a22'
        },
        {
            vertices: [
                new Vector2(14950, 300), new Vector2(16000, 800),
                new Vector2(16000, 3400), new Vector2(14950, 3400)
            ],
            type: PolygonType.SOLID, material: Material.GRASS, color: '#2a5a22'
        },
        {
            vertices: [
                new Vector2(15950, 800), new Vector2(17500, 800),
                new Vector2(17500, 3400), new Vector2(15950, 3400)
            ],
            type: PolygonType.SOLID, material: Material.DIRT, color: '#5a4232'
        },
        {
            vertices: [
                new Vector2(17450, 800), new Vector2(18500, 400),
                new Vector2(18500, 3400), new Vector2(17450, 3400)
            ],
            type: PolygonType.SOLID, material: Material.GRASS, color: '#2a5a22'
        },
        {
            vertices: [
                new Vector2(18450, 400), new Vector2(20100, 400),
                new Vector2(20100, 3400), new Vector2(18450, 3400)
            ],
            type: PolygonType.SOLID, material: Material.GRASS, color: '#2a5a22'
        },
        {
            vertices: [
                new Vector2(20100, -1000), new Vector2(20800, -1000),
                new Vector2(20800, 3400), new Vector2(20100, 3400)
            ],
            type: PolygonType.SOLID, material: Material.ROCK, color: '#444455', shadowColor: 'rgba(0,0,0,0.6)',
        },
        {
            vertices: [
                new Vector2(7450, 100), new Vector2(12500, 100),
                new Vector2(12500, 800), new Vector2(7450, 800)
            ],
            type: PolygonType.BACKGROUND, material: Material.CONCRETE, color: '#1a1520'
        },
        {
            vertices: [
                new Vector2(2500, 400), new Vector2(4000, 400),
                new Vector2(4000, 420), new Vector2(2500, 420)
            ],
            type: PolygonType.ONE_WAY, material: Material.METAL, color: '#556677'
        },
        {
            vertices: [
                new Vector2(16000, 400), new Vector2(17500, 400),
                new Vector2(17500, 420), new Vector2(16000, 420)
            ],
            type: PolygonType.ONE_WAY, material: Material.METAL, color: '#556677'
        },
        {
            vertices: [
                new Vector2(8500, 200), new Vector2(11500, 200),
                new Vector2(11500, 220), new Vector2(8500, 220)
            ],
            type: PolygonType.ONE_WAY, material: Material.WOOD, color: '#6b4a22'
        }
    ],
};
