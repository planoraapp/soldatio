import { Vector2 } from '../engine/Vector2';
import { Player } from './Player';
import { drawAsset, PALETTE, shade } from './Assets';

const PICKUP_RADIUS = 34;
const CAPTURE_RADIUS = 70;
const AUTO_RETURN_FRAMES = 60 * 20; // bandeira caída volta sozinha em 20s

export interface FlagState {
    team: number;               // 1 = azul, 2 = vermelho
    basePos: Vector2;
    pos: Vector2;
    carrier: Player | null;
    atBase: boolean;
    returnTimer: number;        // frames até retorno automático quando caída
}

/**
 * Gerenciador do modo Capture the Flag.
 * Regras: pegue a bandeira inimiga e toque sua base com a SUA bandeira em casa.
 * Primeira equipe a capturar `targetScore` vence.
 */
export class CTFManager {
    flags: FlagState[];
    scores: Record<number, number> = { 1: 0, 2: 0 };
    targetScore: number;
    winner: number = 0;
    /** Eventos do último frame, para HUD/áudio: 'pickup' | 'capture' | 'return' | 'drop' */
    events: { type: string; team: number }[] = [];

    constructor(bluePos: Vector2, redPos: Vector2, targetScore: number = 5) {
        this.targetScore = targetScore;
        this.flags = [
            { team: 1, basePos: bluePos.clone(), pos: bluePos.clone(), carrier: null, atBase: true, returnTimer: 0 },
            { team: 2, basePos: redPos.clone(), pos: redPos.clone(), carrier: null, atBase: true, returnTimer: 0 },
        ];
    }

    private flagOf(team: number): FlagState {
        return this.flags[team - 1];
    }

    update(players: Player[], mapBottom: number): void {
        this.events = [];
        if (this.winner) return;

        for (const flag of this.flags) {
            // Portador morreu → derruba a bandeira onde caiu
            if (flag.carrier) {
                if (flag.carrier.isDead) {
                    flag.pos = flag.carrier.pos.clone();
                    if (flag.pos.y > mapBottom - 60) flag.pos.y = mapBottom - 60;
                    flag.carrier = null;
                    flag.returnTimer = AUTO_RETURN_FRAMES;
                    this.events.push({ type: 'drop', team: flag.team });
                } else {
                    flag.pos = flag.carrier.pos.clone();
                }
            } else if (!flag.atBase) {
                // Caída no campo: timer de retorno automático
                flag.returnTimer--;
                if (flag.returnTimer <= 0) this.returnFlag(flag);
            }
        }

        for (const p of players) {
            if (p.isDead) continue;
            const team = (p as any).team as number;
            if (team !== 1 && team !== 2) continue;

            const enemyFlag = this.flagOf(team === 1 ? 2 : 1);
            const ownFlag = this.flagOf(team);

            // Pegar bandeira inimiga
            if (!enemyFlag.carrier && p.pos.distance(enemyFlag.pos) < PICKUP_RADIUS) {
                enemyFlag.carrier = p;
                enemyFlag.atBase = false;
                this.events.push({ type: 'pickup', team });
            }

            // Devolver a própria bandeira caída
            if (!ownFlag.atBase && !ownFlag.carrier && p.pos.distance(ownFlag.pos) < PICKUP_RADIUS) {
                this.returnFlag(ownFlag);
                this.events.push({ type: 'return', team });
            }

            // Capturar: portador na própria base com a própria bandeira em casa
            if (enemyFlag.carrier === p && ownFlag.atBase &&
                p.pos.distance(ownFlag.basePos) < CAPTURE_RADIUS) {
                this.scores[team]++;
                this.returnFlag(enemyFlag);
                this.events.push({ type: 'capture', team });
                if (this.scores[team] >= this.targetScore) {
                    this.winner = team;
                }
            }
        }
    }

    private returnFlag(flag: FlagState): void {
        flag.carrier = null;
        flag.atBase = true;
        flag.pos = flag.basePos.clone();
        flag.returnTimer = 0;
    }

    /** A bandeira que este jogador está carregando (ou null) */
    carriedBy(p: Player): FlagState | null {
        for (const f of this.flags) if (f.carrier === p) return f;
        return null;
    }

    /** Render em coordenadas de mundo (dentro do transform da câmera) */
    render(ctx: CanvasRenderingContext2D): void {
        for (const flag of this.flags) {
            const c = flag.team === 2 ? PALETTE.teamRed : PALETTE.teamBlue;

            // Marcador da base (círculo de captura)
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.strokeStyle = c;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 8]);
            ctx.beginPath();
            ctx.arc(flag.basePos.x, flag.basePos.y - 6, CAPTURE_RADIUS, Math.PI, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            if (flag.carrier) {
                // Bandeira nas costas do portador
                ctx.save();
                ctx.translate(flag.carrier.pos.x, flag.carrier.pos.y - 18);
                ctx.rotate(-0.5);
                ctx.scale(0.55, 0.55);
                drawAsset(ctx, 'flag', 0, 0, 1, 0, 7, flag.team);
                ctx.restore();
                // seta indicadora sobre o portador
                const bob = Math.sin(Date.now() * 0.006) * 4;
                ctx.fillStyle = c;
                ctx.beginPath();
                ctx.moveTo(flag.carrier.pos.x - 8, flag.carrier.pos.y - 58 + bob);
                ctx.lineTo(flag.carrier.pos.x + 8, flag.carrier.pos.y - 58 + bob);
                ctx.lineTo(flag.carrier.pos.x, flag.carrier.pos.y - 46 + bob);
                ctx.closePath();
                ctx.fill();
            } else {
                drawAsset(ctx, 'flag', flag.pos.x, flag.pos.y, 1, 0, 7, flag.team);
                if (!flag.atBase) {
                    // brilho pulsante em bandeira caída
                    ctx.save();
                    ctx.globalAlpha = 0.25 + Math.sin(Date.now() * 0.008) * 0.15;
                    ctx.fillStyle = shade(c, 0.3);
                    ctx.beginPath();
                    ctx.arc(flag.pos.x, flag.pos.y - 40, 30, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }
    }

    /** Placar no topo da tela (coordenadas de tela) */
    renderScoreboard(ctx: CanvasRenderingContext2D, screenW: number): void {
        const cx = screenW / 2;
        const y = 60; // abaixo do botão MENU dos controles de toque
        const w = 220, h = 44;

        ctx.save();
        // painel
        ctx.fillStyle = 'rgba(20,24,20,0.72)';
        ctx.beginPath();
        ctx.roundRect(cx - w / 2, y, w, h, 6);
        ctx.fill();

        // barras dos times
        ctx.fillStyle = PALETTE.teamBlue;
        ctx.fillRect(cx - w / 2, y, 6, h);
        ctx.fillStyle = PALETTE.teamRed;
        ctx.fillRect(cx + w / 2 - 6, y, 6, h);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 26px "Outfit", sans-serif';
        ctx.fillStyle = '#cfe0f4';
        ctx.fillText(String(this.scores[1]), cx - 62, y + h / 2);
        ctx.fillStyle = '#f4d0cc';
        ctx.fillText(String(this.scores[2]), cx + 62, y + h / 2);

        ctx.font = '700 11px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText(`CTF · ${this.targetScore} CAPTURAS`, cx, y + h / 2 - 8);

        // status das bandeiras
        const status = (f: FlagState) => f.atBase ? '●' : (f.carrier ? '▲' : '▼');
        ctx.font = '700 12px "Inter", sans-serif';
        ctx.fillStyle = PALETTE.teamBlue;
        ctx.fillText(status(this.flags[0]), cx - 28, y + h / 2 + 9);
        ctx.fillStyle = PALETTE.teamRed;
        ctx.fillText(status(this.flags[1]), cx + 28, y + h / 2 + 9);
        ctx.restore();
    }

    /** Tela de vitória (coordenadas de tela) */
    renderVictory(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
        if (!this.winner) return;
        const c = this.winner === 2 ? PALETTE.teamRed : PALETTE.teamBlue;
        const name = this.winner === 2 ? 'VERMELHO' : 'AZUL';

        ctx.save();
        ctx.fillStyle = 'rgba(12,16,12,0.7)';
        ctx.fillRect(0, 0, screenW, screenH);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = c;
        ctx.font = '900 64px "Outfit", sans-serif';
        ctx.fillText(`TIME ${name} VENCEU`, screenW / 2, screenH / 2 - 30);

        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '700 20px "Inter", sans-serif';
        ctx.fillText(`${this.scores[1]}  —  ${this.scores[2]}`, screenW / 2, screenH / 2 + 28);
        ctx.font = '400 14px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('Pressione ESC para voltar ao menu', screenW / 2, screenH / 2 + 64);
        ctx.restore();
    }
}
