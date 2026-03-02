import { Vector2 } from './Vector2';
import { Input } from './Input';
import { Player } from '../game/Player';

interface VirtualButton {
    id: string;
    x: number;
    y: number;
    radius: number;
    label: string;
    keyCode?: string;
    isMouseAction?: 'left' | 'right';
    active: boolean;
}

export class TouchControls {
    private joystickL = { base: new Vector2(100, 0), head: new Vector2(100, 0), active: false, pointerId: -1, dir: new Vector2(0, 0) };
    private joystickR = { base: new Vector2(0, 0), head: new Vector2(0, 0), active: false, pointerId: -1, dir: new Vector2(0, 0) };

    private buttons: VirtualButton[] = [];
    private isTouchDevice = false;

    constructor(canvas: HTMLCanvasElement) {
        this.updateResize();
        this.initButtons();

        // Auto-detect mobile based on screen size or touch
        if (window.innerWidth < 1024 || 'ontouchstart' in window) {
            this.isTouchDevice = true;
        }

        window.addEventListener('resize', () => {
            this.updateResize();
            this.initButtons();
        });

        canvas.addEventListener('touchstart', (e) => this.handleTouch(e, true), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleTouch(e, false), { passive: false });
    }

    private updateResize() {
        const h = window.innerHeight;
        const w = window.innerWidth;
        this.joystickL.base = new Vector2(120, h - 120);
        this.joystickR.base = new Vector2(w - 120, h - 120);
    }

    private initButtons() {
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        this.buttons = [
            { id: 'jetpack', x: screenW - 80, y: screenH - 260, radius: 45, label: 'JET', isMouseAction: 'right', active: false },
            { id: 'grenade', x: screenW - 220, y: screenH - 120, radius: 45, label: 'BOMB', keyCode: 'KeyF', active: false },
            { id: 'weapon', x: screenW / 2, y: 50, radius: 35, label: 'MENU', keyCode: 'KeyG', active: false },
            { id: 'cycle', x: screenW - 100, y: screenH - 400, radius: 35, label: '1/2', active: false },
        ];
    }

    private handleTouch(e: TouchEvent, start: boolean) {
        this.isTouchDevice = true;
        // e.preventDefault(); // Might break some browsers if not careful

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const touchPos = new Vector2(t.clientX, t.clientY);

            if (start) {
                // Check buttons first
                let hitButton = false;
                for (const b of this.buttons) {
                    if (touchPos.distance(new Vector2(b.x, b.y)) < b.radius) {
                        b.active = true;
                        hitButton = true;
                        break;
                    }
                }
                if (hitButton) continue;

                // Check joysticks
                if (touchPos.x < window.innerWidth / 2 && !this.joystickL.active) {
                    this.joystickL.active = true;
                    this.joystickL.pointerId = t.identifier;
                    this.joystickL.base = touchPos.clone();
                    this.joystickL.head = touchPos.clone();
                } else if (touchPos.x >= window.innerWidth / 2 && !this.joystickR.active) {
                    this.joystickR.active = true;
                    this.joystickR.pointerId = t.identifier;
                    this.joystickR.base = touchPos.clone();
                    this.joystickR.head = touchPos.clone();
                }
            } else {
                // Release
                if (t.identifier === this.joystickL.pointerId) {
                    this.joystickL.active = false;
                    this.joystickL.pointerId = -1;
                    this.joystickL.dir = Vector2.zero();
                } else if (t.identifier === this.joystickR.pointerId) {
                    this.joystickR.active = false;
                    this.joystickR.pointerId = -1;
                    this.joystickR.dir = Vector2.zero();
                }

                // Buttons release
                for (const b of this.buttons) {
                    if (touchPos.distance(new Vector2(b.x, b.y)) < b.radius + 20) {
                        b.active = false;
                    }
                }
            }
        }
    }

    private handleTouchMove(e: TouchEvent) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const touchPos = new Vector2(t.clientX, t.clientY);

            if (t.identifier === this.joystickL.pointerId) {
                const delta = touchPos.sub(this.joystickL.base);
                const dist = Math.min(delta.length(), 50);
                this.joystickL.dir = delta.normalize();
                this.joystickL.head = this.joystickL.base.add(this.joystickL.dir.scale(dist));
            } else if (t.identifier === this.joystickR.pointerId) {
                const delta = touchPos.sub(this.joystickR.base);
                const dist = Math.min(delta.length(), 50);
                this.joystickR.dir = delta.normalize();
                this.joystickR.head = this.joystickR.base.add(this.joystickR.dir.scale(dist));
            }
        }
    }

    update(input: Input, player: Player, players: Player[]) {
        if (!this.isTouchDevice) return;

        // Cycle weapons logic
        const cycleBtn = this.buttons.find(b => b.id === 'cycle');
        if (cycleBtn?.active) {
            // Simulate a 'Digit1' or 'Digit2' press based on current slot
            const targetKey = player.activeSlot === 1 ? 'Digit2' : 'Digit1';
            input.setKeyDown(targetKey, true);
        } else {
            input.setKeyDown('Digit1', false);
            input.setKeyDown('Digit2', false);
        }

        // LEFT JOYSTICK -> MOVEMENT
        const lDir = this.joystickL.dir;
        const lMag = this.joystickL.active ? this.joystickL.head.distance(this.joystickL.base) / 50 : 0;

        input.setKeyDown('KeyA', lMag > 0.3 && lDir.x < -0.3);
        input.setKeyDown('KeyD', lMag > 0.3 && lDir.x > 0.3);

        // Jump/Backflip threshold
        input.setKeyDown('KeyW', lMag > 0.5 && lDir.y < -0.7);
        input.setKeyDown('KeyS', lMag > 0.5 && lDir.y > 0.7);

        // RIGHT JOYSTICK -> AIM & AUTOFIRE
        if (this.joystickR.active) {
            const rDir = this.joystickR.dir;
            const rMag = this.joystickR.head.distance(this.joystickR.base) / 50;

            const playerScreenX = window.innerWidth / 2;
            const playerScreenY = window.innerHeight / 2;

            let targetX = playerScreenX + rDir.x * 250;
            let targetY = playerScreenY + rDir.y * 250;

            // --- MAGNET AIM ASSIST ---
            let closestEnemy: Player | null = null;
            let maxDot = 0.85; // Acceptance cone (~30 deg)

            for (const p of players) {
                if (p === player || p.isDead) continue;

                const toEnemy = p.pos.sub(player.pos).normalize();
                const dot = rDir.dot(toEnemy);

                if (dot > maxDot) {
                    const distSq = p.pos.distanceSq(player.pos);
                    if (distSq < 600 * 600) { // Max range for assist
                        maxDot = dot;
                        closestEnemy = p;
                    }
                }
            }

            if (closestEnemy) {
                // Smoothly pull toward enemy (50% attraction)
                const enemyDir = closestEnemy.pos.sub(player.pos).normalize();
                targetX = playerScreenX + (rDir.x * 0.5 + enemyDir.x * 0.5) * 250;
                targetY = playerScreenY + (rDir.y * 0.5 + enemyDir.y * 0.5) * 250;
            }

            input.mouseX = targetX;
            input.mouseY = targetY;

            // Auto-fire
            input.mouseLeft = rMag > 0.35;
        } else {
            input.mouseLeft = false;
        }

        // BUTTONS
        for (const b of this.buttons) {
            if (b.keyCode) {
                input.setKeyDown(b.keyCode, b.active);
            }
            if (b.isMouseAction === 'right') {
                input.mouseRight = b.active;
            }
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.isTouchDevice) return;

        ctx.save();
        ctx.globalAlpha = 0.4;

        // Render Left Joystick (Fixed base to identify region)
        ctx.beginPath();
        ctx.arc(this.joystickL.base.x, this.joystickL.base.y, 50, 0, Math.PI * 2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (this.joystickL.active) {
            ctx.beginPath();
            ctx.arc(this.joystickL.head.x, this.joystickL.head.y, 25, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
        } else {
            // Faint ring for the stick
            ctx.beginPath();
            ctx.arc(this.joystickL.base.x, this.joystickL.base.y, 20, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.stroke();
        }

        // Render Right Joystick (Only if active, or fixed depending on preference)
        if (this.joystickR.active) {
            ctx.beginPath();
            ctx.arc(this.joystickR.base.x, this.joystickR.base.y, 50, 0, Math.PI * 2);
            ctx.strokeStyle = 'white';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(this.joystickR.head.x, this.joystickR.head.y, 25, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
        } else {
            // Faint region for right joystick
            ctx.beginPath();
            ctx.arc(this.joystickR.base.x, this.joystickR.base.y, 50, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.stroke();
        }

        // Render Buttons
        for (const b of this.buttons) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = b.active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.stroke();

            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(b.label, b.x, b.y + 5);
        }

        ctx.restore();
    }
}
