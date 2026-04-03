import { Vector2 } from '../engine/Vector2';
import { MapPolygon } from './GameMap';
import { raycastMap } from './Physics';
import { 
    Scene, 
    Group, 
    Line, 
    BufferGeometry, 
    LineBasicMaterial, 
    Float32BufferAttribute, 
    Color 
} from 'three';

export interface BulletData {
    pos: Vector2;
    vel: Vector2;
    gravity: number;
    damage: number;
    lifetime: number;
    maxLifetime: number;
    trailColor: string;
    ownerId: string;
    line: Line;
    explosive: boolean;
    isRocket: boolean;
}

export class BulletManager {
    bullets: BulletData[] = [];
    private scene: Scene | Group | null = null;

    constructor(scene?: Scene | Group) {
        if (scene) this.scene = scene;
    }

    spawn(
        pos: Vector2,
        vel: Vector2,
        gravity: number,
        damage: number,
        lifetime: number,
        trailColor: string,
        ownerId: string,
        explosive: boolean = false,
        isRocket: boolean = false
    ): void {
        // Create 3D line for bullet trail
        const geo = new BufferGeometry();
        const positions = new Float32Array([0, 0, 0, 0, 0, 0]); // start and end
        geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
        
        const mat = new LineBasicMaterial({ 
            color: new Color(trailColor === '#fff' ? '#ffffff' : trailColor),
            transparent: true,
            opacity: 0.8
        });
        
        const line = new Line(geo, mat);
        if (this.scene) this.scene.add(line);

        this.bullets.push({
            pos: pos.clone(),
            vel: vel.clone(),
            gravity,
            damage,
            lifetime,
            maxLifetime: lifetime,
            trailColor,
            ownerId,
            line,
            explosive,
            isRocket
        });
    }

    update(
        polygons: MapPolygon[],
        players: { id: string; pos: Vector2; radius: number; health: number; die: (p: any) => void }[],
        particles?: any,
        allPlayers?: any[]
    ): { hitBullets: BulletData[]; hitPositions: Vector2[]; hitNormals: Vector2[]; hitPlayers: any[] } {
        const hitBullets: BulletData[] = [];
        const hitPositions: Vector2[] = [];
        const hitNormals: Vector2[] = [];
        const hitPlayers: any[] = [];
        const alive: BulletData[] = [];

        for (const b of this.bullets) {
            // Rocket smoke trail FX
            if (b.isRocket && particles) {
                particles.spawnSmoke(b.pos.clone(), 1);
            }
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
                // Ignore self-collision
                if (p.id === b.ownerId) continue;

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
                hitPlayers.push({ player: playerHit, damage: b.damage, bullet: b });
                
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

            // Update 3D Line
            const tailLen = 1.3;
            const tailX = b.pos.x - b.vel.x * tailLen;
            const tailY = b.pos.y - b.vel.y * tailLen;
            
            const posAttr = b.line.geometry.attributes.position;
            posAttr.setXYZ(0, tailX, -tailY, 55); // Z=55 (above players)
            posAttr.setXYZ(1, b.pos.x, -b.pos.y, 55);
            posAttr.needsUpdate = true;
            (b.line.material as LineBasicMaterial).opacity = b.lifetime / b.maxLifetime;

            if (b.lifetime > 0) {
                alive.push(b);
            } else {
                // Cleanup
                if (this.scene) this.scene.remove(b.line);
                b.line.geometry.dispose();
            }
        }

        // Cleanup hit bullets
        for (const hb of hitBullets) {
            if (this.scene) this.scene.remove(hb.line);
            hb.line.geometry.dispose();
        }

        this.bullets = alive;
        return { hitBullets, hitPositions, hitNormals, hitPlayers };
    }

    render(ctx: CanvasRenderingContext2D): void {
        // Logic moved to 3D
    }
}
