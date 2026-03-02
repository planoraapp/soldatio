import { Vector2 } from '../engine/Vector2';

export interface Particle {
    pos: Vector2;
    vel: Vector2;
    gravity: number;
    lifetime: number;
    maxLifetime: number;
    color: string;
    size: number;
    /** If true, render as a circle; otherwise render as a square */
    round: boolean;
    /** If true, this particle sticks to the map when it stops */
    persistent: boolean;
    /** Set to true once a persistent particle has landed */
    stuck: boolean;
}

/**
 * Lightweight particle system for blood, smoke, muzzle flash, shell casings.
 * Persistent particles (blood) are drawn to an offscreen canvas once they stop.
 */
export class ParticleSystem {
    particles: Particle[] = [];

    /** Offscreen canvas for persistent blood/decals */
    private persistCanvas: HTMLCanvasElement;
    private persistCtx: CanvasRenderingContext2D;
    persistentDirty: boolean = false;

    constructor(width: number, height: number) {
        this.persistCanvas = document.createElement('canvas');
        this.persistCanvas.width = width;
        this.persistCanvas.height = height;
        this.persistCtx = this.persistCanvas.getContext('2d')!;
    }

    resizePersist(width: number, height: number): void {
        // Save existing data
        const oldCanvas = this.persistCanvas;
        this.persistCanvas = document.createElement('canvas');
        this.persistCanvas.width = width;
        this.persistCanvas.height = height;
        this.persistCtx = this.persistCanvas.getContext('2d')!;
        this.persistCtx.drawImage(oldCanvas, 0, 0);
    }

    /** Spawn a burst of blood particles */
    spawnBlood(pos: Vector2, direction: Vector2, count: number): void {
        for (let i = 0; i < count; i++) {
            const angle = direction.angle() + (Math.random() - 0.5) * 1.5;
            const speed = 2 + Math.random() * 5;
            const vel = Vector2.fromAngle(angle, speed);
            this.particles.push({
                pos: pos.clone(),
                vel,
                gravity: 0.15,
                lifetime: 40 + Math.random() * 60,
                maxLifetime: 100,
                color: `hsl(${0 + Math.random() * 10}, ${70 + Math.random() * 30}%, ${20 + Math.random() * 25}%)`,
                size: 1.5 + Math.random() * 3,
                round: true,
                persistent: true,
                stuck: false,
            });
        }
    }

    /** Spawn jetpack smoke */
    spawnSmoke(pos: Vector2, amount: number = 3): void {
        for (let i = 0; i < amount; i++) {
            const vel = new Vector2((Math.random() - 0.5) * 2, 1 + Math.random() * 2);
            this.particles.push({
                pos: pos.clone(),
                vel,
                gravity: -0.02,
                lifetime: 15 + Math.random() * 15,
                maxLifetime: 30,
                color: '#888',
                size: 3 + Math.random() * 4,
                round: true,
                persistent: false,
                stuck: false,
            });
        }
    }

    /** Spawn muzzle flash */
    spawnMuzzleFlash(pos: Vector2, direction: Vector2, color: string): void {
        for (let i = 0; i < 5; i++) {
            const angle = direction.angle() + (Math.random() - 0.5) * 0.8;
            const speed = 3 + Math.random() * 6;
            this.particles.push({
                pos: pos.clone(),
                vel: Vector2.fromAngle(angle, speed),
                gravity: 0.05,
                lifetime: 4 + Math.random() * 6,
                maxLifetime: 10,
                color,
                size: 2 + Math.random() * 3,
                round: true,
                persistent: false,
                stuck: false,
            });
        }
    }

    /** Spawn wall impact sparks */
    spawnSparks(pos: Vector2, normal: Vector2, count: number = 4): void {
        for (let i = 0; i < count; i++) {
            const angle = normal.angle() + (Math.random() - 0.5) * 1.2;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                pos: pos.clone(),
                vel: Vector2.fromAngle(angle, speed),
                gravity: 0.1,
                lifetime: 10 + Math.random() * 15,
                maxLifetime: 25,
                color: `hsl(${30 + Math.random() * 30}, 100%, ${50 + Math.random() * 40}%)`,
                size: 1 + Math.random() * 2,
                round: false,
                persistent: false,
                stuck: false,
            });
        }
    }

    /** Spawn material-specific impact effects (called when a bullet hits a surface) */
    spawnMaterialImpact(pos: Vector2, normal: Vector2, material: string): void {
        const effects = {
            dirt: { color1: '#8B7355', color2: '#6B5339', sparks: 0, dust: 5 },
            rock: { color1: '#999', color2: '#777', sparks: 3, dust: 2 },
            metal: { color1: '#FFD700', color2: '#FF8C00', sparks: 6, dust: 1 },
            concrete: { color1: '#AAA', color2: '#888', sparks: 2, dust: 4 },
            wood: { color1: '#D2B48C', color2: '#8B6914', sparks: 1, dust: 3 },
            grass: { color1: '#6B8E23', color2: '#556B2F', sparks: 0, dust: 4 },
        } as Record<string, { color1: string; color2: string; sparks: number; dust: number }>;

        const fx = effects[material] || effects.rock;

        // Sparks (fast, bright, short-lived)
        for (let i = 0; i < fx.sparks; i++) {
            const angle = normal.angle() + (Math.random() - 0.5) * 1.0;
            const speed = 4 + Math.random() * 5;
            this.particles.push({
                pos: pos.clone(),
                vel: Vector2.fromAngle(angle, speed),
                gravity: 0.08,
                lifetime: 5 + Math.random() * 8,
                maxLifetime: 13,
                color: fx.color1,
                size: 1 + Math.random() * 1.5,
                round: false,
                persistent: false,
                stuck: false,
            });
        }

        // Dust / debris (slower, bigger, longer lived)
        for (let i = 0; i < fx.dust; i++) {
            const angle = normal.angle() + (Math.random() - 0.5) * 1.5;
            const speed = 1 + Math.random() * 3;
            this.particles.push({
                pos: pos.clone(),
                vel: Vector2.fromAngle(angle, speed),
                gravity: 0.12,
                lifetime: 15 + Math.random() * 25,
                maxLifetime: 40,
                color: Math.random() > 0.5 ? fx.color1 : fx.color2,
                size: 2 + Math.random() * 3,
                round: true,
                persistent: false,
                stuck: false,
            });
        }
    }

    /** Spawn footstep dust when walking */
    spawnFootstepDust(pos: Vector2, material: string, speed: number): void {
        if (Math.abs(speed) < 2) return;
        const colors: Record<string, string> = {
            dirt: '#8B7355', rock: '#999', concrete: '#AAA',
            grass: '#6B8E23', wood: '#D2B48C', metal: '#888',
        };
        const color = colors[material] || '#888';
        const count = Math.min(3, Math.floor(Math.abs(speed) * 0.3));
        for (let i = 0; i < count; i++) {
            this.particles.push({
                pos: pos.clone(),
                vel: new Vector2((Math.random() - 0.5) * 1.5, -(0.5 + Math.random() * 1.5)),
                gravity: 0.05,
                lifetime: 8 + Math.random() * 10,
                maxLifetime: 18,
                color,
                size: 2 + Math.random() * 2,
                round: true,
                persistent: false,
                stuck: false,
            });
        }
    }

    update(): void {
        const alive: Particle[] = [];

        for (const p of this.particles) {
            if (p.stuck) continue;

            p.vel.y += p.gravity;
            p.pos.addMut(p.vel);
            p.vel.scaleMut(0.97); // Air friction
            p.lifetime--;

            if (p.lifetime <= 0) {
                // If persistent, draw onto the persist canvas and discard
                if (p.persistent) {
                    this.persistCtx.fillStyle = p.color;
                    this.persistCtx.globalAlpha = 0.6;
                    this.persistCtx.beginPath();
                    this.persistCtx.arc(p.pos.x, p.pos.y, p.size * 0.8, 0, Math.PI * 2);
                    this.persistCtx.fill();
                    this.persistCtx.globalAlpha = 1;
                    this.persistentDirty = true;
                }
                continue;
            }
            alive.push(p);
        }

        this.particles = alive;
    }

    /** Render persistent decals (blood on map) */
    renderPersistent(ctx: CanvasRenderingContext2D): void {
        ctx.drawImage(this.persistCanvas, 0, 0);
    }

    /** Render active particles */
    render(ctx: CanvasRenderingContext2D): void {
        for (const p of this.particles) {
            if (p.stuck) continue;
            const alpha = Math.min(1, p.lifetime / (p.maxLifetime * 0.3));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;

            if (p.round) {
                ctx.beginPath();
                ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(p.pos.x - p.size / 2, p.pos.y - p.size / 2, p.size, p.size);
            }
        }
        ctx.globalAlpha = 1;
    }
}
