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
import { megaMap } from '../game/maps/megaMap';
import { ThreeRenderer } from './ThreeRenderer';
import { GUIManager, GameUIState } from './GUIManager';
import { AudioManager } from './AudioManager';
import { GameModeManager, GameModeType } from '../game/GameMode';
import { Team } from '../game/Player';

/**
 * Main game class: orchestrates the game loop, all systems, and rendering.
 */
export class Game {
    canvas: HTMLCanvasElement;
    hudCanvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    input: Input;
    camera: Camera;
    map: GameMap;
    threeRenderer: ThreeRenderer;
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
    gameModeManager: GameModeManager;

    state: GameUIState = 'MAIN_MENU';

    private lastTime: number = 0;
    private accumulator: number = 0;
    private readonly fixedDt: number = 1000 / 60; // 60 FPS physics
    private running: boolean = false;

    constructor(canvas: HTMLCanvasElement, hudCanvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.hudCanvas = hudCanvas;
        this.ctx = this.hudCanvas.getContext('2d')!;

        // Initialize systems
        this.input = new Input(canvas);
        this.camera = new Camera();
        this.map = new GameMap(megaMap);
        this.threeRenderer = new ThreeRenderer(canvas);
        this.threeRenderer.initMap(this.map);

        const spawnPos = this.map.getRandomSpawn();
        this.player = new Player(spawnPos);
        this.player.spawnProvider = () => this.map.getRandomSpawn();
        
        // Bots will be setup in setGameMode
        this.bots = [];

        this.bullets = new BulletManager(this.threeRenderer.scene);
        this.grenades = new GrenadeManager(this.threeRenderer.scene);
        this.pickups = new PickupManager();
        this.particles = new ParticleSystem(
            megaMap.bounds.right - megaMap.bounds.left,
            megaMap.bounds.bottom - megaMap.bounds.top,
            this.threeRenderer.scene
        );
        this.weather = new WeatherSystem(megaMap.weather || { type: 'none', intensity: 0, windX: 0 });
        this.hud = new HUD();
        this.touchControls = new TouchControls(this.canvas);
        this.gui = new GUIManager();
        this.audio = new AudioManager();

        // Load sprite sheets, then rebuild the map render cache with real textures
        this.map.loadSpritesAndRebuild().catch(() => {/* sprites optional */ });

        // Add player and bots to 3D scene
        this.threeRenderer.scene.add(this.player.mesh);
        this.bots.forEach(bot => this.threeRenderer.scene.add(bot.mesh));

        // Resume AudioContext on first user gesture
        const resumeAudio = () => { this.audio.resume(); };
        window.addEventListener('keydown', resumeAudio, { once: true });
        window.addEventListener('mousedown', resumeAudio, { once: true });
        window.addEventListener('touchstart', resumeAudio, { once: true });

        // Initial menu screen
        this.gui.setScreen('MAIN_MENU');
        
        this.gameModeManager = new GameModeManager(GameModeType.DEATHMATCH); // Default

        // Set canvas size and initial setup
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.camera.resize(canvas.width, canvas.height);
    }

    private resize(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.hudCanvas.width = window.innerWidth;
        this.hudCanvas.height = window.innerHeight;
        
        this.camera?.resize(this.canvas.width, this.canvas.height);
        this.weather?.resize(this.canvas.width, this.canvas.height);
    }

    start(): void {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    setGameMode(mode: GameModeType): void {
        this.gameModeManager = new GameModeManager(mode);
        
        // Remove old bots
        for (const bot of this.bots) {
            this.threeRenderer.scene.remove(bot.mesh);
        }
        this.bots = [];

        this.player.team = Team.ALPHA; 
        this.player.score = 0;
        this.player.kills = 0;
        this.player.deaths = 0;
        this.player.spawnProvider = () => this.getSpawnForTeam(Team.ALPHA);
        this.player.respawn(this.getSpawnForTeam(Team.ALPHA));

        const botNamesAlpha = ["MAVERICK", "GOOSE", "SNAKE", "RITCHIE"]; // 4 bots
        const botNamesBravo = ["T-800", "VIPER", "JESTER", "ICEMAN", "HUNTER"]; // 5 bots

        botNamesAlpha.forEach((bName) => {
            const bot = new Bot(this.getSpawnForTeam(Team.ALPHA));
            bot.team = Team.ALPHA;
            bot.name = bName;
            bot.spawnProvider = () => this.getSpawnForTeam(Team.ALPHA);
            this.bots.push(bot);
            this.threeRenderer.scene.add(bot.mesh);
        });

        botNamesBravo.forEach((bName) => {
            const bot = new Bot(this.getSpawnForTeam(Team.BRAVO));
            bot.team = Team.BRAVO;
            bot.name = bName;
            bot.spawnProvider = () => this.getSpawnForTeam(Team.BRAVO);
            this.bots.push(bot);
            this.threeRenderer.scene.add(bot.mesh);
        });

        if (mode === GameModeType.CTF) {
            this.gameModeManager.initCTF(new Vector2(-1500, 400), new Vector2(8000, 400));
        }
    }

    private getSpawnForTeam(team: Team): Vector2 {
        const spawns = this.map.data.spawns.filter(s => s.team === team || s.team === 0);
        if (spawns.length === 0) return this.map.getRandomSpawn();
        return spawns[Math.floor(Math.random() * spawns.length)].position.clone();
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
        
        // Sync ThreeRenderer using the camera's world center
        const center = this.camera.center();
        this.threeRenderer.updateCamera(center.x, center.y, this.camera.scale);
        this.threeRenderer.render();

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
        this.player.update(this.input, collisionPolygons, this.bullets, this.grenades, this.particles, allPlayers, this.audio);
        this.player.enforceBounds(this.map.data.bounds);

        // 2. Update bots
        for (const bot of this.bots) {
            bot.updateBot(
                collisionPolygons,
                this.bullets,
                this.grenades,
                this.particles,
                allPlayers,
                this.audio,
                this.map.data.pickups || [],
                this.gameModeManager
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

        // 3a. Update Pickups (Suprimentos Aéreos)
        if (this.map.data.pickups) {
            this.pickups.update(this.map.data.pickups, allPlayers, collisionPolygons || [], this.particles, this.threeRenderer.scene);
        }
        // Spawn footstep particles
        if (this.player.isGrounded && Math.abs(this.player.vel.x) > 1) {
            const footPos = this.player.pos.add(new Vector2(0, this.player.radius));
            const material = this.getMaterialAt(footPos) || Material.DIRT;
            this.particles.spawnFootstepDust(footPos, material, this.player.vel.x);
        }

        // 4. Update bullets (com rastro de fumaça para LAW)
        const { hitBullets, hitPositions, hitNormals, hitPlayers } = this.bullets.update(bulletPolygons, allPlayers, this.particles);
        // Handle bullet impacts on materials
        for (let i = 0; i < hitPositions.length; i++) {
            const b = hitBullets[i];
            const pos = hitPositions[i];
            const norm = hitNormals[i];
            const material = this.getMaterialAt(pos) || Material.CONCRETE;

            if (b.explosive) {
                this.particles.spawnExplosion(pos);
                this.camera.applyShake(25);
                this.audio.playExplosion(this.getSoundPan(pos.x));
            } else {
                this.particles.spawnMaterialImpact(pos, norm, material);
            }
        }

        // Handle bullet damage to players/bots
        for (const hit of hitPlayers) {
            const wasDead = hit.player.isDead;
            const owner = allPlayers.find(p => p.id === hit.bullet.ownerId);
            
            let finalDamage = hit.damage;
            if (owner && owner !== hit.player && owner.team === hit.player.team) {
                finalDamage *= 0.5; // Dano amigo 50% menor
            }

            hit.player.takeDamage(finalDamage, this.particles);
            // Camera shake when player is hit
            if (hit.player === this.player) {
                this.camera.applyShake(hit.damage * 0.25);
            }
            // Death sound and score tracking
            if (!wasDead && hit.player.isDead) {
                this.audio.playDeath(this.getSoundPan(hit.player.pos.x));
                hit.player.addDeath();
                
                // Track kill
                const killer = allPlayers.find(p => p.id === hit.bullet.ownerId);
                if (killer && killer !== hit.player) {
                    killer.addKill();
                    if (this.gameModeManager.mode === GameModeType.DEATHMATCH) {
                        if (killer.team === Team.ALPHA) this.gameModeManager.scoreAlpha++;
                        else if (killer.team === Team.BRAVO) this.gameModeManager.scoreBravo++;
                    }
                }
            }
        }

        this.gameModeManager.update(allPlayers);
        
        if (this.gameModeManager.gameOver) {
            this.audio.playMusic('/assets/endgame.mp3', false);
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

        this.hud.render(ctx, this.player, this.input, w, h, this.audio, this.gameModeManager);
        this.touchControls.render(ctx);
        this.hud.renderCrosshairAt(ctx, this.input.mouseX, this.input.mouseY);

        // Draw character 2D overlays (Charge bars, labels)
        const camX = this.camera.x;
        const camY = this.camera.y;
        const zoom = this.camera.scale;
        
        this.player.render(ctx, camX, camY, zoom);
        for (const bot of this.bots) {
            bot.render(ctx, camX, camY, zoom);
        }

        this.gameModeManager.render(ctx, camX, camY, zoom);
        this.particles.render(ctx, camX, camY, zoom);

        // Game status indicator (top-left) - Responsive scaling
        const isMobileHUD = h < 500;
        const panelW = isMobileHUD ? 160 : 200;
        const panelH = isMobileHUD ? 40 : 48;
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(8, 8, panelW, panelH);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(8, 8, panelW, panelH);

        ctx.fillStyle = '#fff';
        ctx.font = isMobileHUD ? 'bold 12px "Luckiest Guy", cursive' : 'bold 16px "Luckiest Guy", cursive';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        
        const modeLabel = this.gameModeManager.mode === 'CTF' ? 'CAPTURAS' : 'PONTOS';
        ctx.fillText(`${this.gameModeManager.mode}: ${this.gameModeManager.maxScore} ${modeLabel}`, 15, isMobileHUD ? 22 : 26);
        
        ctx.font = isMobileHUD ? '10px Orbitron, monospace' : '14px Orbitron, monospace';
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#3498db'; // ALPHA
        ctx.fillText(`ALPHA: ${this.gameModeManager.scoreAlpha}`, 15, isMobileHUD ? 36 : 46);
        ctx.fillStyle = '#e74c3c'; // BRAVO
        ctx.fillText(`BRAVO: ${this.gameModeManager.scoreBravo}`, isMobileHUD ? 90 : 120, isMobileHUD ? 36 : 46);

        if (this.input.isKeyDown('Tab')) {
            this.hud.renderScoreboard(ctx, this.player, this.bots, this.gameModeManager, w, h);
        }
    }
}


