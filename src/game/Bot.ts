import { Vector2 } from '../engine/Vector2';
import { IInput } from '../engine/IInput';
import { Player } from './Player';
import { MapPolygon, PickupData, PickupType } from './GameMap';
import { BulletManager } from './Bullet';
import { ParticleSystem } from './Particles';
import { AudioManager } from '../engine/AudioManager';
import { raycastMap } from './Physics';
import { GameModeManager, GameModeType } from './GameMode';
import { Team } from './Player';

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
        polygons: MapPolygon[],
        bullets: BulletManager,
        grenades: any, // GrenadeManager
        particles: ParticleSystem,
        players: Player[],
        audio: AudioManager,
        pickups: PickupData[] = [],
        gameMode?: GameModeManager
    ): void {
        // Find mission-critical targets
        let bestTarget: Player | null = null;
        let bestDist = Infinity;

        // If in CTF, prioritize the enemy carrier
        if (gameMode && gameMode.mode === GameModeType.CTF) {
            const enemyFlag = this.team === Team.ALPHA ? gameMode.flags[Team.BRAVO] : gameMode.flags[Team.ALPHA];
            const myFlag = this.team === Team.ALPHA ? gameMode.flags[Team.ALPHA] : gameMode.flags[Team.BRAVO];

            // 1. If someone stole our flag, KILL THEM
            if (myFlag?.carrier && myFlag.carrier.team !== this.team) {
                bestTarget = myFlag.carrier;
                bestDist = this.pos.distance(bestTarget.pos);
            }
            
            // 2. If we are near the enemy flag and it's free, approach it (handled in think)
        }

        if (!bestTarget) {
            // Find nearest enemy
            for (const p of players) {
                if (p.isDead || p === this || p.team === this.team) continue;
                const d = this.pos.distance(p.pos);
                if (d < bestDist) {
                    bestDist = d;
                    bestTarget = p;
                }
            }
        }
        
        this.target = bestTarget;

        this.botInput.clearPerFrame();

        if (this.isDead) {
            super.update(this.botInput, polygons, bullets, grenades, particles, players, audio);
            return;
        }

        this.updateAimError();
        this.think(polygons, pickups, players, gameMode);
        super.update(this.botInput, polygons, bullets, grenades, particles, players, audio);
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

    private think(polygons: MapPolygon[], pickups: PickupData[] = [], players: Player[] = [], gameMode?: GameModeManager): void {
        // --- CTF OBJECTIVE RECOGNITION ---
        if (gameMode && gameMode.mode === GameModeType.CTF) {
            const enemyFlag = this.team === Team.ALPHA ? gameMode.flags[Team.BRAVO] : gameMode.flags[Team.ALPHA];
            const myFlag = this.team === Team.ALPHA ? gameMode.flags[Team.ALPHA] : gameMode.flags[Team.BRAVO];

            // If I HAVE the flag, go back to base
            if (this.hasFlag && myFlag) {
                const distToBase = this.pos.distance(myFlag.basePos);
                if (distToBase > 50) {
                    const goRight = myFlag.basePos.x > this.pos.x;
                    this.botInput.setKeyDown('KeyD', goRight);
                    this.botInput.setKeyDown('KeyA', !goRight);
                    if (this.isGrounded && Math.random() > 0.9) this.botInput.setKeyDown('KeyW', true);
                    return;
                }
            }

            // If enemy flag is dropped or at base and no one has it, GO GET IT
            if (enemyFlag && !enemyFlag.carrier) {
                const distToFlag = this.pos.distance(enemyFlag.currentPos);
                if (distToFlag < 800) { // If reasonably close
                    const goRight = enemyFlag.currentPos.x > this.pos.x;
                    this.botInput.setKeyDown('KeyD', goRight);
                    this.botInput.setKeyDown('KeyA', !goRight);
                    if (this.isGrounded && Math.random() > 0.9) this.botInput.setKeyDown('KeyW', true);
                    return;
                }
            }
        }

        if (!this.target) return;

        // --- HEALTH SEEKING... ---
        // ... (existing health code)
        if (this.health < 60) {
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
                if (this.isGrounded && Math.random() > 0.95) this.botInput.setKeyDown('KeyW', true);
                return;
            }
        }

        const dist = this.pos.distance(this.target.pos);
        const dir = this.target.pos.sub(this.pos).normalize();

        // 1. AIM
        this.botInput.mouseWorldX = this.target.pos.x + this.aimError.x;
        this.botInput.mouseWorldY = this.target.pos.y - 12 + this.aimError.y;

        // 2. MOVEMENT
        if (Math.random() > 0.02) {
            if (dist > 250) {
                const goRight = this.target.pos.x > this.pos.x + 40;
                this.botInput.setKeyDown('KeyD', goRight);
                this.botInput.setKeyDown('KeyA', !goRight);
            } else if (dist < 150) {
                const goLeft = this.target.pos.x > this.pos.x;
                this.botInput.setKeyDown('KeyA', goLeft);
                this.botInput.setKeyDown('KeyD', !goLeft);
            }
        }

        // 3. JUMPING...
        const wallHit = raycastMap(this.pos, new Vector2(this.vel.x > 0 ? 1 : -1, 0), 40, polygons);
        if (wallHit.hit || this.target.pos.y < this.pos.y - 60) {
            if (this.isGrounded && Math.random() > 0.5) this.botInput.setKeyDown('KeyW', true);
            else if (this.fuel > 40) this.botInput.mouseRight = Math.random() > 0.3;
        }

        // 4. FIRING (with Teammate Avoidance)
        const los = raycastMap(this.pos, dir, dist, polygons);
        
        let teammateInLine = false;
        for (const p of players) {
            if (p === this || p.team !== this.team || p.isDead) continue;
            // Simplified check: is the teammate on the path between me and the target?
            const toFriend = p.pos.sub(this.pos);
            const friendDist = toFriend.length();
            if (friendDist < dist) {
                const dot = toFriend.normalize().dot(dir);
                if (dot > 0.98) { // Very aligned
                    teammateInLine = true;
                    break;
                }
            }
        }

        const canSee = !los.hit && dist < this.fireThreshold && !teammateInLine;

        if (canSee) {
            this.stateTimer++;
            if (this.stateTimer > this.reactionDelay) {
                this.burstTimer--;
                if (this.burstTimer <= 0) {
                    this.isBursting = !this.isBursting;
                    this.burstTimer = this.isBursting ? 20 + Math.random() * 30 : 15 + Math.random() * 25;
                }
                this.botInput.mouseLeft = this.isBursting;
            }
        } else {
            this.botInput.mouseLeft = false;
            this.isBursting = false;
            this.stateTimer = Math.max(0, this.stateTimer - 2);
        }
    }

}
