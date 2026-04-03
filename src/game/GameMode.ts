import { Vector2 } from '../engine/Vector2';
import { Player, Team } from './Player';

export enum GameModeType {
    DEATHMATCH = 'DEATHMATCH', // Actually TDM since teams exist
    CTF = 'CTF'
}

export class Flag {
    public team: Team;
    public basePos: Vector2;
    public currentPos: Vector2;
    public carrier: Player | null = null;
    public isAtBase: boolean = true;

    constructor(team: Team, basePos: Vector2) {
        this.team = team;
        this.basePos = basePos.clone();
        this.currentPos = basePos.clone();
    }

    reset(): void {
        this.currentPos = this.basePos.clone();
        this.carrier = null;
        this.isAtBase = true;
    }
}

export class GameModeManager {
    public mode: GameModeType = GameModeType.DEATHMATCH;

    // Scores
    public scoreAlpha: number = 0;
    public scoreBravo: number = 0;
    public maxScore: number = 3;

    // CTF specific
    public flags: Record<Team, Flag | null> = {
        [Team.NONE]: null,
        [Team.ALPHA]: null,
        [Team.BRAVO]: null
    };

    public gameOver: boolean = false;
    public winner: Team = Team.NONE;

    constructor(mode: GameModeType) {
        this.mode = mode;
        this.maxScore = mode === GameModeType.DEATHMATCH ? 50 : 3;
    }

    initCTF(alphaBase: Vector2, bravoBase: Vector2) {
        this.flags[Team.ALPHA] = new Flag(Team.ALPHA, alphaBase);
        this.flags[Team.BRAVO] = new Flag(Team.BRAVO, bravoBase);
    }

    update(players: Player[]): void {
        if (this.gameOver) return;

        // Check Points win condition
        if (this.scoreAlpha >= this.maxScore) {
            this.gameOver = true;
            this.winner = Team.ALPHA;
            return;
        }
        if (this.scoreBravo >= this.maxScore) {
            this.gameOver = true;
            this.winner = Team.BRAVO;
            return;
        }

        if (this.mode === GameModeType.CTF) {
            this.updateCTF(players);
        }
    }

    private updateCTF(players: Player[]): void {
        const flagA = this.flags[Team.ALPHA];
        const flagB = this.flags[Team.BRAVO];

        if (!flagA || !flagB) return;

        // Handle carried flags
        for (const flag of [flagA, flagB]) {
            if (flag.carrier) {
                if (flag.carrier.isDead) { // Dropped flag
                    flag.currentPos = flag.carrier.pos.clone();
                    flag.carrier.hasFlag = false;
                    flag.carrier = null;
                } else { // Follow carrier
                    flag.currentPos = flag.carrier.pos.clone();
                }
            }
        }

        const TOUCH_RADIUS = 30;

        for (const player of players) {
            if (player.isDead) continue;

            const myFlag = player.team === Team.ALPHA ? flagA : flagB;
            const enemyFlag = player.team === Team.ALPHA ? flagB : flagA;

            // Touch Enemy Flag -> Pick Up
            if (!enemyFlag.carrier && player.pos.distance(enemyFlag.currentPos) < TOUCH_RADIUS) {
                enemyFlag.carrier = player;
                enemyFlag.isAtBase = false;
                player.hasFlag = true;
                // Add minor point for pick up
                player.score += 5;
            }

            // Touch My Flag -> Return it if dropped
            if (!myFlag.isAtBase && !myFlag.carrier && player.pos.distance(myFlag.currentPos) < TOUCH_RADIUS) {
                myFlag.reset();
                player.score += 15; // Point for return
            }

            // Scoring a Capture: Carrier reaches own base area and own flag is at base
            if (player.hasFlag && enemyFlag.carrier === player && myFlag.isAtBase) {
                if (player.pos.distance(myFlag.basePos) < TOUCH_RADIUS * 2) { // Made home
                    enemyFlag.reset();
                    player.hasFlag = false;
                    player.score += 50;
                    
                    if (player.team === Team.ALPHA) this.scoreAlpha++;
                    else this.scoreBravo++;
                }
            }
        }
    }

    render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, zoom: number): void {
        if (this.mode !== GameModeType.CTF) return;

        const flagA = this.flags[Team.ALPHA];
        const flagB = this.flags[Team.BRAVO];
        
        ctx.save();
        [flagA, flagB].forEach(flag => {
            if (!flag || flag.carrier) return; // Don't draw flag heavily if carried (carrier draws it)

            const sx = (flag.currentPos.x - cameraX) * zoom;
            const sy = (flag.currentPos.y - cameraY) * zoom;

            ctx.fillStyle = flag.team === Team.ALPHA ? '#3498db' : '#e74c3c';
            ctx.fillRect(sx - 5*zoom, sy - 20*zoom, 10*zoom, 20*zoom);
            ctx.fillStyle = '#ecf0f1';
            ctx.fillRect(sx - 6*zoom, sy - 20*zoom, 2*zoom, 25*zoom);
        });
        ctx.restore();
    }
}
