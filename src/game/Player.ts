import { Vector2 } from '../engine/Vector2';
import { Input } from '../engine/Input';
import { IInput } from '../engine/IInput';
import { resolveCircleMapCollision } from './Physics';
import { MapPolygon, PolygonType } from './GameMap';
import { WEAPONS, WeaponDef } from './Weapon';
import { BulletManager } from './Bullet';
import { Gostek } from './Gostek';
import { ParticleSystem } from './Particles';
import { GrenadeManager } from './Grenade';

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
    isInvincible: boolean = false;

    /** Backflip state */
    isBackflipping: boolean = false;
    backflipRotation: number = 0;
    private backflipTimer: number = 0;
    private readonly BACKFLIP_DURATION = 36; // ~0.6s at 60fps

    /** Rolling state */
    isRolling: boolean = false;
    rollRotation: number = 0;
    private rollTimer: number = 0;
    private readonly ROLL_DURATION = 30; // ~0.5s at 60fps
    private readonly ROLL_SPEED_BOOST = 1.35;

    /** Aim angle toward mouse (world-space radians) */
    aimAngle: number = 0;

    /** Weapons Slots (Soldat style) */
    primaryWeaponIndex: number = 2; // e.g. AK-74
    secondaryWeaponIndex: number = 10; // e.g. USSOCOM
    activeSlot: number = 1; // 1 = primary, 2 = secondary

    ammo: number[] = [];
    fireTimer: number = 0;
    reloading: boolean = false;
    reloadTimer: number = 0;

    /** Charge shot (Barrett/LAW) */
    chargeLevel: number = 0; // 0 to 1
    isCharging: boolean = false;

    /** Grenades */
    grenadeCount: number = 5;
    grenadeWaitTimer: number = 0;
    grenadeCharge: number = 0;
    isChargingGrenade: boolean = false;

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

    get currentWeaponIndex(): number {
        return this.activeSlot === 1 ? this.primaryWeaponIndex : this.secondaryWeaponIndex;
    }

    get weapon(): WeaponDef {
        return WEAPONS[this.currentWeaponIndex];
    }

    switchSlot(slot: number): void {
        if (slot === this.activeSlot) return;
        this.activeSlot = slot;
        this.reloading = false;
        this.reloadTimer = 0;
        this.chargeLevel = 0;
        this.isCharging = false;
        this.fireTimer = 15; // equip delay
    }

    setWeaponToActiveSlot(weaponIndex: number): void {
        const type = WEAPONS[weaponIndex].type;
        if (type === 'primary') {
            this.primaryWeaponIndex = weaponIndex;
        } else {
            this.secondaryWeaponIndex = weaponIndex;
        }
        this.reloading = false;
        this.reloadTimer = 0;
    }

    update(
        input: IInput,
        polygons: MapPolygon[],
        bullets: BulletManager,
        grenades: GrenadeManager,
        particles: ParticleSystem,
        players: Player[]
    ): void {
        if (this.isDead) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) {
                this.respawn(this.spawnProvider());
            }
            return;
        }

        if (this.grenadeWaitTimer > 0) this.grenadeWaitTimer--;

        // === AIM ===
        this.aimAngle = Math.atan2(
            input.mouseWorldY - this.pos.y,
            input.mouseWorldX - this.pos.x
        );
        this.facingRight = input.mouseWorldX > this.pos.x;

        // === HORIZONTAL MOVEMENT ===
        const accel = this.isGrounded ? GROUND_ACCEL : AIR_ACCEL;
        const friction = this.isGrounded ? GROUND_FRICTION : AIR_FRICTION;

        if (input.isKeyDown('KeyA') || input.isKeyDown('ArrowLeft')) {
            this.vel.x -= accel;
        } else if (input.isKeyDown('KeyD') || input.isKeyDown('ArrowRight')) {
            this.vel.x += accel;
        } else {
            // Apply friction when no movement keys are pressed
            this.vel.x *= friction;
            if (Math.abs(this.vel.x) < 0.1) this.vel.x = 0;
        }

        // Still apply a bit of friction even while moving to keep speed capped naturally
        this.vel.x *= friction;

        // Clamp horizontal speed
        if (Math.abs(this.vel.x) > MAX_SPEED_X) {
            this.vel.x = Math.sign(this.vel.x) * MAX_SPEED_X;
        }



        // === CROUCH / ROLL ===
        const crouchKey = input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown');
        const justDownS = input.isKeyJustPressed('KeyS') || input.isKeyJustPressed('ArrowDown');

        // Rolling trigger: Pressing Down while moving, OR moving while Down is held.
        // To be more forgiving: just check if Down is held AND we just started moving, 
        // or we are moving AND just pressed Down.
        const isMoving = Math.abs(this.vel.x) > 2;
        const rollTriggered = (justDownS && isMoving) || (crouchKey && (input.isKeyJustPressed('KeyA') || input.isKeyJustPressed('KeyD')));

        this.isCrouching = crouchKey && !this.isRolling;

        if (rollTriggered && this.isGrounded && !this.isRolling) {
            this.performRoll(this.vel.x > 0 ? 1 : -1);
        }


        // Update Roll State
        if (this.isRolling) {
            this.rollTimer--;
            const rollDir = this.vel.x > 0 ? 1 : -1;
            // Roll rotation: 360 degrees in direction of movement
            this.rollRotation += (Math.PI * 2 / this.ROLL_DURATION) * rollDir;

            // Maintain speed during roll
            if (Math.abs(this.vel.x) < MAX_SPEED_X * 0.5) {
                this.vel.x = rollDir * MAX_SPEED_X * 0.8;
            }

            if (this.rollTimer <= 0) {
                this.isRolling = false;
                this.rollRotation = 0;
                this.radius = PLAYER_RADIUS;
                this.isInvincible = false;
            }
        }

        if (input.isKeyJustPressed('KeyW') || input.isKeyJustPressed('ArrowUp')) {
            if (this.isGrounded) {
                // Check for Backflip conditions
                const movingLeftInput = input.isKeyDown('KeyA') || input.isKeyDown('ArrowLeft');
                const movingRightInput = input.isKeyDown('KeyD') || input.isKeyDown('ArrowRight');

                let performedBackflip = false;
                if (this.facingRight && movingLeftInput) {
                    this.performBackflip(-1);
                    performedBackflip = true;
                } else if (!this.facingRight && movingRightInput) {
                    this.performBackflip(1);
                    performedBackflip = true;
                }

                if (!performedBackflip) {
                    this.vel.y = -JUMP_FORCE;
                    this.isGrounded = false;
                }
            }
        }

        // Update Backflip State
        if (this.isBackflipping) {
            this.backflipTimer--;
            // Rotate 360 degrees (reverse of facing direction)
            const rotationDir = this.vel.x > 0 ? 1 : -1;
            this.backflipRotation += (Math.PI * 2 / this.BACKFLIP_DURATION) * rotationDir;

            if (this.isGrounded || this.backflipTimer <= 0) {
                this.isBackflipping = false;
                this.backflipRotation = 0;
                this.radius = PLAYER_RADIUS;
                this.isInvincible = false;
            }
        }

        // === JETPACK ===
        if (input.mouseRight && this.fuel > 0) {
            this.vel.y -= JET_POWER;
            this.fuel -= FUEL_DRAIN;
            if (this.fuel < 0) this.fuel = 0;

            if (this.isBackflipping) {
                // Cancel backflip if jetpacking? Soldat allowed partials but let's keep it simple
                // this.isBackflipping = false;
                // this.radius = PLAYER_RADIUS;
            }

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

        // Map Bounds Check
        const bounds = polygons.length > 0 ? (polygons[0] as any)._bounds : null; // Temp way if we don't have it
        // Actually, let's just use hardcoded or passed bounds if possible.
        // For now, I'll assume we want to stay within some reasonable distance.

        const collisions = resolveCircleMapCollision(this.pos, this.radius, polygons);
        for (const col of collisions) {
            if (col.polyType === PolygonType.DEADLY) {
                this.die(particles);
                return;
            }

            if (col.polyType === PolygonType.BOUNCY) {
                this.vel = this.vel.reflect(col.normal).scale(0.7);
                this.pos.addMut(col.normal.scale(col.depth + 0.01)); // push slightly more to avoid re-collision
                continue;
            }

            // One-way platform logic
            if (col.polyType === PolygonType.ONE_WAY) {
                // Only collide if moving down and falling from above the platform
                const isFalling = this.vel.y > 0;
                const isAbove = (this.prevPos.y + this.radius) <= (this.pos.y + this.radius - col.depth + 1);

                if (!isFalling || col.normal.y > -0.5 || !isAbove) {
                    continue; // Skip collision
                }
            }

            // Push out of polygon
            this.pos.addMut(col.normal.scale(col.depth + 0.01));

            // Check if this is ground (normal points upward enough)
            if (col.normal.y < -0.5) {
                this.isGrounded = true;
                if (this.vel.y > 0) {
                    // Project velocity along the surface for smooth ramp sliding
                    const tangent = new Vector2(-col.normal.y, col.normal.x);
                    const dot = this.vel.dot(tangent);
                    this.vel.x = tangent.x * dot;
                    this.vel.y = tangent.y * dot;
                }
            } else {
                // Wall or ceiling — remove velocity component into the wall
                const velDotNormal = this.vel.dot(col.normal);
                if (velDotNormal < 0) {
                    this.vel.subMut(col.normal.scale(velDotNormal));
                }
            }
        }

        // === MAP BOUNDS (Safety) ===
        // We'll pass the map bounds in the next turn or just use a generic large area for now
        // But let's actually add a proper bounds check if we can get it from the map.

        // === WEAPON ===
        this.updateWeapon(input, bullets, grenades, particles);

        // === GOSTEK ===
        this.gostek.update(this.vel.x, this.isGrounded, input.mouseWorldX, this.pos.x);
    }

    /** Keep player within map boundaries */
    enforceBounds(bounds: { left: number, right: number, top: number, bottom: number }): void {
        if (this.pos.x < bounds.left + this.radius) {
            this.pos.x = bounds.left + this.radius;
            this.vel.x = Math.max(0, this.vel.x);
        }
        if (this.pos.x > bounds.right - this.radius) {
            this.pos.x = bounds.right - this.radius;
            this.vel.x = Math.min(0, this.vel.x);
        }
        if (this.pos.y < bounds.top + this.radius) {
            this.pos.y = bounds.top + this.radius;
            this.vel.y = Math.max(0, this.vel.y);
        }
        // Bottom bound is usually a death pit or solid floor, we handle it via DEADLY polygons mostly.
    }


    private updateWeapon(input: IInput, bullets: BulletManager, grenades: GrenadeManager, particles: ParticleSystem): void {
        // Slot switching
        if (input.isKeyJustPressed('Digit1')) this.switchSlot(1);
        if (input.isKeyJustPressed('Digit2')) this.switchSlot(2);

        if (this.fireTimer > 0) this.fireTimer--;

        // GRENADES (with charging)
        if (input.isKeyDown('KeyF') && this.grenadeCount > 0 && this.grenadeWaitTimer <= 0) {
            this.isChargingGrenade = true;
            this.grenadeCharge = Math.min(1.0, this.grenadeCharge + 0.02); // 0.8s to fully charge
        } else {
            if (this.isChargingGrenade) {
                this.throwGrenade(grenades);
            }
            this.isChargingGrenade = false;
            this.grenadeCharge = 0;
        }

        const w = this.weapon;

        // Reloading
        if (this.reloading) {
            this.reloadTimer--;
            if (this.reloadTimer <= 0) {
                this.ammo[this.currentWeaponIndex] = w.magazineSize;
                this.reloading = false;
            }
        }

        if (!this.reloading) {
            if (input.isKeyJustPressed('KeyR')) {
                this.startReload();
                return;
            }

            // SHOOTING (with charge check)
            const isFiringHeld = input.mouseLeft;

            if (w.requiresCharge) {
                if (isFiringHeld && this.fireTimer <= 0 && this.ammo[this.currentWeaponIndex] > 0) {
                    this.isCharging = true;
                    this.chargeLevel = Math.min(1, this.chargeLevel + 1 / w.chargeTime!);
                } else {
                    if (this.isCharging && this.chargeLevel >= 0.95) {
                        this.fire(bullets, particles);
                    }
                    this.isCharging = false;
                    this.chargeLevel = 0;
                }
            } else {
                // Normal firing
                const canFire = isFiringHeld && this.fireTimer <= 0 && this.ammo[this.currentWeaponIndex] > 0;
                if (canFire) {
                    this.fire(bullets, particles);
                }
            }

            if (this.ammo[this.currentWeaponIndex] <= 0) {
                this.startReload();
            }
        }
    }

    private throwGrenade(grenades: GrenadeManager): void {
        if (this.grenadeCount <= 0 || this.grenadeWaitTimer > 0) return;

        this.grenadeCount--;
        this.grenadeWaitTimer = 45; // slightly longer cooldown

        const shoulderPos = new Vector2(this.pos.x, this.pos.y - 12);
        const throwDir = Vector2.fromAngle(this.aimAngle, 1);

        // Base power 8, max power 22
        const power = 8 + (this.grenadeCharge * 14);
        const throwVel = throwDir.scale(power);

        // Add player momentum (scaled)
        throwVel.x += this.vel.x * 0.4;
        throwVel.y += this.vel.y * 0.2;

        // Use this player as the owner to avoid self-destruct for first 15 frames
        grenades.spawn(shoulderPos, throwVel, 0, this);
    }

    takeDamage(amount: number, particles: ParticleSystem): void {
        if (this.isDead || this.isInvincible) return;
        this.health -= amount;

        // Spawn blood particles on hit
        particles.spawnBlood(this.pos, new Vector2((Math.random() - 0.5) * 2, -1), 3);

        if (this.health <= 0) {
            this.health = 0;
            this.die(particles);
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
            reloadProgress,
            this.backflipRotation + this.rollRotation,
            this.isRolling || this.isBackflipping,
            this.vel.x
        );
    }

    private performBackflip(dirX: number): void {
        this.isBackflipping = true;
        this.isGrounded = false;
        this.backflipTimer = this.BACKFLIP_DURATION;
        this.backflipRotation = 0;
        this.isInvincible = true;

        // Impulses
        this.vel.y = -JUMP_FORCE * 1.15;
        this.vel.x = dirX * MAX_SPEED_X * 0.85;

        // Hitbox reduction
        this.radius = PLAYER_RADIUS * 0.85;
    }

    private performRoll(dirX: number): void {
        this.isRolling = true;
        this.rollTimer = this.ROLL_DURATION;
        this.rollRotation = 0;
        this.isInvincible = true;

        // Velocity boost forward
        this.vel.x = dirX * MAX_SPEED_X * this.ROLL_SPEED_BOOST;

        // Hitbox reduction (smaller while rolling)
        this.radius = PLAYER_RADIUS * 0.7;
    }

}


