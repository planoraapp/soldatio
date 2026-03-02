import { Player } from './Player';
import { WEAPONS } from './Weapon';
import { IInput } from '../engine/IInput';
import { Vector2 } from '../engine/Vector2';

/**
 * In-game HUD rendering: health bar, fuel gauge, ammo, weapon name, crosshair.
 */
export class HUD {
    render(ctx: CanvasRenderingContext2D, player: Player, input: IInput, screenW: number, screenH: number): void {
        const isMenuOpen = input.isKeyDown('KeyG') || input.isKeyDown('Escape');

        if (player.isDead) {
            this.renderDeathScreen(ctx, player, screenW, screenH);
            return;
        }

        ctx.save();

        // Layout constants
        const hudH = 70;
        const hudY = screenH - hudH;
        const padding = 30;
        const colCount = 3;
        const totalGap = 60;
        const colW = (screenW - (padding * 2) - totalGap) / colCount;

        // Background strip (optional, for readability)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, hudY, screenW, hudH);

        // ==================
        // Column 1: Health
        // ==================
        const col1X = padding;
        const centerY = hudY + hudH / 2;

        // Large Number
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const healthVal = Math.ceil(player.health);
        ctx.fillText(healthVal.toString(), col1X, centerY);
        const numberOffset = ctx.measureText(healthVal.toString()).width + 12;

        // Visual Bar
        const barStartX = col1X + numberOffset;
        const barW = colW - numberOffset;
        const barH = 14;
        const barY = centerY - barH / 2;

        // Bar BG
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(barStartX, barY, barW, barH);

        // Bar Fill
        const healthPercent = player.health / player.maxHealth;
        const healthColor = healthPercent > 0.4 ? '#4ade80' : '#f87171'; // Green to Red
        ctx.fillStyle = healthColor;
        ctx.fillRect(barStartX, barY, barW * healthPercent, barH);

        // Label
        ctx.font = '10px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText("HEALTH / HP", barStartX, barY - 8);

        // ==================
        // Column 2: Ammo
        // ==================
        const col2X = padding + colW + totalGap / 2;
        const weapon = WEAPONS[player.currentWeaponIndex];
        const ammoCurrent = player.ammo[player.currentWeaponIndex];

        // Large Number
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        const ammoStr = player.reloading ? '--' : ammoCurrent.toString();
        ctx.fillText(ammoStr, col2X, centerY);
        const ammoNumberOffset = ctx.measureText(ammoStr).width + 12;

        // Visual Bar
        const ammoBarStartX = col2X + ammoNumberOffset;
        const ammoBarW = colW - ammoNumberOffset;
        const ammoBarY = centerY - barH / 2;

        // Bar BG
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(ammoBarStartX, ammoBarY, ammoBarW, barH);

        // Bar Fill (Ammo in Mag)
        const ammoPercent = ammoCurrent / weapon.magazineSize;
        ctx.fillStyle = '#facc15'; // Yellow
        ctx.fillRect(ammoBarStartX, ammoBarY, ammoBarW * ammoPercent, barH);

        // Label / Weapon Name
        ctx.font = '10px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const weaponLabel = player.reloading ? `RELOADING ${weapon.name}...` : weapon.name;
        ctx.fillText(weaponLabel.toUpperCase(), ammoBarStartX, ammoBarY - 8);

        // ==================
        // Column 3: Jetpack Fuel
        // ==================
        const col3X = padding + (colW + totalGap / 2) * 2;
        const fuelPercent = player.fuel / player.maxFuel;
        const fuelVal = Math.ceil(fuelPercent * 100);

        // Large Number
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(fuelVal.toString(), col3X, centerY);
        const fuelNumberOffset = ctx.measureText(fuelVal.toString()).width + 12;

        // Visual Bar
        const fuelBarStartX = col3X + fuelNumberOffset;
        const fuelBarW = colW - fuelNumberOffset;
        const fuelBarY = centerY - barH / 2;

        // Bar BG
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(fuelBarStartX, fuelBarY, fuelBarW, barH);

        // Bar Fill
        ctx.fillStyle = '#38bdf8'; // Blue
        ctx.fillRect(fuelBarStartX, fuelBarY, fuelBarW * fuelPercent, barH);

        // Label
        ctx.font = '10px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText("JETPACK FUEL %", fuelBarStartX, fuelBarY - 8);

        // Grenades counter
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px "Inter", sans-serif';
        ctx.fillText(`GRENADES: ${player.grenadeCount}`, col3X, centerY + 24);

        // Slot indicators
        const slotXPos = screenW / 2 - 40;
        const slotYPos = hudY + 8;
        ctx.textAlign = 'center';
        ctx.fillStyle = player.activeSlot === 1 ? '#fff' : 'rgba(255,255,255,0.3)';
        ctx.fillText("[ 1 ]", slotXPos, slotYPos);
        ctx.fillStyle = player.activeSlot === 2 ? '#fff' : 'rgba(255,255,255,0.3)';
        ctx.fillText("[ 2 ]", slotXPos + 80, slotYPos);

        // Grenade Charge Bar
        if (player.isChargingGrenade) {
            const gBarW = 100;
            const gBarH = 3;
            const gx = screenW / 2 - gBarW / 2;
            const gy = slotYPos - 12;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(gx, gy, gBarW, gBarH);
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(gx, gy, gBarW * player.grenadeCharge, gBarH);
        }

        if (isMenuOpen) {
            this.renderWeaponMenu(ctx, player, input, screenW, screenH);
        }

        ctx.restore();
    }

    private renderWeaponMenu(ctx: CanvasRenderingContext2D, player: Player, input: IInput, screenW: number, screenH: number): void {
        const menuW = 400;
        const menuH = 480;
        const x = (screenW - menuW) / 2;
        const y = (screenH - menuH) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, menuW, menuH);
        ctx.strokeRect(x, y, menuW, menuH);

        ctx.fillStyle = '#fff';
        ctx.font = '900 24px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("ARMAMENTO (G)", x + menuW / 2, y + 40);

        ctx.font = '700 14px "Inter", sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText("PRIMÁRIAS", x + menuW / 2, y + 75);

        const itemH = 22;
        let currentY = y + 100;

        for (let i = 0; i < WEAPONS.length; i++) {
            const w = WEAPONS[i];
            const isHover = input.mouseX > x + 40 && input.mouseX < x + menuW - 40 &&
                input.mouseY > currentY - 15 && input.mouseY < currentY + 5;

            const isSelected = player.primaryWeaponIndex === i || player.secondaryWeaponIndex === i;

            if (w.type === 'primary') {
                ctx.fillStyle = isHover ? '#fff' : (isSelected ? '#facc15' : 'rgba(255,255,255,0.6)');
                ctx.font = isHover ? 'bold 15px "Inter", sans-serif' : '13px "Inter", sans-serif';
                ctx.textAlign = 'left';
                const keyHint = i < 9 ? `${i + 1}` : (i === 9 ? '0' : '');
                ctx.fillText(`${keyHint} ${w.name}`, x + 60, currentY);

                if (isHover && input.mouseLeftJustPressed) {
                    player.setWeaponToActiveSlot(i);
                }
                currentY += itemH;
            }
        }

        currentY += 15;
        ctx.font = '700 14px "Inter", sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.textAlign = 'center';
        ctx.fillText("SECUNDÁRIAS", x + menuW / 2, currentY);
        currentY += 25;

        for (let i = 0; i < WEAPONS.length; i++) {
            const w = WEAPONS[i];
            if (w.type === 'secondary') {
                const isHover = input.mouseX > x + 40 && input.mouseX < x + menuW - 40 &&
                    input.mouseY > currentY - 15 && input.mouseY < currentY + 5;
                const isSelected = player.primaryWeaponIndex === i || player.secondaryWeaponIndex === i;

                ctx.fillStyle = isHover ? '#fff' : (isSelected ? '#facc15' : 'rgba(255,255,255,0.6)');
                ctx.font = isHover ? 'bold 15px "Inter", sans-serif' : '13px "Inter", sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(w.name, x + 60, currentY);

                if (isHover && input.mouseLeftJustPressed) {
                    player.setWeaponToActiveSlot(i);
                }
                currentY += itemH;
            }
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = 'italic 11px "Inter", sans-serif';
        ctx.fillText("Clique para selecionar na vaga ativa", x + menuW / 2, y + menuH - 20);

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
