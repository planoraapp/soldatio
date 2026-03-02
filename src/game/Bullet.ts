import { Vector2 } from '../engine/Vector2';
import { MapPolygon } from './GameMap';
import { raycastMap } from './Physics';

export interface BulletData {
    pos: Vector2;
    vel: Vector2;
    gravity: number;
    damage: number;
    lifetime: number;
    maxLifetime: number;
    trailColor: string;
    ownerTeam: number;
}

export class BulletManager {
    bullets: BulletData[] = [];

    spawn(
        pos: Vector2,
        vel: Vector2,
        gravity: number,
        damage: number,
        lifetime: number,
        trailColor: string,
        ownerTeam: number = 0
    ): void {
        this.bullets.push({
            pos: pos.clone(),
            vel: vel.clone(),
            gravity,
            damage,
            lifetime,
            maxLifetime: lifetime,
            trailColor,
            ownerTeam,
        });
    }

    update(polygons: MapPolygon[]): { hitBullets: BulletData[]; hitPositions: Vector2[]; hitNormals: Vector2[] } {
        const hitBullets: BulletData[] = [];
        const hitPositions: Vector2[] = [];
        const hitNormals: Vector2[] = [];
        const alive: BulletData[] = [];

        for (const b of this.bullets) {
            // Apply gravity
            b.vel.y += b.gravity;

            // Store old position for trail rendering
            const oldPos = b.pos.clone();

            // Raycast from old to new position to check for wall hits
            const moveDir = b.vel.normalize();
            const moveDist = b.vel.length();
            const hit = raycastMap(b.pos, moveDir, moveDist, polygons);

            if (hit.hit) {
                hitBullets.push(b);
                hitPositions.push(hit.point);
                hitNormals.push(hit.normal);
                continue;
            }

            // Move bullet
            b.pos.addMut(b.vel);
            b.lifetime--;

            if (b.lifetime > 0) {
                alive.push(b);
            }
        }

        this.bullets = alive;
        return { hitBullets, hitPositions, hitNormals };
    }

    render(ctx: CanvasRenderingContext2D): void {
        for (const b of this.bullets) {
            const alpha = b.lifetime / b.maxLifetime;
            const tailPos = b.pos.sub(b.vel.scale(0.6));

            ctx.beginPath();
            ctx.moveTo(tailPos.x, tailPos.y);
            ctx.lineTo(b.pos.x, b.pos.y);
            ctx.strokeStyle = b.trailColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Bullet head glow
            ctx.beginPath();
            ctx.arc(b.pos.x, b.pos.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
    }
}
