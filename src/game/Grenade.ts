import { Vector2 } from '../engine/Vector2';
import { MapPolygon } from './GameMap';
import { resolveCircleMapCollision } from './Physics';
import { ParticleSystem } from './Particles';

export interface GrenadeData {
    pos: Vector2;
    vel: Vector2;
    timer: number;
    radius: number;
    damage: number;
    ownerTeam: number;
    owner?: any; // The player who threw it
}

export class GrenadeManager {
    grenades: GrenadeData[] = [];
    private readonly GRENADE_RADIUS = 4;
    private readonly DETONATION_TIME = 180; // frames
    private readonly EXPLOSION_RADIUS = 120;

    spawn(pos: Vector2, vel: Vector2, ownerTeam: number = 0, owner?: any): void {
        this.grenades.push({
            pos: pos.clone(),
            vel: vel.clone(),
            timer: this.DETONATION_TIME,
            radius: this.GRENADE_RADIUS,
            damage: 150,
            ownerTeam,
            owner,
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

                // Damage players
                for (const p of players) {
                    const dist = p.pos.distance(g.pos);
                    if (dist < this.EXPLOSION_RADIUS) {
                        const falloff = 1 - (dist / this.EXPLOSION_RADIUS);
                        const damage = g.damage * falloff;
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
        for (const g of this.grenades) {
            ctx.save();
            ctx.translate(g.pos.x, g.pos.y);

            // Pulsing red core if near detonation
            const pulse = g.timer < 60 ? (Math.sin(Date.now() * 0.02) * 0.5 + 0.5) : 0;

            ctx.fillStyle = pulse > 0.5 ? '#ff4444' : '#446644';
            ctx.beginPath();
            ctx.arc(0, 0, g.radius, 0, Math.PI * 2);
            ctx.fill();

            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(-1, -1, 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }
}
