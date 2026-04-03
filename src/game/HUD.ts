import { Player } from './Player';
import { WEAPONS } from './Weapon';
import { IInput } from '../engine/IInput';
import { Vector2 } from '../engine/Vector2';
import { getImage } from '../engine/SpriteSheet';
import { AudioManager } from '../engine/AudioManager';
import { GameModeManager, GameModeType } from './GameMode';
import { Team } from './Player';

/**
 * TapTap Style HUD — Cartoonish, bold, high contrast.
 */
export class HUD {
    private isGMenuOpen: boolean = false;
    private isEscMenuOpen: boolean = false;
    private isMuted: boolean = false;

    render(ctx: CanvasRenderingContext2D, player: Player, input: IInput, screenW: number, screenH: number, audio: AudioManager, gameMode: GameModeManager): void {
        // Toggle Logic
        if (input.isKeyJustPressed('KeyG')) {
            this.isGMenuOpen = !this.isGMenuOpen;
            if (this.isGMenuOpen) this.isEscMenuOpen = false;
        }

        if (input.isKeyJustPressed('Escape')) {
            this.isEscMenuOpen = !this.isEscMenuOpen;
            if (this.isEscMenuOpen) this.isGMenuOpen = false;
        }

        if (gameMode && gameMode.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0,0,screenW, screenH);
            ctx.fillStyle = gameMode.winner === Team.ALPHA ? '#3498db' : '#e74c3c';
            ctx.font = '80px "Luckiest Guy", cursive';
            ctx.textAlign = 'center';
            ctx.fillText(gameMode.winner === Team.ALPHA ? 'ALFA VENCEU!' : 'BRAVO VENCEU!', screenW/2, screenH/2);
            return;
        }

        if (player.isDead) {
            this.isGMenuOpen = false;
            this.isEscMenuOpen = false;
            this.renderDeathScreen(ctx, player, screenW, screenH);
            return;
        }

        ctx.save();

        // HP PILL (Bottom Left)
        this.renderPill(ctx, 40, screenH - 80, 220, 50, '#ff4757', '#8b1e2e', 'HP', Math.ceil(player.health), player.health / player.maxHealth);

        // AMMO PILL (Bottom Center)
        const weapon = WEAPONS[player.currentWeaponIndex];
        const ammoCurrent = player.ammo[player.currentWeaponIndex];
        
        let ammoDisplay = ammoCurrent.toString();
        let ammoPercent = ammoCurrent / weapon.magazineSize;
        let ammoLabel = weapon.name.toUpperCase();

        if (player.reloading) {
            const totalFrames = Math.round(weapon.reloadTime / 16.67);
            ammoPercent = 1 - (player.reloadTimer / totalFrames);
            ammoDisplay = "RELOAD";
            ammoLabel = "RELOADING...";
        }

        this.renderPill(ctx, screenW / 2 - 110, screenH - 80, 220, 50, '#ffa502', '#cc8400', ammoLabel, ammoDisplay, ammoPercent);

        // Active Weapon Icon (Near Ammo)
        const weaponIcon = getImage(this.getWeaponIconPath(weapon.name));
        if (weaponIcon) {
            ctx.save();
            ctx.filter = 'drop-shadow(0px 4px 4px rgba(0,0,0,0.5))';
            ctx.drawImage(weaponIcon, screenW / 2 - 30, screenH - 125, 60, 30);
            ctx.restore();
        }

        // FUEL PILL (Bottom Right)
        this.renderPill(ctx, screenW - 260, screenH - 80, 220, 50, '#2ed573', '#1b8d4e', 'JETPACK', Math.ceil((player.fuel / player.maxFuel) * 100), player.fuel / player.maxFuel);

        // Grenades (Small pills above Fuel)
        for(let i=0; i<player.grenadeCount; i++) {
            this.drawCircle(ctx, screenW - 60 - (i * 25), screenH - 110, 10, '#1e90ff', '#005a9e');
        }

        if (this.isGMenuOpen) {
            this.renderWeaponMenu(ctx, player, input, screenW, screenH);
        }

        if (this.isEscMenuOpen) {
            this.renderEscMenu(ctx, screenW, screenH, input, audio);
        }

        ctx.restore();
    }

    private renderPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, shadowColor: string, label: string, value: string | number, percent: number): void {
        ctx.save();
        ctx.translate(x, y);
        ctx.transform(1, 0, -0.15, 1, 0, 0); // Skew

        // Shadow/3D Base
        ctx.fillStyle = shadowColor;
        this.drawRoundRect(ctx, 0, 4, w, h, h/2);
        
        // Main Body
        ctx.fillStyle = '#2f3542';
        this.drawRoundRect(ctx, 0, 0, w, h, h/2);

        // Progress Bar inside
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        this.drawRoundRect(ctx, 6, 6, w - 12, h - 12, (h-12)/2);
        
        ctx.fillStyle = color;
        this.drawRoundRect(ctx, 6, 6, (w - 12) * percent, h - 12, (h-12)/2);

        // Value Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px "Luckiest Guy", cursive';
        ctx.textAlign = 'center';
        ctx.fillText(value.toString(), w / 2, h / 2 + 8);

        // Label Text
        ctx.fillStyle = '#fff';
        ctx.font = '900 10px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, 15, -8);

        ctx.restore();
    }

    private renderWeaponMenu(ctx: CanvasRenderingContext2D, player: Player, input: IInput, screenW: number, screenH: number): void {
        const menuW = 750;
        const menuH = 480;
        const x = (screenW - menuW) / 2;
        const y = (screenH - menuH) / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        this.drawRoundRect(ctx, x, y, menuW, menuH, 30);
        ctx.strokeStyle = '#ffa502';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '65px "Luckiest Guy", cursive';
        ctx.textAlign = 'center';
        ctx.transform(1, 0, -0.1, 1, 0, 0);
        ctx.fillText("ESCOLHA SEU ARSENAL", x + menuW / 2 + 30, y + 65);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const colW = menuW / 2;
        const itemH = 34;

        // LEFT COLUMN: PRIMARIES
        let leftY = y + 130;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = 'bold 12px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText("ARMAS PRIMÁRIAS", x + 40, leftY - 20);

        WEAPONS.forEach((w, i) => {
            if (w.type === 'primary') {
                const itemX = x + 40;
                const isHover = input.mouseX > itemX && input.mouseX < x + colW - 10 && 
                              input.mouseY > leftY - 20 && input.mouseY < leftY + 12;
                const isSelected = player.primaryWeaponIndex === i || player.secondaryWeaponIndex === i;

                ctx.fillStyle = isHover ? '#fff' : (isSelected ? '#ffa502' : 'rgba(255,255,255,0.4)');
                ctx.font = isHover ? 'bold 18px "Luckiest Guy", cursive' : '15px "Luckiest Guy", cursive';
                ctx.textAlign = 'left';
                ctx.fillText(`${i + 1}  ${w.name.toUpperCase()}`, itemX, leftY);

                const icon = getImage(this.getWeaponIconPath(w.name));
                if (icon) ctx.drawImage(icon, x + colW - 100, leftY - 20, 60, 30);

                if (isHover && input.mouseLeftJustPressed) {
                    player.setWeaponToActiveSlot(i);
                    this.isGMenuOpen = false;
                }
                leftY += itemH;
            }
        });

        // RIGHT COLUMN: SECONDARIES
        let rightY = y + 130;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = 'bold 12px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText("ARMAS SECUNDÁRIAS", x + colW + 40, rightY - 20);

        WEAPONS.forEach((w, i) => {
            if (w.type === 'secondary') {
                const itemX = x + colW + 40;
                const isHover = input.mouseX > itemX && input.mouseX < x + menuW - 10 && 
                              input.mouseY > rightY - 20 && input.mouseY < rightY + 12;
                const isSelected = player.primaryWeaponIndex === i || player.secondaryWeaponIndex === i;

                ctx.fillStyle = isHover ? '#fff' : (isSelected ? '#ffa502' : 'rgba(255,255,255,0.4)');
                ctx.font = isHover ? 'bold 18px "Luckiest Guy", cursive' : '15px "Luckiest Guy", cursive';
                ctx.textAlign = 'left';
                ctx.fillText(w.name.toUpperCase(), itemX, rightY);

                const icon = getImage(this.getWeaponIconPath(w.name));
                if (icon) ctx.drawImage(icon, x + menuW - 100, rightY - 18, 40, 20);

                if (isHover && input.mouseLeftJustPressed) {
                    player.setWeaponToActiveSlot(i);
                    this.isGMenuOpen = false;
                }
                rightY += itemH;
            }
        });

        ctx.restore();
    }

    private renderEscMenu(ctx: CanvasRenderingContext2D, screenW: number, screenH: number, input: IInput, audio: AudioManager): void {
        const x = screenW / 2 - 200;
        const y = screenH / 2 - 250;
        const w = 400;
        const h = 500;

        ctx.save();
        ctx.fillStyle = '#2f3542';
        this.drawRoundRect(ctx, x, y, w, h, 30);
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '60px "Luckiest Guy", cursive';
        ctx.textAlign = 'center';
        ctx.transform(1, 0, -0.1, 1, 0, 0);
        ctx.fillText("PAUSA", x + w / 2 + 25, y + 80);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Buttons
        this.renderTapButton(ctx, x + 50, y + 150, 300, 50, 'CONTINUAR', '#2ed573', () => this.isEscMenuOpen = false, input);
        this.renderTapButton(ctx, x + 50, y + 220, 300, 50, this.isMuted ? 'SOM: OFF' : 'SOM: ON', '#ffa502', () => {
            this.isMuted = !this.isMuted;
            audio.setMute(this.isMuted);
        }, input);
        this.renderTapButton(ctx, x + 50, y + 290, 300, 50, 'SAIR', '#ff4757', () => window.location.reload(), input);

        ctx.restore();
    }

    private renderTapButton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, color: string, onClick: () => void, input: IInput): void {
        const isHover = input.mouseX > x && input.mouseX < x + w && input.mouseY > y && input.mouseY < y + h;
        const shadow = '#00000044';

        ctx.save();
        ctx.transform(1, 0, -0.1, 1, x, y);
        
        ctx.fillStyle = shadow;
        this.drawRoundRect(ctx, 4, 6, w, h, 15);
        ctx.fillStyle = isHover ? '#fff' : color;
        this.drawRoundRect(ctx, 0, 0, w, h, 15);
        
        ctx.fillStyle = isHover ? color : '#fff';
        ctx.font = 'bold 20px "Luckiest Guy", cursive';
        ctx.textAlign = 'center';
        ctx.fillText(text, w / 2, h / 2 + 7);

        if (isHover && input.mouseLeftJustPressed) onClick();
        ctx.restore();
    }

    private drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.fill();
    }

    private drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, shadow: string) {
        ctx.fillStyle = shadow;
        ctx.beginPath(); ctx.arc(x, y + 3, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
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

    private getWeaponIconPath(name: string): string {
        const weaponPaths: Record<string, string> = {
            'Desert Eagles': '/assets/weapons/deserteagle.png', 'HK MP5': '/assets/weapons/hkmp5.png', 'Ak-74': '/assets/weapons/ak47.png',
            'Steyr AUG': '/assets/weapons/steyraug.png', 'Spas-12': '/assets/weapons/spas12.png', 'Ruger 77': '/assets/weapons/rugger77.png',
            'M79': '/assets/weapons/m79.png', 'Barrett M82A1': '/assets/weapons/barret.png', 'FN Minimi': '/assets/weapons/fnminimi.png',
            'XM214 Minigun': '/assets/weapons/minigun.png', 'M72 LAW': '/assets/weapons/m72law.png', 'Chainsaw': '/assets/weapons/chainsaw.png',
            'Combat Knife': '/assets/weapons/knife.png', 'USSOCOM': '/assets/weapons/ussocom.png'
        };
        return weaponPaths[name] || '/assets/weapons/guns.png';
    }

    private renderDeathScreen(ctx: CanvasRenderingContext2D, player: Player, screenW: number, screenH: number): void {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fillRect(0, 0, screenW, screenH);
        ctx.fillStyle = '#fff';
        ctx.font = '120px "Luckiest Guy", cursive';
        ctx.textAlign = 'center';
        ctx.fillText("DERROTADO!", screenW / 2, screenH / 2);
    }

    renderScoreboard(ctx: CanvasRenderingContext2D, player: Player, bots: Player[], gameMode: GameModeManager, screenW: number, screenH: number): void {
        const w = 700;
        const h = 500;
        const x = (screenW - w) / 2;
        const y = (screenH - h) / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        this.drawRoundRect(ctx, x, y, w, h, 20);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '40px "Luckiest Guy", cursive';
        ctx.textAlign = 'center';
        ctx.fillText(gameMode.mode === GameModeType.CTF ? 'CAPTURE A BANDEIRA' : 'TEAM DEATHMATCH', x + w / 2, y + 50);

        ctx.font = '24px "Luckiest Guy", cursive';
        const scoreText = `ALFA: ${gameMode.scoreAlpha} / ${gameMode.maxScore}  -  BRAVO: ${gameMode.scoreBravo} / ${gameMode.maxScore}`;
        ctx.fillText(scoreText, x + w / 2, y + 90);

        const allPlayers = [player, ...bots];
        const alpha = allPlayers.filter(p => p.team === Team.ALPHA).sort((a,b) => b.score - a.score);
        const bravo = allPlayers.filter(p => p.team === Team.BRAVO).sort((a,b) => b.score - a.score);

        const drawList = (list: Player[], startX: number, startY: number, title: string, color: string) => {
            ctx.fillStyle = color;
            ctx.font = '28px "Luckiest Guy", cursive';
            ctx.textAlign = 'left';
            ctx.fillText(title, startX, startY);

            ctx.font = 'bold 14px "Inter", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText("NOME", startX, startY + 30);
            ctx.fillText("K - D", startX + 180, startY + 30);
            ctx.fillText("PTS", startX + 260, startY + 30);

            let curY = startY + 60;
            list.forEach(p => {
                ctx.fillStyle = p.id === player.id ? '#ffa502' : '#fff';
                ctx.font = 'bold 16px "Inter", sans-serif';
                ctx.fillText(p.name, startX, curY);
                ctx.fillText(`${p.kills} - ${p.deaths}`, startX + 180, curY);
                ctx.fillText(`${p.score}`, startX + 260, curY);
                curY += 30;
            });
        };

        drawList(alpha, x + 40, y + 150, 'EQUIPE ALFA', '#3498db');
        drawList(bravo, x + 380, y + 150, 'EQUIPE BRAVO', '#e74c3c');

        ctx.restore();
    }
}
