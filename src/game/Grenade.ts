import { Vector2 } from '../engine/Vector2';
import { MapPolygon } from './GameMap';
import { resolveCircleMapCollision } from './Physics';
import { ParticleSystem } from './Particles';
import { 
    Scene, 
    Mesh, 
    SphereGeometry, 
    MeshPhongMaterial, 
    Color, 
    Group 
} from 'three';

export interface GrenadeData {
    pos: Vector2;
    vel: Vector2;
    timer: number;
    radius: number;
    damage: number;
    ownerTeam: number;
    owner?: any; // The player who threw it
    mesh: Mesh;
    rotation: number;
}

export class GrenadeManager {
    grenades: GrenadeData[] = [];
    private scene: Scene | Group | null = null;

    private readonly GRENADE_RADIUS = 4;
    private readonly DETONATION_TIME = 180; // frames
    private readonly EXPLOSION_RADIUS = 120;

    constructor(scene?: Scene | Group) {
        if (scene) this.scene = scene;
    }

    spawn(pos: Vector2, vel: Vector2, ownerTeam: number = 0, owner?: any): void {
        // 3D Mesh
        const geo = new SphereGeometry(this.GRENADE_RADIUS, 8, 8);
        const mat = new MeshPhongMaterial({ 
            color: new Color('#446644'),
            shininess: 30,
            emissive: new Color('#000000')
        });
        const mesh = new Mesh(geo, mat);
        mesh.position.set(pos.x, -pos.y, 45); // Z=45 (behind bullets, in front of walls)
        
        if (this.scene) this.scene.add(mesh);

        this.grenades.push({
            pos: pos.clone(),
            vel: vel.clone(),
            timer: this.DETONATION_TIME,
            radius: this.GRENADE_RADIUS,
            damage: 150,
            ownerTeam,
            owner,
            mesh,
            rotation: 0
        });
    }

    update(polygons: MapPolygon[], particles: ParticleSystem, players: any[]): { explosions: Vector2[] } {
        const explosions: Vector2[] = [];
        const alive: GrenadeData[] = [];

        for (const g of this.grenades) {
            g.timer--;

            // Physics
            g.vel.y += 0.25; // Gravity
            g.vel.x *= 0.99; // Air friction
            g.pos.addMut(g.vel);
            g.rotation += g.vel.x * 0.05;

            // Collision with map
            const collisions = resolveCircleMapCollision(g.pos, g.radius, polygons);
            for (const col of collisions) {
                // Bounce
                const dot = g.vel.dot(col.normal);
                if (dot < 0) {
                    g.vel.subMut(col.normal.scale(1.6 * dot)); // 1.6 = bounciness
                    g.pos.addMut(col.normal.scale(col.depth));
                }
            }

            // Sync 3D Mesh
            g.mesh.position.set(g.pos.x, -g.pos.y, 45);
            g.mesh.rotation.z = g.rotation;

            // Pulse effect
            if (g.timer < 60) {
                const pulse = (Math.sin(Date.now() * 0.02) * 0.5 + 0.5);
                const mat = g.mesh.material as MeshPhongMaterial;
                mat.emissive.setRGB(pulse * 0.5, 0, 0); // Pulse red
                mat.color.setRGB(0.2 + pulse * 0.6, 0.4, 0.2);
            }

            // Contact detonation: burst if touching a player
            for (const p of players) {
                if (p.isDead) continue;

                // Safety: Don't detonate on owner for the first 15 frames
                if (g.owner === p && g.timer > (this.DETONATION_TIME - 15)) {
                    continue;
                }

                const dist = p.pos.distance(g.pos);
                if (dist < (p.radius || 12) + g.radius + 2) {
                    g.timer = 0;
                    break;
                }
            }

            if (g.timer <= 0) {
                // Explode!
                explosions.push(g.pos.clone());
                particles.spawnExplosion(g.pos);

                // Clean up 3D Mesh
                if (this.scene) this.scene.remove(g.mesh);
                g.mesh.geometry.dispose();
                (g.mesh.material as MeshPhongMaterial).dispose();

                // Damage players
                for (const p of players) {
                    const dist = p.pos.distance(g.pos);
                    if (dist < this.EXPLOSION_RADIUS) {
                        const falloff = 1 - (dist / this.EXPLOSION_RADIUS);
                        let damage = g.damage * falloff;
                        if (g.owner && g.owner !== p && g.owner.team === p.team) {
                            damage *= 0.5; // Dano amigo 50% menor
                        }
                        p.takeDamage(damage, particles);

                        // Knockback
                        const pushDir = p.pos.sub(g.pos).normalize();
                        p.vel.addMut(pushDir.scale(falloff * 15));
                    }
                }
            } else {
                alive.push(g);
            }
        }

        this.grenades = alive;
        return { explosions };
    }

    render(ctx: CanvasRenderingContext2D): void {
        // Logic moved to 3D. 
        // We can keep 2D circles as optional silhouettes or just leave it.
    }
}
