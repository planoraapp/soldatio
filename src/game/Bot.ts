import { Vector2 } from '../engine/Vector2';
import { IInput } from '../engine/IInput';
import { Player } from './Player';
import { MapPolygon, PickupData, PickupType } from './GameMap';
import { BulletManager } from './Bullet';
import { ParticleSystem } from './Particles';
import { raycastMap } from './Physics';

class BotInput implements IInput {
    mouseX: number = 0;
    mouseY: number = 0;
    mouseWorldX: number = 0;
    mouseWorldY: number = 0;
    mouseLeft: boolean = false;
    mouseRight: boolean = false;
    mouseLeftJustPressed: boolean = false;
    mouseRightJustPressed: boolean = false;

    private keys: Set<string> = new Set();
    private keysJustPressed: Set<string> = new Set();
    private keysJustReleased: Set<string> = new Set();

    setKeyDown(code: string, down: boolean) {
        if (down) {
            if (!this.keys.has(code)) this.keysJustPressed.add(code);
            this.keys.add(code);
        } else {
            if (this.keys.has(code)) this.keysJustReleased.add(code);
            this.keys.delete(code);
        }
    }

    clearPerFrame() {
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
        this.mouseLeftJustPressed = false;
        this.mouseRightJustPressed = false;
    }

    isKeyDown(code: string): boolean { return this.keys.has(code); }
    isKeyJustPressed(code: string): boolean { return this.keysJustPressed.has(code); }
    isKeyJustReleased(code: string): boolean { return this.keysJustReleased.has(code); }
}

export class Bot extends Player {
    botInput: BotInput = new BotInput();
    target: Player | null = null;

    // AI state
    private stateTimer: number = 0;
    private reactionDelay: number = 25 + Math.random() * 30; // Increased lag (approx 0.4s-0.9s)
    private fireThreshold: number = 650;

    // Aim error
    private aimError: Vector2 = Vector2.zero();
    private aimErrorTimer: number = 0;

    // Burst firing
    private isBursting: boolean = false;
    private burstTimer: number = 0;

    constructor(spawnPos: Vector2) {
        super(spawnPos);
        // Bots start with a random primary weapon for variety
        this.primaryWeaponIndex = Math.floor(Math.random() * 8);
    }

    updateBot(
        target: Player,
        polygons: MapPolygon[],
        bullets: BulletManager,
        grenades: any, // GrenadeManager
        particles: ParticleSystem,
        players: Player[],
        pickups: PickupData[] = []
    ): void {
        this.target = target;
        this.botInput.clearPerFrame();

        if (this.isDead) {
            super.update(this.botInput, polygons, bullets, grenades, particles, players);
            return;
        }

        this.updateAimError();
        this.think(polygons, pickups);
        super.update(this.botInput, polygons, bullets, grenades, particles, players);
    }

    private updateAimError(): void {
        this.aimErrorTimer--;
        if (this.aimErrorTimer <= 0) {
            // New random error every 30-60 frames
            this.aimErrorTimer = 30 + Math.random() * 30;
            this.aimError = new Vector2(
                (Math.random() - 0.5) * 45, // Horizontal error pixels
                (Math.random() - 0.5) * 35  // Vertical error pixels
            );
        }
    }

    private think(polygons: MapPolygon[], pickups: PickupData[] = []): void {
        if (!this.target) return;

        // --- HEALTH SEEKING: prioritise nearby medkits when low HP ---
        if (this.health < 60) {
            // Find nearest available health pickup
            let nearest: PickupData | null = null;
            let nearestDist = Infinity;
            for (const p of pickups) {
                if (p.type !== PickupType.HEALTH || p.timer > 0) continue;
                const d = Math.abs(p.x - this.pos.x);
                if (d < nearestDist) { nearestDist = d; nearest = p; }
            }
            if (nearest) {
                const goRight = nearest.x > this.pos.x;
                this.botInput.setKeyDown('KeyD', goRight);
                this.botInput.setKeyDown('KeyA', !goRight);
                this.botInput.mouseLeft = false;
                // Jump over small obstacles if stuck
                if (this.isGrounded && Math.random() > 0.95) this.botInput.setKeyDown('KeyW', true);
                return; // Skip combat logic
            }
        }

        const dist = this.pos.distance(this.target.pos);
        const dir = this.target.pos.sub(this.pos).normalize();

        // 1. AIM with Error
        // The error makes them not hit the center perfectly
        this.botInput.mouseWorldX = this.target.pos.x + this.aimError.x;
        this.botInput.mouseWorldY = this.target.pos.y - 12 + this.aimError.y;

        // 2. MOVEMENT (less robotic, add small random pauses)
        if (Math.random() > 0.02) { // 2% chance to "hesitate" per frame
            if (dist > 200) {
                if (this.target.pos.x > this.pos.x + 40) {
                    this.botInput.setKeyDown('KeyD', true);
                    this.botInput.setKeyDown('KeyA', false);
                } else if (this.target.pos.x < this.pos.x - 40) {
                    this.botInput.setKeyDown('KeyA', true);
                    this.botInput.setKeyDown('KeyD', false);
                }
            } else if (dist < 120) {
                if (this.target.pos.x > this.pos.x) {
                    this.botInput.setKeyDown('KeyA', true);
                    this.botInput.setKeyDown('KeyD', false);
                } else {
                    this.botInput.setKeyDown('KeyD', true);
                    this.botInput.setKeyDown('KeyA', false);
                }
            }
        }

        // 3. JUMPING / JETPACK
        const probeDist = 40;
        const probeDir = new Vector2(this.vel.x > 0 ? 1 : -1, 0);
        const wallHit = raycastMap(this.pos, probeDir, probeDist, polygons);

        const targetHigher = this.target.pos.y < this.pos.y - 60;

        if (wallHit.hit || targetHigher) {
            if (this.isGrounded) {
                if (Math.random() > 0.5) {
                    this.botInput.setKeyDown('KeyW', true);
                }
            } else if (!this.isGrounded && this.fuel > 40) {
                this.botInput.mouseRight = Math.random() > 0.3; // Stutter jetpack usage
            }
        }


        // 4. FIRING (with Burst and Reaction Delay)
        const los = raycastMap(this.pos, dir, dist, polygons);
        const canSee = !los.hit && dist < this.fireThreshold;

        if (canSee) {
            this.stateTimer++;
            if (this.stateTimer > this.reactionDelay) {
                // Firing logic with bursts
                this.burstTimer--;
                if (this.burstTimer <= 0) {
                    this.isBursting = !this.isBursting;
                    // Fire for 20-50 frames, then rest for 15-40 frames
                    this.burstTimer = this.isBursting ? 20 + Math.random() * 30 : 15 + Math.random() * 25;
                }

                this.botInput.mouseLeft = this.isBursting;
            }
        } else {
            this.botInput.mouseLeft = false;
            this.isBursting = false;
            this.burstTimer = 0;
            this.stateTimer = Math.max(0, this.stateTimer - 2); // cooldown reaction slowly
        }
    }

}
