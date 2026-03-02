import { Vector2 } from '../engine/Vector2';
import { PickupData, PickupType } from './GameMap';
import { Player } from './Player';
import { ParticleSystem } from './Particles';

export class PickupManager {
    update(pickups: PickupData[], players: Player[], particles: ParticleSystem): void {
        for (const p of pickups) {
            if (p.timer > 0) {
                p.timer--;
                continue;
            }

            // Check collision with players
            for (const player of players) {
                if (player.isDead) continue;

                const dist = player.pos.distance(new Vector2(p.x, p.y));
                if (dist < player.radius + 10) {
                    this.applyEffect(p, player);
                    p.timer = 1800; // 30 seconds respawn
                    particles.spawnBlood(player.pos, new Vector2(0, -2), 5); // Just some effect, maybe replace with 'sparkle'
                    break;
                }
            }
        }
    }

    private applyEffect(pickup: PickupData, player: Player): void {
        switch (pickup.type) {
            case PickupType.HEALTH:
                player.health = Math.min(player.maxHealth, player.health + 40);
                break;
            case PickupType.GRENADES:
                player.grenadeCount = Math.min(5, player.grenadeCount + 2);
                break;
        }
    }

    render(ctx: CanvasRenderingContext2D, pickups: PickupData[]): void {
        for (const p of pickups) {
            if (p.timer > 0) continue;

            ctx.save();
            ctx.translate(p.x, p.y);

            // Floating effect
            const floatY = Math.sin(Date.now() * 0.005) * 5;
            ctx.translate(0, floatY);

            // Box shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(-10, 10 - floatY, 20, 5);

            // Box body
            if (p.type === PickupType.HEALTH) {
                ctx.fillStyle = '#ff4444'; // Red for health
            } else {
                ctx.fillStyle = '#44aa44'; // Green for grenades
            }

            ctx.fillRect(-8, -8, 16, 16);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(-8, -8, 16, 16);

            // Icon
            ctx.fillStyle = '#fff';
            if (p.type === PickupType.HEALTH) {
                // Cross
                ctx.fillRect(-2, -6, 4, 12);
                ctx.fillRect(-6, -2, 12, 4);
            } else {
                // Circle (grenade)
                ctx.beginPath();
                ctx.arc(0, 0, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }
}
