/**
 * AudioManager – Procedural retro sound effects via the Web Audio API.
 *
 * All sounds are synthesised at runtime using oscillators and white noise —
 * no external audio files required. Supports stereo panning so sounds appear
 * to come from their world position (left / right of the camera).
 */
export class AudioManager {
    private ctx: AudioContext;
    private masterGain: GainNode;
    private _ready = false;

    constructor() {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.35;
        this.masterGain.connect(this.ctx.destination);
    }

    /** Must be called after the first user gesture (click / keydown). */
    resume(): void {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => { this._ready = true; });
        } else {
            this._ready = true;
        }
    }

    // =========================================================
    // Public sound triggers
    // =========================================================

    /** Light weapon shot (pistols, SMG) */
    playShootLight(pan: number = 0): void {
        this.osc(380 + Math.random() * 80, 'square', 0.10, 0.38, pan, -180);
        this.noise(0.05, 0.12, pan);
    }

    /** Heavy weapon shot (AK-74, rifles) */
    playShootHeavy(pan: number = 0): void {
        this.osc(140 + Math.random() * 40, 'sawtooth', 0.18, 0.55, pan, -90);
        this.noise(0.12, 0.28, pan);
    }

    /** Sniper rifle shot (Barrett) */
    playSniper(pan: number = 0): void {
        this.osc(820, 'triangle', 0.40, 0.50, pan, -720);
        this.noise(0.20, 0.30, pan);
    }

    /** Shotgun blast */
    playShotgun(pan: number = 0): void {
        this.osc(200 + Math.random() * 60, 'sawtooth', 0.12, 0.70, pan, -100);
        this.noise(0.12, 0.55, pan);
    }

    /** Hand-cannon / M79 launcher */
    playHeavyShot(pan: number = 0): void {
        this.osc(90, 'sawtooth', 0.30, 0.80, pan, -60);
        this.noise(0.25, 0.50, pan);
    }

    /** Grenade explosion */
    playExplosion(pan: number = 0): void {
        this.osc(95, 'sawtooth', 0.75, 0.95, pan, -80);
        this.noise(0.65, 0.85, pan);
    }

    /** Death (descending pitch) */
    playDeath(pan: number = 0): void {
        this.osc(320, 'square', 0.45, 0.45, pan, -290);
    }

    /** Jetpack burst (called every few frames while jetting) */
    playJetpack(pan: number = 0): void {
        this.noise(0.06, 0.15, pan);
    }

    /** Weapon pickup / reload click */
    playReload(pan: number = 0): void {
        this.osc(600, 'square', 0.06, 0.22, pan, -200);
        this.osc(300, 'square', 0.08, 0.18, pan, -100);
    }

    // =========================================================
    // Private helpers
    // =========================================================

    /**
     * Play an oscillator tone with optional frequency slide.
     * @param freq      Start frequency in Hz
     * @param type      Oscillator wave type
     * @param duration  Sound duration in seconds
     * @param volume    Peak amplitude (0..1)
     * @param pan       Stereo pan (-1 = left, 0 = centre, 1 = right)
     * @param slide     Frequency delta applied over duration (negative = pitch drops)
     */
    private osc(
        freq: number,
        type: OscillatorType,
        duration: number,
        volume: number,
        pan: number,
        slide: number = 0
    ): void {
        if (!this._ready) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const pnr = this.ctx.createStereoPanner();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (slide !== 0) {
            osc.frequency.exponentialRampToValueAtTime(
                Math.max(1, freq + slide),
                now + duration
            );
        }

        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        pnr.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);

        osc.connect(gain);
        gain.connect(pnr);
        pnr.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    /**
     * Play a white-noise burst (impacts, explosions, gunshots).
     * @param duration  Burst duration in seconds
     * @param volume    Peak amplitude (0..1)
     * @param pan       Stereo pan
     */
    private noise(duration: number, volume: number, pan: number): void {
        if (!this._ready) return;
        const now = this.ctx.currentTime;
        const sampleRate = this.ctx.sampleRate;
        const bufferSize = Math.ceil(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const src = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        const pnr = this.ctx.createStereoPanner();

        src.buffer = buffer;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        pnr.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);

        src.connect(gain);
        gain.connect(pnr);
        pnr.connect(this.masterGain);

        src.start(now);
    }
}
