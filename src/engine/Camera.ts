import { Vector2 } from './Vector2';

export class Camera {
    /** Top-left corner of the camera in world space */
    x: number = 0;
    y: number = 0;
    /** Viewport size in pixels */
    width: number = 0;
    height: number = 0;
    /** Zoom scale: 1 = 1 world unit = 1 pixel */
    scale: number = 1;

    /** How much the camera shifts toward the mouse (0..1) */
    private mouseInfluence: number = 0.3;
    /** Smoothing factor for camera interpolation */
    private smoothing: number = 0.08;

    private targetX: number = 0;
    private targetY: number = 0;

    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    /**
     * Update camera to follow a target (player) with offset toward the mouse cursor.
     * @param playerPos Player world position
     * @param mouseWorldX Mouse world X
     * @param mouseWorldY Mouse world Y
     */
    follow(playerPos: Vector2, mouseWorldX: number, mouseWorldY: number): void {
        // Target is between player and mouse
        const lookX = playerPos.x + (mouseWorldX - playerPos.x) * this.mouseInfluence;
        const lookY = playerPos.y + (mouseWorldY - playerPos.y) * this.mouseInfluence;

        this.targetX = lookX - this.width / (2 * this.scale);
        this.targetY = lookY - this.height / (2 * this.scale);

        // Smooth interpolation
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;
    }

    /** Get the center of the camera in world coordinates */
    center(): Vector2 {
        return new Vector2(
            this.x + this.width / (2 * this.scale),
            this.y + this.height / (2 * this.scale)
        );
    }

    /** Convert world coordinates to screen coordinates */
    worldToScreen(wx: number, wy: number): { x: number; y: number } {
        return {
            x: (wx - this.x) * this.scale,
            y: (wy - this.y) * this.scale,
        };
    }

    /** Convert screen coordinates to world coordinates */
    screenToWorld(sx: number, sy: number): { x: number; y: number } {
        return {
            x: sx / this.scale + this.x,
            y: sy / this.scale + this.y,
        };
    }
}
