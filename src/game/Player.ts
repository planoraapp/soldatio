import { Vector2 } from '../engine/Vector2';
import { Input } from '../engine/Input';
import { resolveCircleMapCollision } from './Physics';
import { MapPolygon, PolygonType } from './GameMap';
import { WEAPONS, WeaponDef } from './Weapon';
import { BulletManager } from './Bullet';
import { Gostek } from './Gostek';
import { ParticleSystem } from './Particles';

const GRAVITY = 0.35;
const GROUND_ACCEL = 0.8;
const AIR_ACCEL = 0.3;
const GROUND_FRICTION = 0.88;
const AIR_FRICTION = 0.98;
const MAX_SPEED_X = 8;
const JUMP_FORCE = 7.5;
const JET_POWER = 0.55;
const MAX_FUEL = 200; // Increased from 100
const FUEL_DRAIN = 1.2; // Slightly reduced drain
const FUEL_REGEN = 1.0;
const PLAYER_RADIUS = 10;
const MAX_HEALTH = 150;

export class Player {
    pos: Vector2;
    prevPos: Vector2;
    vel: Vector2 = Vector2.zero();

    radius: number = PLAYER_RADIUS;
    health: number = MAX_HEALTH;
    maxHealth: number = MAX_HEALTH;
    fuel: number = MAX_FUEL;
    maxFuel: number = MAX_FUEL;

    isGrounded: boolean = false;
    isCrouching: boolean = false;
    isDead: boolean = false;
    facingRight: boolean = true;

    /** Aim angle toward mouse (world-space radians) */
    aimAngle: number = 0;

    /** Weapons */
    currentWeaponIndex: number = 0;
    ammo: number[] = [];
    fireTimer: number = 0;
    reloading: boolean = false;
    reloadTimer: number = 0;

    /** Respawn timer */
    respawnTimer: number = 0;
    private respawnDelay: number = 120; // ~2 seconds at 60fps

    /** Callback to get a spawn position from the map */
    spawnProvider: () => Vector2 = () => new Vector2(400, 200);

    gostek: Gostek = new Gostek();

    constructor(spawnPos: Vector2) {
        this.pos = spawnPos.clone();
        this.prevPos = spawnPos.clone();
        this.initAmmo();
    }

    private initAmmo(): void {
        this.ammo = WEAPONS.map((w) => w.magazineSize);
    }

    get weapon(): WeaponDef {
        return WEAPONS[this.currentWeaponIndex];
    }

    switchWeapon(index: number): void {
        if (index >= 0 && index < WEAPONS.length && index !== this.currentWeaponIndex) {
            this.currentWeaponIndex = index;
            this.reloading = false;
            this.reloadTimer = 0;
            this.fireTimer = Math.max(this.fireTimer, 10); // small delay on switch
        }
    }

    update(
        input: Input,
        polygons: MapPolygon[],
        bullets: BulletManager,
        particles: ParticleSystem,
        dt: number
    ): void {
        if (this.isDead) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) {
                this.respawn(this.spawnProvider());
            }
            return;
        }

        // === AIM ===
        this.aimAngle = Math.atan2(
            input.mouseWorldY - this.pos.y,
            input.mouseWorldX - this.pos.x
        );
        this.facingRight = input.mouseWorldX > this.pos.x;

        // === HORIZONTAL MOVEMENT ===
        const accel = this.isGrounded ? GROUND_ACCEL : AIR_ACCEL;
        if (input.isKeyDown('KeyA') || input.isKeyDown('ArrowLeft')) {
            this.vel.x -= accel;
        }
        if (input.isKeyDown('KeyD') || input.isKeyDown('ArrowRight')) {
            this.vel.x += accel;
        }

        // Crouch
        this.isCrouching = input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown');

        // Clamp horizontal speed
        if (Math.abs(this.vel.x) > MAX_SPEED_X) {
            this.vel.x = Math.sign(this.vel.x) * MAX_SPEED_X;
        }

        // Friction
        this.vel.x *= this.isGrounded ? GROUND_FRICTION : AIR_FRICTION;

        // === JUMP ===
        if ((input.isKeyDown('KeyW') || input.isKeyDown('ArrowUp')) && this.isGrounded) {
            this.vel.y = -JUMP_FORCE;
            this.isGrounded = false;
        }

        // === JETPACK ===
        if (input.mouseRight && this.fuel > 0) {
            this.vel.y -= JET_POWER;
            this.fuel -= FUEL_DRAIN;
            if (this.fuel < 0) this.fuel = 0;

            // Spawn smoke particles
            particles.spawnSmoke(this.pos.add(new Vector2(0, this.radius)), 2);
        }

        // Regenerate fuel on ground
        if (this.isGrounded && !input.mouseRight) {
            this.fuel = Math.min(this.maxFuel, this.fuel + FUEL_REGEN);
        }

        // === GRAVITY ===
        this.vel.y += GRAVITY;

        // === INTEGRATE (Verlet-like: vel is explicit here for simplicity) ===
        this.prevPos.copy(this.pos);
        this.pos.addMut(this.vel);

        // === COLLISION ===
        this.isGrounded = false;
        const collisions = resolveCircleMapCollision(this.pos, this.radius, polygons);
        for (const col of collisions) {
            if (col.polyType === PolygonType.DEADLY) {
                this.die(particles);
                return;
            }

            if (col.polyType === PolygonType.BOUNCY) {
                this.vel = this.vel.reflect(col.normal).scale(0.7);
                this.pos.addMut(col.normal.scale(col.depth));
                continue;
            }

            // One-way platform logic
            if (col.polyType === PolygonType.ONE_WAY) {
                // Only collide if moving down and falling from above the platform
                const approachSpeed = this.vel.dot(col.normal);
                const isFalling = this.vel.y > 0;
                const isAbove = (this.prevPos.y + this.radius) <= (this.pos.y + this.radius - col.depth);

                if (!isFalling || col.normal.y > -0.5 || !isAbove) {
                    continue; // Skip collision
                }
            }

            // Push out of polygon
            this.pos.addMut(col.normal.scale(col.depth));

            // Check if this is ground (normal points upward enough)
            if (col.normal.y < -0.5) {
                this.isGrounded = true;
                if (this.vel.y > 0) {
                    // Project velocity along the surface for smooth ramp sliding
                    const tangent = new Vector2(-col.normal.y, col.normal.x);
                    const projected = tangent.scale(this.vel.dot(tangent));
                    this.vel.x = projected.x;
                    this.vel.y = projected.y;
                }
            } else {
                // Wall or ceiling — remove velocity component into the wall
                const velDotNormal = this.vel.dot(col.normal);
                if (velDotNormal < 0) {
                    this.vel.subMut(col.normal.scale(velDotNormal));
                }
            }
        }

        // === WEAPON ===
        this.updateWeapon(input, bullets, particles);

        // === GOSTEK ===
        this.gostek.update(this.vel.x, this.isGrounded, input.mouseWorldX, this.pos.x);
    }

    private updateWeapon(input: Input, bullets: BulletManager, particles: ParticleSystem): void {
        // Weapon switching with number keys
        for (let i = 0; i < WEAPONS.length; i++) {
            if (input.isKeyJustPressed(`Digit${i + 1}`)) {
                this.switchWeapon(i);
            }
        }

        // Scroll wheel weapon switch
        // (handled via key bindings only for now)

        if (this.fireTimer > 0) this.fireTimer--;

        let justFinishedReload = false;

        // Reloading
        if (this.reloading) {
            this.reloadTimer--;
            if (this.reloadTimer <= 0) {
                this.ammo[this.currentWeaponIndex] = this.weapon.magazineSize;
                this.reloading = false;
                justFinishedReload = true;
            }
        }

        if (!this.reloading) {
            // Manual reload
            if (input.isKeyJustPressed('KeyR')) {
                this.startReload();
                return;
            }

            // Fire
            // Continuous firing: allow if button is held, fireTimer is 0, and we have ammo.
            // Works for ALL weapons now: automatic stays automatic, semi-automatic 
            // also refires if button is kept held (becoming essentially automatic but at their own rate).
            const isFiring = input.mouseLeft;
            const canFire = isFiring && this.fireTimer <= 0 && this.ammo[this.currentWeaponIndex] > 0;

            if (canFire) {
                this.fire(bullets, particles);
            }

            // Auto-reload when empty
            if (this.ammo[this.currentWeaponIndex] <= 0) {
                this.startReload();
            }
        }
    }

    private startReload(): void {
        if (this.ammo[this.currentWeaponIndex] < this.weapon.magazineSize) {
            this.reloading = true;
            this.reloadTimer = Math.round(this.weapon.reloadTime / 16.67);
        }
    }

    private fire(bullets: BulletManager, particles: ParticleSystem): void {
        const w = this.weapon;
        this.fireTimer = Math.round(w.fireRate / 16.67);
        this.ammo[this.currentWeaponIndex]--;

        // Offset spawn to shoulder level (approx -12 from center pos.y)
        const shoulderPos = new Vector2(this.pos.x, this.pos.y - 12);
        const muzzleOffset = Vector2.fromAngle(this.aimAngle, 22);
        const muzzlePos = shoulderPos.add(muzzleOffset);

        for (let i = 0; i < w.bulletCount; i++) {
            const spread = (Math.random() - 0.5) * w.spread * 2;
            const angle = this.aimAngle + spread;
            const bulletVel = Vector2.fromAngle(angle, w.bulletSpeed);

            // Inherit player velocity
            bulletVel.addMut(this.vel.scale(0.5));

            bullets.spawn(
                muzzlePos,
                bulletVel,
                w.bulletGravity,
                w.damage,
                w.bulletLifetime,
                w.bulletTrailColor
            );
        }

        // Muzzle flash particles
        particles.spawnMuzzleFlash(muzzlePos, Vector2.fromAngle(this.aimAngle), w.muzzleFlashColor);

        // Recoil: push player in opposite direction of shot
        const recoilDir = Vector2.fromAngle(this.aimAngle + Math.PI, w.recoilForce);
        this.vel.addMut(recoilDir);
    }

    die(particles: ParticleSystem): void {
        this.isDead = true;
        this.respawnTimer = this.respawnDelay;

        // Big blood burst
        particles.spawnBlood(this.pos, Vector2.up(), 25);
        particles.spawnBlood(this.pos, Vector2.right(), 15);
        particles.spawnBlood(this.pos, Vector2.left(), 15);
    }

    respawn(spawnPos: Vector2): void {
        this.pos.copy(spawnPos);
        this.prevPos.copy(spawnPos);
        this.vel.set(0, 0);
        this.health = this.maxHealth;
        this.fuel = this.maxFuel;
        this.isDead = false;
        this.isGrounded = false;
        this.initAmmo();
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (this.isDead) return;

        let reloadProgress = 0;
        if (this.reloading) {
            const totalReloadFrames = Math.round(this.weapon.reloadTime / 16.67);
            reloadProgress = 1 - (this.reloadTimer / totalReloadFrames);
        }

        this.gostek.render(
            ctx,
            this.pos,
            this.aimAngle,
            this.isCrouching,
            this.weapon.name,
            reloadProgress
        );
    }
}
