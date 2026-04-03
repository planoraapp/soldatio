import { 
    WebGLRenderer, 
    Scene, 
    PerspectiveCamera, 
    AmbientLight, 
    Color 
} from 'three';
import { ThreeSoldier } from '../game/ThreeSoldier';

export interface GostekConfig {
    skinColor: string;
    shirtColor: string;
    pantsColor: string;
    bootColor: string;
    headgearColor: string;
}

/**
 * Three.js based Gostek preview for the Asset Editor.
 */
export class GostekPreview {
    private renderer: WebGLRenderer;
    private scene: Scene;
    private camera: PerspectiveCamera;
    private soldier: ThreeSoldier;
    private animId: number = 0;
    
    private walkPhase: number = 0;
    private walkSpeed: number = 5;
    private aimDeg: number = 0;
    private crouching: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.scene = new Scene();
        this.camera = new PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 80);
        this.camera.lookAt(0, 0, 0);

        const ambient = new AmbientLight(0xffffff, 1.0);
        this.scene.add(ambient);

        this.soldier = new ThreeSoldier('/char_highres.png');
        this.scene.add(this.soldier);

        this.start();
    }

    setConfig(cfg: GostekConfig, sprites?: any): void {
        // Future: update colors or textures on the meshes
    }

    setWalkSpeed(s: number): void { this.walkSpeed = s; }
    setAimDeg(d: number): void { this.aimDeg = d; }
    setCrouching(c: boolean): void { this.crouching = c; }

    private start(): void {
        const loop = () => {
            this.walkPhase += this.walkSpeed * 0.05;
            const aimRad = (this.aimDeg * Math.PI) / 180;
            
            this.soldier.updateAnimation(
                this.walkPhase,
                aimRad,
                1,
                this.crouching,
                this.walkSpeed
            );

            this.renderer.render(this.scene, this.camera);
            this.animId = requestAnimationFrame(loop);
        };
        this.animId = requestAnimationFrame(loop);
    }

    destroy(): void {
        cancelAnimationFrame(this.animId);
    }
}
