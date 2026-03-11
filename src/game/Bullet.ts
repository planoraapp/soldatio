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

    update(
        polygons: MapPolygon[],
        players: { pos: Vector2; radius: number; health: number; die: (p: any) => void }[],
        allPlayers?: any[]
    ): { hitBullets: BulletData[]; hitPositions: Vector2[]; hitNormals: Vector2[]; hitPlayers: any[] } {
        const hitBullets: BulletData[] = [];
        const hitPositions: Vector2[] = [];
        const hitNormals: Vector2[] = [];
        const hitPlayers: any[] = [];
        const alive: BulletData[] = [];

        for (const b of this.bullets) {
            // Apply gravity
            b.vel.y += b.gravity;

            const oldPos = b.pos.clone();
            const moveDir = b.vel.normalize();
            const moveDist = b.vel.length();

            // 1. Check for wall hits using raycast
            const hit = raycastMap(oldPos, moveDir, moveDist, polygons);

            // 2. Check for player hits
            let playerHit = null;
            let playerHitDist = hit.hit ? hit.distance : moveDist;

            // Proper Capsule/Line Segment vs Circle collision mapping
            for (const p of players) {
                // Vector from oldPos to player
                const toPlayer = p.pos.sub(oldPos);
                
                // Projection of player center onto the bullet's travel vector (distance along line)
                const projection = toPlayer.dot(moveDir);

                // Find the closest point on the line segment from bullet start to max travel dist
                const t = Math.max(0, Math.min(moveDist, projection));
                const closestPoint = oldPos.add(moveDir.scale(t));
                
                // Calc distance from the closest point to the player
                const distToPlayerLine = closestPoint.distance(p.pos);

                // We only care if we actually hit them BEFORE hitting a wall 
                // and if the hit happens within their radius (with a tiny buffer for thick bullets)
                if (distToPlayerLine <= p.radius + 3 && projection <= playerHitDist + p.radius) {
                    playerHit = p;
                    
                    // Keep the distance recorded so the next player check only beats it if it's closer
                    playerHitDist = Math.max(0, projection - p.radius);
                }
            }

            if (playerHit) {
                // We hit a player before hitting the wall
                hitBullets.push(b);
                hitPositions.push(oldPos.add(moveDir.scale(playerHitDist)));
                hitNormals.push(moveDir.scale(-1));
                hitPlayers.push({ player: playerHit, damage: b.damage });
                
                // update bullet pos conceptually for any later logic but skip adding to alive
                b.pos.addMut(b.vel.normalize().scale(playerHitDist));
                continue;
            }

            if (hit.hit) {
                hitBullets.push(b);
                hitPositions.push(hit.point);
                hitNormals.push(hit.normal);
                
                b.pos = hit.point.clone();
                continue;
            }

            // Move bullet normally
            b.pos.addMut(b.vel);
            b.lifetime--;

            if (b.lifetime > 0) {
                alive.push(b);
            }
        }

        this.bullets = alive;
        return { hitBullets, hitPositions, hitNormals, hitPlayers };
    }


    render(ctx: CanvasRenderingContext2D): void {
        for (const b of this.bullets) {
            const alpha = b.lifetime / b.maxLifetime;
            // Short trail: 1.2x velocity length
            const tailPos = b.pos.sub(b.vel.scale(1.2));

            ctx.beginPath();
            ctx.moveTo(tailPos.x, tailPos.y);
            ctx.lineTo(b.pos.x, b.pos.y);

            // If it's a special weapon like LAW, use its color. Otherwise, white trail.
            const isSpecial = b.trailColor !== '#fff' && b.trailColor !== '#ffffff' && b.trailColor !== 'yellow';
            ctx.strokeStyle = isSpecial ? b.trailColor : 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = alpha;
            ctx.stroke();

            // Bullet head (small points)
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 1;
            ctx.fillRect(b.pos.x - 0.5, b.pos.y - 0.5, 1, 1);
        }
    }
}
