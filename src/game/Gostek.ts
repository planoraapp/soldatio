import { Vector2 } from '../engine/Vector2';
import { PLAYER_ANIMATIONS, drawSprite, SpriteDef } from '../engine/SpriteSheet';

/**
 * Procedural rendering of the Soldat "Gostek" — the soldier character.
 * Composed of head, torso, legs (with procedural walk cycle), and arms (with IK aiming).
 */
export class Gostek {
    /** Walking animation phase */
    walkPhase: number = 0;
    impactTimer: number = 0;
    /** Direction the character faces: 1 = right, -1 = left */
    facingDir: number = 1;
    /** Whether character is on ground */
    isGrounded: boolean = true;

    /** Body part colors (for procedural backup) */
    skinColor: string = '#e8b88a';
    shirtColor: string = '#4a7c4f';
    pantsColor: string = '#3d5c3e';
    bootColor: string = '#2a2a2a';
    headgearColor: string = '#4a7c4f';

    /** Custom sprites for parts (procedural bits) */
    customSprites: Record<string, string> = {};

    /** New animated sprites toggle */
    useNewSprites: boolean = true;

    /**
     * Update animation state.
     * @param velocityX horizontal velocity
     * @param isGrounded whether player is on ground
     * @param mouseWorldX cursor world X
     * @param playerX player X position
     */
    update(velocityX: number, isGrounded: boolean, mouseWorldX: number, playerX: number): void {
        this.isGrounded = isGrounded;
        if (this.impactTimer > 0) this.impactTimer--;
        
        // Face toward the mouse
        this.facingDir = mouseWorldX > playerX ? 1 : -1;

        // Advance walk animation based on horizontal speed
        if (isGrounded && Math.abs(velocityX) > 0.5) {
            this.walkPhase += Math.abs(velocityX) * 0.08;
        } else if (!isGrounded) {
            // Air pedaling - slow rotation
            this.walkPhase += 0.05;
        }
    }

    /**
     * Render the gostek at a position with an aim angle.
     */
    render(
        ctx: CanvasRenderingContext2D,
        pos: Vector2,
        aimAngle: number,
        isCrouching: boolean,
        weaponName: string,
        reloadProgress: number = 0, // 0 to 1
        rotation: number = 0,
        isRolling: boolean = false,
        velocityX: number = 0 // Lean animation
    ): void {
        const dir = this.facingDir;
        const crouchOffset = isRolling ? 12 : (isCrouching ? 4 : 0);

        if (this.useNewSprites) {
            this.renderSpriteBased(ctx, pos, aimAngle, dir, isRolling, this.isGrounded, velocityX, crouchOffset, weaponName, rotation); 
            if (reloadProgress > 0 && reloadProgress < 1) {
                this.renderReloadBar(ctx, crouchOffset, reloadProgress);
            }
            return;
        }

        ctx.save();
        ctx.translate(pos.x, pos.y);

        // Lean toward running direction; skip lean during roll/backflip (rotation dominates)
        const leanAngle = isRolling ? 0 : velocityX * 0.035;
        ctx.rotate(rotation + leanAngle);
        
        // ========== RELOAD BAR ==========
        if (reloadProgress > 0 && reloadProgress < 1) {
            this.renderReloadBar(ctx, crouchOffset, reloadProgress);
        }

        // ========== LEGS ==========
        this.renderLegs(ctx, dir, crouchOffset);

        // ========== TORSO ==========
        const torsoY = -14 + crouchOffset;
        if (this.customSprites['torso']) {
            this.renderCustomPart(ctx, 'torso', 0, torsoY, 12, 16, 0);
        } else {
            ctx.fillStyle = this.shirtColor;
            ctx.beginPath();
            ctx.ellipse(0, torsoY, 6 * 1, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // ========== HEAD ==========
        const headY = torsoY - 10;
        // Helmet/beret
        if (this.customSprites['headgear']) {
            this.renderCustomPart(ctx, 'headgear', dir * 1, headY - 2, 14, 10, 0);
        } else {
            ctx.fillStyle = this.headgearColor;
            ctx.beginPath();
            ctx.ellipse(dir * 1, headY - 2, 7, 5, 0, Math.PI, Math.PI * 2);
            ctx.fill();
        }

        // Head circle
        if (this.customSprites['head']) {
            this.renderCustomPart(ctx, 'head', 0, headY, 10, 10, 0);
        } else {
            ctx.fillStyle = this.skinColor;
            ctx.beginPath();
            ctx.arc(0, headY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Eye
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(dir * 2.5, headY - 1, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // ========== ARMS & WEAPON ==========
        if (!isRolling) {
            this.renderArms(ctx, aimAngle, dir, torsoY, weaponName);
        } else {
            // Draw a pulsing border and a ball-like torso
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.3;
            ctx.beginPath();
            ctx.arc(0, torsoY + 4, 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Optional: draw legs tucked in
            ctx.fillStyle = this.pantsColor;
            ctx.beginPath();
            ctx.arc(-4 * dir, torsoY + 8, 4, 0, Math.PI * 2);
            ctx.arc(4 * dir, torsoY + 8, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    private renderLegs(ctx: CanvasRenderingContext2D, dir: number, crouchOffset: number): void {
        const legLength = 10 - crouchOffset * 0.5;
        const hipY = -6 + crouchOffset;

        for (let leg = 0; leg < 2; leg++) {
            const phase = this.walkPhase + leg * Math.PI;
            const kneeAngle = Math.sin(phase) * 0.6;
            const footAngle = Math.cos(phase) * 0.4;

            const hipX = (leg === 0 ? -2 : 2) * dir;

            // Thigh
            const kneeX = hipX + Math.sin(kneeAngle) * legLength * 0.55;
            const kneeY = hipY + Math.cos(kneeAngle) * legLength * 0.55;

            if (this.customSprites['leg']) {
                this.renderCustomPart(ctx, 'leg', (hipX + kneeX) / 2, (hipY + kneeY) / 2, 4, legLength * 0.55, kneeAngle);
            } else {
                ctx.strokeStyle = this.pantsColor;
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(hipX, hipY);
                ctx.lineTo(kneeX, kneeY);
                ctx.stroke();
            }

            // Shin
            const footX = kneeX + Math.sin(kneeAngle + footAngle) * legLength * 0.5;
            const footY = kneeY + Math.cos(kneeAngle + footAngle) * legLength * 0.5;

            if (this.customSprites['leg']) {
                this.renderCustomPart(ctx, 'leg', (kneeX + footX) / 2, (kneeY + footY) / 2, 3.5, legLength * 0.5, kneeAngle + footAngle);
            } else {
                ctx.strokeStyle = this.pantsColor;
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.moveTo(kneeX, kneeY);
                ctx.lineTo(footX, footY);
                ctx.stroke();
            }

            // Boot
            if (this.customSprites['boot']) {
                this.renderCustomPart(ctx, 'boot', footX, footY, 6, 6, 0);
            } else {
                ctx.fillStyle = this.bootColor;
                ctx.beginPath();
                ctx.arc(footX, footY, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    private renderArms(
        ctx: CanvasRenderingContext2D,
        aimAngle: number,
        dir: number,
        torsoY: number,
        weaponName: string
    ): void {
        const shoulderX = 0;
        const shoulderY = torsoY + 2;

        // Adjust aim angle for facing direction
        let localAim = aimAngle;
        if (dir < 0) {
            localAim = Math.PI - aimAngle;
        }

        const armLength = 12;

        // Primary arm (holds weapon) — points at aim angle
        const elbowAngle = localAim + 0.3;
        const elbowX = shoulderX + Math.cos(elbowAngle) * armLength * 0.5 * dir;
        const elbowY = shoulderY + Math.sin(elbowAngle) * armLength * 0.5;

        const handX = shoulderX + Math.cos(localAim) * armLength * dir;
        const handY = shoulderY + Math.sin(localAim) * armLength;

        // Arm segments
        if (this.customSprites['arm']) {
            this.renderCustomPart(ctx, 'arm', (shoulderX + elbowX) / 2, (shoulderY + elbowY) / 2, 4, armLength * 0.5, elbowAngle - Math.PI / 2);
            this.renderCustomPart(ctx, 'arm', (elbowX + handX) / 2, (elbowY + handY) / 2, 4, armLength * 0.5, localAim - Math.PI / 2);
        } else {
            ctx.strokeStyle = this.skinColor;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            // Upper arm
            ctx.beginPath();
            ctx.moveTo(shoulderX, shoulderY);
            ctx.lineTo(elbowX, elbowY);
            ctx.stroke();
            // Forearm
            ctx.beginPath();
            ctx.moveTo(elbowX, elbowY);
            ctx.lineTo(handX, handY);
            ctx.stroke();
        }

        // ========== WEAPON ==========
        this.renderWeapon(ctx, handX, handY, aimAngle, dir, weaponName);

        // Secondary arm (slightly behind, relaxed)
        const backArmAngle = localAim + 0.15;
        const backHandX = shoulderX + Math.cos(backArmAngle) * armLength * 0.85 * dir;
        const backHandY = shoulderY + Math.sin(backArmAngle) * armLength * 0.85;

        if (this.customSprites['arm']) {
            this.renderCustomPart(ctx, 'arm', (shoulderX + backHandX) / 2, (shoulderY + backHandY) / 2, 3, armLength * 0.85, backArmAngle - Math.PI / 2);
        } else {
            ctx.strokeStyle = this.skinColor;
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(shoulderX, shoulderY);
            ctx.lineTo(backHandX, backHandY);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    private renderWeapon(
        ctx: CanvasRenderingContext2D,
        handX: number,
        handY: number,
        aimAngle: number,
        dir: number,
        weaponName: string
    ): void {
        ctx.save();
        ctx.translate(handX, handY);
        ctx.rotate(aimAngle);
        if (dir < 0) {
            ctx.scale(1, -1);
        }

        // Weapon body
        let length = 18;
        let height = 3;
        let color = '#555';
        let handleColor = '#3a3a3a';

        if (weaponName.includes('Barrett')) {
            length = 30;
            height = 3.5;
            color = '#4a4a4a';
        } else if (weaponName.includes('SPAS')) {
            length = 22;
            height = 4;
            color = '#3a3a3a';
        } else if (weaponName.includes('MP5')) {
            length = 16;
            height = 3;
            color = '#444';
        } else if (weaponName.includes('AK')) {
            length = 22;
            height = 3;
            color = '#5a4a3a';
        }

        // Weapon body
        const custom = this.customSprites[`weapon_${weaponName}`];
        if (custom) {
            this.renderCustomPart(ctx, `weapon_${weaponName}`, length / 2, 0, length + 4, height + 8, 0);
        } else {
            // Gun body
            ctx.fillStyle = color;
            ctx.fillRect(-2, -height / 2, length, height);

            // Handle/grip
            ctx.fillStyle = handleColor;
            ctx.fillRect(-1, height / 2, 4, 5);

            // Barrel tip
            ctx.fillStyle = '#333';
            ctx.fillRect(length - 4, -height / 2 - 0.5, 4, height + 1);
        }

        ctx.restore();
    }

    private renderReloadBar(ctx: CanvasRenderingContext2D, crouchOffset: number, progress: number): void {
        const barWidth = 20;
        const barHeight = 3;
        const x = -barWidth / 2;
        const y = -35 + crouchOffset;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Progress
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, barWidth * progress, barHeight);

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }

    private _imgCache: Record<string, HTMLImageElement> = {};
    private renderCustomPart(ctx: CanvasRenderingContext2D, part: string, x: number, y: number, w: number, h: number, angle: number): void {
        const dataUrl = this.customSprites[part];
        if (!dataUrl) return;

        if (!this._imgCache[dataUrl]) {
            const img = new Image();
            img.src = dataUrl;
            this._imgCache[dataUrl] = img;
        }

        const img = this._imgCache[dataUrl];
        if (!img.complete) return;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
    }

    /** New: Animated Sprite Rendering Logic */
    private renderSpriteBased(
        ctx: CanvasRenderingContext2D,
        pos: Vector2,
        aimAngle: number,
        dir: number,
        isRolling: boolean,
        isGrounded: boolean, // We use a better grounded check here
        velocityX: number,
        crouchOffset: number,
        weaponName: string,
        rotation: number
    ): void {
        // Choose animation sequence
        let seq: SpriteDef[] = PLAYER_ANIMATIONS.idle;
        let frameRate = 0.1;

        if (isRolling) {
            seq = PLAYER_ANIMATIONS.somersault;
            frameRate = 0.2;
        } else if (!isGrounded) {
            seq = PLAYER_ANIMATIONS.jump;
            frameRate = 0.05;
        } else if (Math.abs(velocityX) > 0.5) {
            seq = PLAYER_ANIMATIONS.run;
            frameRate = Math.abs(velocityX) * 0.08;
        }

        const frameIndex = Math.floor(this.walkPhase) % seq.length;
        const sprite = seq[frameIndex];

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(rotation);

        // Character scale (from 32x32px source to game units)
        // Adjust vertically to feet position
        const drawSize = 32;
        const drawX = -drawSize / 2;
        const drawY = -drawSize + 2; // Offset slightly up to match feet

        drawSprite(ctx, sprite, drawX, drawY, drawSize, drawSize, dir < 0);

        // Weapon Overlay - find hand position based on current frame and direction
        // In a perfect world, we'd have a map of hand positions for each frame.
        // For now, we estimate based on the sprite middle-right.
        if (!isRolling) {
            const handX = 2 * dir;
            const handY = -12 + crouchOffset;
            this.renderWeapon(ctx, handX, handY, aimAngle, dir, weaponName);
        }

        ctx.restore();
    }
}
