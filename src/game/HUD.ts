import { Player } from './Player';
import { WEAPONS } from './Weapon';

/**
 * In-game HUD rendering: health bar, fuel gauge, ammo, weapon name, crosshair.
 */
export class HUD {
    render(ctx: CanvasRenderingContext2D, player: Player, screenW: number, screenH: number): void {
        if (player.isDead) {
            this.renderDeathScreen(ctx, player, screenW, screenH);
            return;
        }

        ctx.save();

        // ==================
        // Health Bar (bottom-left)
        // ==================
        const barX = 20;
        const barY = screenH - 50;
        const barW = 180;
        const barH = 14;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

        // Health fill
        const healthPercent = player.health / player.maxHealth;
        const healthColor = healthPercent > 0.5
            ? `hsl(${120 * healthPercent}, 80%, 45%)`
            : `hsl(${120 * healthPercent}, 90%, 50%)`;
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barW * healthPercent, barH);

        // Health text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`HP ${Math.ceil(player.health)}`, barX + 4, barY + 11);

        // ==================
        // Fuel Gauge (below health)
        // ==================
        const fuelY = barY + barH + 6;
        const fuelH = 8;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX - 2, fuelY - 2, barW + 4, fuelH + 4);

        const fuelPercent = player.fuel / player.maxFuel;
        ctx.fillStyle = fuelPercent > 0.3
            ? `hsl(200, 80%, ${40 + fuelPercent * 20}%)`
            : `hsl(30, 90%, 50%)`;
        ctx.fillRect(barX, fuelY, barW * fuelPercent, fuelH);

        ctx.fillStyle = '#aaddff';
        ctx.font = '9px monospace';
        ctx.fillText(`FUEL`, barX + 4, fuelY + 7);

        // ==================
        // Weapon & Ammo (bottom-right)
        // ==================
        const weapon = WEAPONS[player.currentWeaponIndex];
        const ammo = player.ammo[player.currentWeaponIndex];

        ctx.textAlign = 'right';
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(weapon.name, screenW - 20, screenH - 50);

        ctx.font = 'bold 20px monospace';
        if (player.reloading) {
            ctx.fillStyle = '#ff8844';
            ctx.fillText('RELOADING...', screenW - 20, screenH - 28);
        } else {
            ctx.fillStyle = ammo > 0 ? '#fff' : '#ff4444';
            ctx.fillText(`${ammo} / ${weapon.magazineSize}`, screenW - 20, screenH - 28);
        }

        // ==================
        // Weapon slots (bottom center)
        // ==================
        const slotW = 28;
        const slotH = 22;
        const totalW = WEAPONS.length * (slotW + 4);
        const slotStartX = (screenW - totalW) / 2;
        const slotY = screenH - 32;

        for (let i = 0; i < WEAPONS.length; i++) {
            const sx = slotStartX + i * (slotW + 4);
            const isActive = i === player.currentWeaponIndex;

            ctx.fillStyle = isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.4)';
            ctx.fillRect(sx, slotY, slotW, slotH);

            if (isActive) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(sx, slotY, slotW, slotH);
            }

            ctx.fillStyle = isActive ? '#fff' : '#888';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${i + 1}`, sx + slotW / 2, slotY + 15);
        }

        // ==================
        // Crosshair
        // ==================
        this.renderCrosshair(ctx, screenW, screenH);

        ctx.restore();
    }

    private renderCrosshair(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
        // We draw the crosshair at the actual mouse position (screen center area)
        // The mouse coordinates need to be passed; for now we draw at screen center
        // This will be drawn separately in the game loop using actual mouse coords
    }

    renderCrosshairAt(ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number): void {
        const size = 12;
        const gap = 4;
        const thickness = 2;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = thickness;

        // Top
        ctx.beginPath();
        ctx.moveTo(mouseX, mouseY - gap);
        ctx.lineTo(mouseX, mouseY - gap - size);
        ctx.stroke();

        // Bottom
        ctx.beginPath();
        ctx.moveTo(mouseX, mouseY + gap);
        ctx.lineTo(mouseX, mouseY + gap + size);
        ctx.stroke();

        // Left
        ctx.beginPath();
        ctx.moveTo(mouseX - gap, mouseY);
        ctx.lineTo(mouseX - gap - size, mouseY);
        ctx.stroke();

        // Right
        ctx.beginPath();
        ctx.moveTo(mouseX + gap, mouseY);
        ctx.lineTo(mouseX + gap + size, mouseY);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    private renderDeathScreen(ctx: CanvasRenderingContext2D, player: Player, screenW: number, screenH: number): void {
        ctx.fillStyle = 'rgba(120, 0, 0, 0.3)';
        ctx.fillRect(0, 0, screenW, screenH);

        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOU DIED', screenW / 2, screenH / 2 - 20);

        const secondsLeft = Math.ceil(player.respawnTimer / 60);
        ctx.fillStyle = '#ffaaaa';
        ctx.font = '16px monospace';
        ctx.fillText(`Respawning in ${secondsLeft}...`, screenW / 2, screenH / 2 + 15);
    }
}
