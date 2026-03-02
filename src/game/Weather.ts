import { Vector2 } from '../engine/Vector2';
import { WeatherConfig } from './GameMap';

/**
 * Weather particle system: rain, snow, or ash particles.
 * These are global ambient particles rendered in screen-space.
 */
export interface WeatherParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    /** For snow: gentle swaying phase */
    phase: number;
}

export class WeatherSystem {
    particles: WeatherParticle[] = [];
    config: WeatherConfig;
    private screenW: number = 0;
    private screenH: number = 0;
    private maxParticles: number = 0;

    constructor(config: WeatherConfig) {
        this.config = config;
    }

    resize(w: number, h: number): void {
        this.screenW = w;
        this.screenH = h;
        // Calculate max particles based on intensity and screen size
        this.maxParticles = Math.floor(this.config.intensity * (w * h) / 3000);
    }

    update(): void {
        if (this.config.type === 'none') return;

        // Spawn new particles
        while (this.particles.length < this.maxParticles) {
            this.particles.push(this.spawnParticle());
        }

        // Update existing
        const alive: WeatherParticle[] = [];
        for (const p of this.particles) {
            switch (this.config.type) {
                case 'rain':
                    p.x += p.vx + this.config.windX;
                    p.y += p.vy;
                    break;
                case 'snow':
                    p.phase += 0.02;
                    p.x += Math.sin(p.phase) * 0.5 + this.config.windX * 0.3;
                    p.y += p.vy;
                    break;
                case 'ash':
                    p.phase += 0.015;
                    p.x += Math.sin(p.phase) * 0.8 + this.config.windX * 0.5;
                    p.y += p.vy;
                    p.opacity *= 0.999;
                    break;
            }

            // Recycle particles that go off screen
            if (p.y > this.screenH + 10 || p.x < -20 || p.x > this.screenW + 20 || p.opacity < 0.05) {
                alive.push(this.spawnParticle());
            } else {
                alive.push(p);
            }
        }
        this.particles = alive;
    }

    private spawnParticle(): WeatherParticle {
        const base: WeatherParticle = {
            x: Math.random() * (this.screenW + 40) - 20,
            y: -Math.random() * 50,
            vx: 0,
            vy: 0,
            size: 1,
            opacity: 0.3 + Math.random() * 0.5,
            phase: Math.random() * Math.PI * 2,
        };

        switch (this.config.type) {
            case 'rain':
                base.vx = this.config.windX * 0.5;
                base.vy = 8 + Math.random() * 6;
                base.size = 1 + Math.random() * 1.5;
                base.opacity = 0.2 + Math.random() * 0.3;
                break;
            case 'snow':
                base.vy = 1 + Math.random() * 1.5;
                base.size = 2 + Math.random() * 3;
                base.opacity = 0.4 + Math.random() * 0.4;
                break;
            case 'ash':
                base.vy = 0.5 + Math.random() * 1;
                base.size = 1.5 + Math.random() * 2;
                base.opacity = 0.3 + Math.random() * 0.3;
                break;
        }
        return base;
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (this.config.type === 'none') return;

        const color = this.config.color || this.getDefaultColor();

        for (const p of this.particles) {
            ctx.globalAlpha = p.opacity;

            switch (this.config.type) {
                case 'rain':
                    // Rain as streaks
                    ctx.strokeStyle = color;
                    ctx.lineWidth = p.size * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + p.vx * 0.3, p.y + p.vy * 0.4);
                    ctx.stroke();
                    break;

                case 'snow':
                    // Snow as circles
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'ash':
                    // Ash as tiny irregular shapes
                    ctx.fillStyle = color;
                    ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
                    break;
            }
        }
        ctx.globalAlpha = 1;
    }

    private getDefaultColor(): string {
        switch (this.config.type) {
            case 'rain': return 'rgba(180, 200, 255, 0.6)';
            case 'snow': return 'rgba(255, 255, 255, 0.8)';
            case 'ash': return 'rgba(100, 80, 60, 0.5)';
            default: return '#fff';
        }
    }
}
