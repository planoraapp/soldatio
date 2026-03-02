import { Vector2 } from '../engine/Vector2';

/**
 * Procedural rendering of the Soldat "Gostek" — the soldier character.
 * Composed of head, torso, legs (with procedural walk cycle), and arms (with IK aiming).
 */
export class Gostek {
    /** Walking animation phase */
    walkPhase: number = 0;
    /** Direction the character faces: 1 = right, -1 = left */
    facingDir: number = 1;

    /** Body part colors */
    skinColor: string = '#e8b88a';
    shirtColor: string = '#4a7c4f';
    pantsColor: string = '#3d5c3e';
    bootColor: string = '#2a2a2a';
    headgearColor: string = '#4a7c4f';

    /**
     * Update animation state.
     * @param velocityX horizontal velocity
     * @param isGrounded whether player is on ground
     * @param mouseWorldX cursor world X
     * @param playerX player X position
     */
    update(velocityX: number, isGrounded: boolean, mouseWorldX: number, playerX: number): void {
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
        isRolling: boolean = false
    ): void {
        ctx.save();
        ctx.translate(pos.x, pos.y);

        // Apply rotation
        if (rotation !== 0) {
            ctx.rotate(rotation);
        }

        const dir = this.facingDir;
        // Ball up more if rolling
        const crouchOffset = isRolling ? 12 : (isCrouching ? 4 : 0);

        // ========== RELOAD BAR ==========
        if (reloadProgress > 0 && reloadProgress < 1) {
            this.renderReloadBar(ctx, crouchOffset, reloadProgress);
        }

        // ========== LEGS ==========
        this.renderLegs(ctx, dir, crouchOffset);

        // ========== TORSO ==========
        const torsoY = -14 + crouchOffset;
        ctx.fillStyle = this.shirtColor;
        ctx.beginPath();
        ctx.ellipse(0, torsoY, 6 * 1, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // ========== HEAD ==========
        const headY = torsoY - 10;
        // Helmet/beret
        ctx.fillStyle = this.headgearColor;
        ctx.beginPath();
        ctx.ellipse(dir * 1, headY - 2, 7, 5, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        // Head circle
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

            ctx.strokeStyle = this.pantsColor;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(hipX, hipY);
            ctx.lineTo(kneeX, kneeY);
            ctx.stroke();

            // Shin
            const footX = kneeX + Math.sin(kneeAngle + footAngle) * legLength * 0.5;
            const footY = kneeY + Math.cos(kneeAngle + footAngle) * legLength * 0.5;

            ctx.strokeStyle = this.pantsColor;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(kneeX, kneeY);
            ctx.lineTo(footX, footY);
            ctx.stroke();

            // Boot
            ctx.fillStyle = this.bootColor;
            ctx.beginPath();
            ctx.arc(footX, footY, 2.5, 0, Math.PI * 2);
            ctx.fill();
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

        // ========== WEAPON ==========
        this.renderWeapon(ctx, handX, handY, aimAngle, dir, weaponName);

        // Secondary arm (slightly behind, relaxed)
        const backArmAngle = localAim + 0.15;
        const backHandX = shoulderX + Math.cos(backArmAngle) * armLength * 0.85 * dir;
        const backHandY = shoulderY + Math.sin(backArmAngle) * armLength * 0.85;

        ctx.strokeStyle = this.skinColor;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(backHandX, backHandY);
        ctx.stroke();
        ctx.globalAlpha = 1;
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

        // Gun body
        ctx.fillStyle = color;
        ctx.fillRect(-2, -height / 2, length, height);

        // Handle/grip
        ctx.fillStyle = handleColor;
        ctx.fillRect(-1, height / 2, 4, 5);

        // Barrel tip
        ctx.fillStyle = '#333';
        ctx.fillRect(length - 4, -height / 2 - 0.5, 4, height + 1);

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
}
