import { Vector2 } from './Vector2';
import { Input } from './Input';
import { Camera } from './Camera';
import { Player } from '../game/Player';
import { Bot } from '../game/Bot';
import { GameMap, Material } from '../game/GameMap';
import { BulletManager } from '../game/Bullet';
import { ParticleSystem } from '../game/Particles';
import { HUD } from '../game/HUD';
import { WeatherSystem } from '../game/Weather';
import { GrenadeManager } from '../game/Grenade';
import { PickupManager } from '../game/PickupManager';
import { TouchControls } from './TouchControls';
import { trincheiras } from '../game/maps/trincheiras';
import { GUIManager, GameUIState } from './GUIManager';
import { AudioManager } from './AudioManager';

/**
 * Main game class: orchestrates the game loop, all systems, and rendering.
 */
export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    input: Input;
    camera: Camera;
    map: GameMap;
    player: Player;
    bots: Bot[] = [];
    bullets: BulletManager;
    grenades: GrenadeManager;
    pickups: PickupManager;
    particles: ParticleSystem;
    weather: WeatherSystem;
    hud: HUD;
    touchControls: TouchControls;
    gui: GUIManager;
    audio: AudioManager;

    state: GameUIState = 'MAIN_MENU';

    private lastTime: number = 0;
    private accumulator: number = 0;
    private readonly fixedDt: number = 1000 / 60; // 60 FPS physics
    private running: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;

        // Initialize systems
        this.input = new Input(canvas);
        this.camera = new Camera();
        this.map = new GameMap(trincheiras);

        const spawnPos = this.map.getRandomSpawn();
        this.player = new Player(spawnPos);
        this.player.spawnProvider = () => this.map.getRandomSpawn();

        // Add some bots
        for (let i = 0; i < 3; i++) {
            const bot = new Bot(this.map.getRandomSpawn());
            bot.spawnProvider = () => this.map.getRandomSpawn();
            this.bots.push(bot);
        }

        this.bullets = new BulletManager();
        this.grenades = new GrenadeManager();
        this.pickups = new PickupManager();
        this.particles = new ParticleSystem(
            trincheiras.bounds.right - trincheiras.bounds.left,
            trincheiras.bounds.bottom - trincheiras.bounds.top
        );
        this.weather = new WeatherSystem(trincheiras.weather || { type: 'none', intensity: 0, windX: 0 });
        this.hud = new HUD();
        this.touchControls = new TouchControls(this.canvas);
        this.gui = new GUIManager();
        this.audio = new AudioManager();

        // Load sprite sheets, then rebuild the map render cache with real textures
        this.map.loadSpritesAndRebuild().catch(() => {/* sprites optional */ });

        // Resume AudioContext on first user gesture
        const resumeAudio = () => { this.audio.resume(); };
        window.addEventListener('keydown', resumeAudio, { once: true });
        window.addEventListener('mousedown', resumeAudio, { once: true });
        window.addEventListener('touchstart', resumeAudio, { once: true });

        // Initial menu screen
        this.gui.setScreen('MAIN_MENU');

        // Set canvas size and initial setup
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.camera.resize(canvas.width, canvas.height);
    }

    private resize(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.camera?.resize(this.canvas.width, this.canvas.height);
        this.weather?.resize(this.canvas.width, this.canvas.height);
    }

    start(): void {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    private loop(time: number): void {
        if (!this.running) return;

        const elapsed = time - this.lastTime;
        this.lastTime = time;
        this.accumulator += elapsed;

        // Fixed timestep updates
        while (this.accumulator >= this.fixedDt) {
            this.update();
            this.accumulator -= this.fixedDt;
        }

        this.render();
        this.input.endFrame();

        // Global key handling: ESC for pause
        if (this.input.isKeyJustPressed('Escape')) {
            this.togglePause();
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    togglePause(): void {
        if (this.state === 'MAIN_MENU') return;

        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.gui.setScreen('PAUSED');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.gui.setScreen('NONE');
        }
    }

    private update(): void {
        if (this.state !== 'PLAYING') return;

        // Update mouse world coordinates
        this.input.updateMouseWorld(this.camera.x, this.camera.y, this.camera.scale);

        const collisionPolygons = this.map.getPlayerCollisionPolygons();
        const bulletPolygons = this.map.getBulletCollisionPolygons();

        // 1. Update player
        const allPlayers = [this.player, ...this.bots];

        // Update mobile controls
        this.touchControls.update(this.input, this.player, allPlayers);
        this.player.update(this.input, collisionPolygons, this.bullets, this.grenades, this.particles, allPlayers);
        this.player.enforceBounds(this.map.data.bounds);

        // 2. Update bots
        for (const bot of this.bots) {
            bot.updateBot(
                this.player,
                collisionPolygons,
                this.bullets,
                this.grenades,
                this.particles,
                allPlayers,
                this.map.data.pickups || []
            );
            bot.enforceBounds(this.map.data.bounds);
        }

        // 3. Update Grenades
        const grenadeResult = this.grenades.update(collisionPolygons, this.particles, allPlayers);

        // Shake camera + play sound for each explosion
        for (const exp of (grenadeResult as any)?.explosions ?? []) {
            this.camera.applyShake(14);
            this.audio.playExplosion(this.getSoundPan(exp.x ?? this.player.pos.x));
        }
        // Fallback: if grenadeResult is undefined (old API returns void)
        if (!grenadeResult) {
            // explosion events unavailable, skip
        }

        // 3a. Update Pickups
        if (this.map.data.pickups) {
            this.pickups.update(this.map.data.pickups, allPlayers, this.particles);
        }

        // Spawn footstep particles
        if (this.player.isGrounded && Math.abs(this.player.vel.x) > 1) {
            const footPos = this.player.pos.add(new Vector2(0, this.player.radius));
            const material = this.getMaterialAt(footPos) || Material.DIRT;
            this.particles.spawnFootstepDust(footPos, material, this.player.vel.x);
        }

        // 4. Update bullets
        const { hitBullets, hitPositions, hitNormals, hitPlayers } = this.bullets.update(bulletPolygons, allPlayers);

        // Handle bullet impacts on materials
        for (let i = 0; i < hitPositions.length; i++) {
            const material = this.getMaterialAt(hitPositions[i]) || Material.CONCRETE;
            this.particles.spawnMaterialImpact(hitPositions[i], hitNormals[i], material);
        }

        // Handle bullet damage to players/bots
        for (const hit of hitPlayers) {
            const wasDead = hit.player.isDead;
            hit.player.takeDamage(hit.damage, this.particles);
            // Camera shake when player is hit
            if (hit.player === this.player) {
                this.camera.applyShake(hit.damage * 0.25);
            }
            // Death sound
            if (!wasDead && hit.player.isDead) {
                this.audio.playDeath(this.getSoundPan(hit.player.pos.x));
            }
        }

        // Update systems
        this.particles.update();
        this.weather.update();

        // Update camera (follow player)
        this.camera.follow(
            this.player.pos,
            this.input.mouseWorldX,
            this.input.mouseWorldY
        );

        // Death pits check
        const bounds = this.map.data.bounds;
        if (this.player.pos.y > bounds.bottom + 200) {
            this.player.die(this.particles);
        }
        for (const bot of this.bots) {
            if (bot.pos.y > bounds.bottom + 200) {
                bot.die(this.particles);
            }
        }
    }

    /**
     * Convert a world X position to stereo pan value (-1 = far left, 1 = far right).
     * Objects near the centre of screen ≈ 0; beyond the viewport edges ≈ ±1.
     */
    private getSoundPan(worldX: number): number {
        const screenX = (worldX - this.camera.x) * this.camera.scale;
        const pan = (screenX / this.canvas.width) * 2 - 1;
        return Math.max(-1, Math.min(1, pan));
    }

    private getMaterialAt(pos: Vector2): Material | null {
        for (const poly of this.map.data.polygons) {
            if (this.isPointInPoly(pos, poly.vertices)) {
                return poly.material || Material.CONCRETE;
            }
        }
        return null;
    }

    private isPointInPoly(p: Vector2, verts: Vector2[]): boolean {
        let inside = false;
        for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
            if (((verts[i].y > p.y) !== (verts[j].y > p.y)) &&
                (p.x < (verts[j].x - verts[i].x) * (p.y - verts[i].y) / (verts[j].y - verts[i].y) + verts[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }

    private render(): void {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        this.map.renderBackground(ctx, w, h);
        this.map.renderParallaxBehind(ctx, this.camera.x, this.camera.y, w, h);

        ctx.save();
        ctx.translate(-this.camera.x * this.camera.scale, -this.camera.y * this.camera.scale);
        ctx.scale(this.camera.scale, this.camera.scale);

        this.particles.renderPersistent(ctx);
        this.map.renderSceneryBehind(ctx);
        this.map.render(ctx);
        this.grenades.render(ctx);
        if (this.map.data.pickups) {
            this.pickups.render(ctx, this.map.data.pickups);
        }
        this.bullets.render(ctx);

        // Render players and bots
        this.player.render(ctx);
        for (const bot of this.bots) {
            bot.render(ctx);
        }

        this.particles.render(ctx);
        this.map.renderSceneryFront(ctx);
        ctx.restore();

        this.weather.render(ctx);
        this.hud.render(ctx, this.player, this.input, w, h);
        this.touchControls.render(ctx);
        this.hud.renderCrosshairAt(ctx, this.input.mouseX, this.input.mouseY);

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Soldat Web v0.1 | ${this.map.data.name} | BOTS: ${this.bots.length}`, 10, 16);
    }
}


