import { Vector2 } from '../../engine/Vector2';
import { MapData, PolygonType } from '../GameMap';

/**
 * A hand-crafted test map with:
 * - Flat ground sections
 * - Ramps/slopes
 * - Elevated platforms
 * - A pit
 * - Multiple spawn points
 */
export const testMap: MapData = {
    name: 'ctf_TestArena',
    bgColor: '#1a1a2e',
    bgGradientTop: '#0f0c29',
    bgGradientBottom: '#302b63',
    bounds: { left: -200, top: -600, right: 2600, bottom: 1000 },
    spawns: [
        { position: new Vector2(200, 450), team: 1 },
        { position: new Vector2(600, 450), team: 0 },
        { position: new Vector2(1400, 250), team: 0 },
        { position: new Vector2(2000, 350), team: 2 },
        { position: new Vector2(2300, 450), team: 2 },
    ],
    polygons: [
        // ============================
        // Main ground (left section)
        // ============================
        {
            vertices: [new Vector2(-200, 500), new Vector2(800, 500), new Vector2(800, 800), new Vector2(-200, 800)],
            type: PolygonType.SOLID,
            color: '#3d3d56',
        },

        // ============================
        // Left ramp going up
        // ============================
        {
            vertices: [new Vector2(800, 500), new Vector2(1000, 300), new Vector2(1000, 500)],
            type: PolygonType.SOLID,
            color: '#4a4a6a',
        },

        // ============================
        // Elevated middle platform
        // ============================
        {
            vertices: [new Vector2(1000, 300), new Vector2(1500, 300), new Vector2(1500, 500), new Vector2(1000, 500)],
            type: PolygonType.SOLID,
            color: '#555580',
        },

        // ============================
        // Right ramp going down
        // ============================
        {
            vertices: [new Vector2(1500, 300), new Vector2(1500, 500), new Vector2(1700, 500)],
            type: PolygonType.SOLID,
            color: '#4a4a6a',
        },

        // ============================
        // Right section ground (lower area after ramp)
        // ============================
        {
            vertices: [new Vector2(1700, 500), new Vector2(1500, 500), new Vector2(1500, 800), new Vector2(1700, 800)],
            type: PolygonType.SOLID,
            color: '#3d3d56',
        },

        // ============================
        // Pit gap area (thin floor)
        // ============================
        {
            vertices: [new Vector2(1700, 700), new Vector2(1900, 700), new Vector2(1900, 800), new Vector2(1700, 800)],
            type: PolygonType.SOLID,
            color: '#2d2d46',
        },

        // ============================
        // Right ground after pit
        // ============================
        {
            vertices: [new Vector2(1900, 400), new Vector2(2600, 400), new Vector2(2600, 800), new Vector2(1900, 800)],
            type: PolygonType.SOLID,
            color: '#3d3d56',
        },

        // ============================
        // Small floating platform above left
        // ============================
        {
            vertices: [new Vector2(300, 320), new Vector2(550, 320), new Vector2(550, 345), new Vector2(300, 345)],
            type: PolygonType.SOLID,
            color: '#6a6a8e',
        },

        // ============================
        // Small floating platform above right
        // ============================
        {
            vertices: [new Vector2(2050, 230), new Vector2(2300, 230), new Vector2(2300, 255), new Vector2(2050, 255)],
            type: PolygonType.SOLID,
            color: '#6a6a8e',
        },

        // ============================
        // Death pit at the bottom-center
        // ============================
        {
            vertices: [new Vector2(1700, 850), new Vector2(1900, 850), new Vector2(1900, 1000), new Vector2(1700, 1000)],
            type: PolygonType.DEADLY,
            color: '#ff2222',
        },

        // ============================
        // Background decorative polygons (no collision)
        // ============================
        {
            vertices: [new Vector2(100, 200), new Vector2(250, 150), new Vector2(200, 250)],
            type: PolygonType.BACKGROUND,
            color: 'rgba(100, 100, 180, 0.15)',
        },
        {
            vertices: [new Vector2(1800, 100), new Vector2(2000, 50), new Vector2(1950, 180)],
            type: PolygonType.BACKGROUND,
            color: 'rgba(100, 100, 180, 0.15)',
        },
    ],
};
