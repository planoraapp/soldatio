import { 
    WebGLRenderer, 
    Scene, 
    OrthographicCamera, 
    AmbientLight, 
    DirectionalLight, 
    Shape, 
    ExtrudeGeometry, 
    MeshPhongMaterial, 
    Color, 
    Mesh, 
    PlaneGeometry, 
    MeshBasicMaterial,
    DoubleSide,
    Group,
    TextureLoader,
    RepeatWrapping
} from 'three';
import { GameMap, PolygonType, Material } from '../game/GameMap';
import { Vector2 } from './Vector2';
import { Vector2 as ThreeVector2 } from 'three'; // Alias for Three.js methods
import { TERRAIN_SPRITES, getImage as getSpriteImage } from './SpriteSheet';

/**
 * ThreeRenderer — Bridge between 2D Game Logic and Three.js 3D Rendering.
 * Optimized for tactical centering and proper 2D-world scale.
 */
export class ThreeRenderer {
    renderer: WebGLRenderer;
    scene: Scene;
    camera: OrthographicCamera;
    
    private terrainMeshes: Mesh[] = [];
    private sky: Mesh | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: false // Efficient
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.scene = new Scene();
        this.scene.background = new Color('#1a0000'); // Dark red fallback to see leaks

        console.log(`ThreeRenderer: Init. Viewport: ${window.innerWidth}x${window.innerHeight}, PR: ${window.devicePixelRatio}`);
        
        // Orthographic camera — Reverted to 350 for standard view
        const aspect = window.innerWidth / window.innerHeight;
        const frustum = 350; 
        this.camera = new OrthographicCamera(
            -frustum * aspect, frustum * aspect,
            frustum, -frustum,
            0.1, 10000
        );
        this.camera.position.set(0, 0, 1000); // Back away to see the plane

        // Lighting
        const ambient = new AmbientLight(0xffffff, 1.0);
        this.scene.add(ambient);
        
        const dirLight = new DirectionalLight(0xffffff, 0.4);
        dirLight.position.set(100, 200, 500); 
        this.scene.add(dirLight);

        window.addEventListener('resize', () => this.resize());
    }

    private resize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;
        const frustum = 350; // Standard view

        this.camera.left = -frustum * aspect;
        this.camera.right = frustum * aspect;
        this.camera.top = frustum;
        this.camera.bottom = -frustum;
        this.camera.updateProjectionMatrix();

        // Fix: Force PixelRatio to 1.0 if it's less than 1.0 (prevents black bars on browser zoom)
        const pr = Math.max(1, window.devicePixelRatio);
        this.renderer.setPixelRatio(pr);
        this.renderer.setSize(width, height, false);
        this.renderer.setViewport(0, 0, width, height);

        console.log(`ThreeRenderer: Resized. ${width}x${height}, PR: ${pr}`);
    }

    initMap(map: GameMap): void {
        this.terrainMeshes.forEach(m => this.scene.remove(m));
        this.terrainMeshes = [];

        map.data.polygons.forEach((poly) => {
            if (poly.vertices.length < 3) return;

            const shape = new Shape();
            shape.moveTo(poly.vertices[0].x, -poly.vertices[0].y);
            for (let i = 1; i < poly.vertices.length; i++) {
                shape.lineTo(poly.vertices[i].x, -poly.vertices[i].y);
            }
            shape.closePath();

            const settings = {
                depth: poly.type === PolygonType.BACKGROUND ? 10 : 35,
                bevelEnabled: true,
                bevelThickness: 2,
                bevelSize: 2
            };

            const geometry = new ExtrudeGeometry(shape, settings);
            const material = new MeshPhongMaterial({
                color: new Color(poly.color),
                flatShading: true,
                shininess: 10
            });

            const mesh = new Mesh(geometry, material);
            mesh.position.z = poly.type === PolygonType.BACKGROUND ? -50 : 0;
            
            this.terrainMeshes.push(mesh);
            this.scene.add(mesh);
        });

        // Skybox - Made much larger and disabled culling to prevent leaks
        if (!this.sky) {
            const skySize = 200000;
            const skyGeo = new PlaneGeometry(skySize, skySize);
            
            const loader = new TextureLoader();
            const skyTex = loader.load('/assets/maps/skytest.png', (tex) => {
                tex.wrapS = tex.wrapT = RepeatWrapping;
                tex.repeat.set(40, 10);
            });

            const skyMat = new MeshBasicMaterial({ 
                map: skyTex, 
                side: DoubleSide,
                depthWrite: false,
                depthTest: false
            });
            
            this.sky = new Mesh(skyGeo, skyMat);
            this.sky.position.z = -800;
            this.sky.renderOrder = -1000;
            this.sky.frustumCulled = false; // Never hide the background
            this.scene.add(this.sky);
        }
    }

    updateCamera(x: number, y: number, zoom: number): void {
        this.camera.position.x = x;
        this.camera.position.y = -y; // Invert world Y for Three.js
        this.camera.zoom = zoom;
        this.camera.updateProjectionMatrix();

        // Sky follows camera to stay in background
        if (this.sky) {
            this.sky.position.x = x;
            this.sky.position.y = -y;
        }

        // Periodic debug log for camera sync
        if (Math.random() < 0.01) {
            const size = new ThreeVector2();
            this.renderer.getSize(size);
            console.log(`Frame Check: World(${x}, ${y}), CanvasSize(${size.x}, ${size.y}), SkyPos(${this.sky?.position.x})`);
        }
    }

    render(): void {
        this.renderer.render(this.scene, this.camera);
    }
}
