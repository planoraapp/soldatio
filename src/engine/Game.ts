import { Vector2 } from './Vector2';
import { Input } from './Input';
import { Camera } from './Camera';
import { Player } from '../game/Player';
import { GameMap, Material } from '../game/GameMap';
import { BulletManager } from '../game/Bullet';
import { ParticleSystem } from '../game/Particles';
import { HUD } from '../game/HUD';
import { WeatherSystem } from '../game/Weather';
import { enhancedTestMap } from '../game/maps/enhancedTestMap';

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
    bullets: BulletManager;
    particles: ParticleSystem;
    weather: WeatherSystem;
    hud: HUD;

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
        this.map = new GameMap(enhancedTestMap);

        const spawnPos = this.map.getRandomSpawn();
        this.player = new Player(spawnPos);
        this.player.spawnProvider = () => this.map.getRandomSpawn();
        this.bullets = new BulletManager();
        this.particles = new ParticleSystem(
            enhancedTestMap.bounds.right - enhancedTestMap.bounds.left,
            enhancedTestMap.bounds.bottom - enhancedTestMap.bounds.top
        );
        this.weather = new WeatherSystem(enhancedTestMap.weather || { type: 'none', intensity: 0, windX: 0 });
        this.hud = new HUD();

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

        requestAnimationFrame((t) => this.loop(t));
    }

    private update(): void {
        // Update mouse world coordinates
        this.input.updateMouseWorld(this.camera.x, this.camera.y, this.camera.scale);

        // Update player
        const collisionPolygons = this.map.getPlayerCollisionPolygons();
        this.player.update(this.input, collisionPolygons, this.bullets, this.particles, 1);

        // Spawn footstep particles
        if (this.player.isGrounded && Math.abs(this.player.vel.x) > 1) {
            // Find material under player (simplification: find first overlapping solid)
            const footPos = this.player.pos.add(new Vector2(0, this.player.radius));
            const material = this.getMaterialAt(footPos) || Material.DIRT;
            this.particles.spawnFootstepDust(footPos, material, this.player.vel.x);
        }

        // Update bullets
        const bulletPolygons = this.map.getBulletCollisionPolygons();
        const { hitBullets, hitPositions, hitNormals } = this.bullets.update(bulletPolygons);

        // Spawn particles at bullet impact points (material specific)
        for (let i = 0; i < hitPositions.length; i++) {
            const material = this.getMaterialAt(hitPositions[i]) || Material.CONCRETE;
            this.particles.spawnMaterialImpact(hitPositions[i], hitNormals[i], material);
        }

        // Update systems
        this.particles.update();
        this.weather.update();

        // Update camera
        this.camera.follow(
            this.player.pos,
            this.input.mouseWorldX,
            this.input.mouseWorldY
        );

        // Out of bounds check
        const bounds = this.map.data.bounds;
        if (this.player.pos.y > bounds.bottom + 200) {
            this.player.die(this.particles);
        }
    }

    private getMaterialAt(pos: Vector2): Material | null {
        // Very basic point-in-polygon check to find material
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

        // Clear
        ctx.clearRect(0, 0, w, h);

        // 1. Sky Background (screen-space)
        this.map.renderBackground(ctx, w, h);

        // 2. Parallax Layers (Behind)
        this.map.renderParallaxBehind(ctx, this.camera.x, this.camera.y, w, h);

        // Apply camera transform for world-space objects
        ctx.save();
        ctx.translate(-this.camera.x * this.camera.scale, -this.camera.y * this.camera.scale);
        ctx.scale(this.camera.scale, this.camera.scale);

        // 3. Persistent blood decals
        this.particles.renderPersistent(ctx);

        // 4. Scenery (Behind players)
        this.map.renderSceneryBehind(ctx);

        // 5. Map polygons (Core Geometry)
        this.map.render(ctx);

        // 6. Bullets
        this.bullets.render(ctx);

        // 7. Player
        this.player.render(ctx);

        // 8. Active particles
        this.particles.render(ctx);

        // 9. Scenery (In front of players)
        this.map.renderSceneryFront(ctx);

        ctx.restore();

        // 10. Weather (screen-space)
        this.weather.render(ctx);

        // 11. HUD (screen-space)
        this.hud.render(ctx, this.player, w, h);
        this.hud.renderCrosshairAt(ctx, this.input.mouseX, this.input.mouseY);

        // UI Text
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Soldat Web v0.1 | ${this.map.data.name}`, 10, 16);
    }
}

