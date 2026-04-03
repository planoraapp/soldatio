import { 
    Group, 
    Mesh, 
    TextureLoader, 
    NearestFilter, 
    PlaneGeometry, 
    MeshBasicMaterial, 
    Texture, 
    DoubleSide,
    Vector2
} from 'three';

/**
 * ThreeSoldier — Renders the SpriteCook 2D animations as billboard sprites in the 3D world.
 */
export class ThreeSoldier extends Group {
    private mesh: Mesh;
    private weaponMesh: Mesh;
    private textures: Record<string, Texture> = {};
    private weaponTextures: Record<string, Texture> = {};
    private currentSheet: string = 'idle';
    private currentWeapon: string = '';
    private deathFrame: number = 0;
    private lastUpdateTime: number = 0;
    private yOffset: number = -6; // Adjustment to glue feet to the ground
    private spriteSize: number = 48; // Standard size

    constructor() {
        super();
        
        const loader = new TextureLoader();
        const paths: Record<string, string> = {
            idle: '/assets/char/idle (1).png',
            run: '/assets/char/run (1).png',
            jump: '/assets/char/jump (1).png',
            somersault: '/assets/char/sommersault (1).png',
            hurt: '/assets/char/hurt (1).png',
            death: '/assets/char/death (1).png'
        };

        const weaponPaths: Record<string, string> = {
            'Desert Eagles': '/assets/weapons/deserteagle.png',
            'HK MP5': '/assets/weapons/hkmp5.png',
            'Ak-74': '/assets/weapons/ak47.png',
            'Steyr AUG': '/assets/weapons/steyraug.png',
            'Spas-12': '/assets/weapons/spas12.png',
            'Ruger 77': '/assets/weapons/rugger77.png',
            'M79': '/assets/weapons/m79.png',
            'Barrett M82A1': '/assets/weapons/barret.png',
            'FN Minimi': '/assets/weapons/fnminimi.png',
            'XM214 Minigun': '/assets/weapons/minigun.png',
            'M72 LAW': '/assets/weapons/m72law.png',
            'Chainsaw': '/assets/weapons/chainsaw.png',
            'Combat Knife': '/assets/weapons/knife.png',
            'USSOCOM': '/assets/weapons/ussocom.png'
        };

        // Load all sheets
        for (const [key, path] of Object.entries(paths)) {
            const tex = loader.load(path);
            tex.magFilter = NearestFilter;
            tex.minFilter = NearestFilter;
            tex.repeat.set(1/4, 1/3); 
            this.textures[key] = tex;
        }

        // Load weapons
        for (const [name, path] of Object.entries(weaponPaths)) {
            const tex = loader.load(path);
            tex.magFilter = NearestFilter;
            tex.minFilter = NearestFilter;
            this.weaponTextures[name] = tex;
        }

        const geo = new PlaneGeometry(32, 32);
        const mat = new MeshBasicMaterial({
            map: this.textures.idle,
            transparent: true,
            side: DoubleSide,
            alphaTest: 0.1
        });

        this.mesh = new Mesh(geo, mat);
        // Sprite Pivot adjustment to fix floating
        this.mesh.position.y = 16 + this.yOffset; 
        this.add(this.mesh);

        // Weapon Mesh
        const weaponGeo = new PlaneGeometry(32, 16);
        // Shift geometry so the "grip" is at (0,0)
        weaponGeo.translate(10, 0, 0); 
        
        const weaponMat = new MeshBasicMaterial({ 
            transparent: true, 
            side: DoubleSide,
            alphaTest: 0.1 
        });
        this.weaponMesh = new Mesh(weaponGeo, weaponMat);
        this.weaponMesh.position.set(0, 16 + this.yOffset + 2, 1); // Position at arm level
        this.add(this.weaponMesh);
    }

    /** 
     * Update the 3D sprite animation.
     * @param walkPhase The animation frame counter
     * @param aimAngle Angle the player is aiming
     * @param facingDir 1 or -1
     * @param isCrouching Not used for full-body sprites yet
     * @param velocityX Speed to determine run vs idle
     */
    updateAnimation(
        walkPhase: number,
        aimAngle: number,
        facingDir: number,
        isCrouching: boolean,
        velocityX: number,
        isRolling: boolean = false,
        isGrounded: boolean = true,
        isHurt: boolean = false,
        isDead: boolean = false,
        weaponName: string = ''
    ): void {
        const time = performance.now();
        const deltaTime = (time - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = time;

        // 0. Weapon Rendering
        if (isDead) {
            this.weaponMesh.visible = false;
        } else {
            this.weaponMesh.visible = true;
            if (this.currentWeapon !== weaponName && this.weaponTextures[weaponName]) {
                const tex = this.weaponTextures[weaponName];
                (this.weaponMesh.material as MeshBasicMaterial).map = tex;
                (this.weaponMesh.material as MeshBasicMaterial).needsUpdate = true;
                this.currentWeapon = weaponName;
            }

            // Transform weapon to follow aim
            // Invert the angle because Three.js Y is up, but our game Y is down
            this.weaponMesh.rotation.z = -aimAngle;
            
            // Flip weapon vertically if looking left so it's not upside down
            // But we must account for the inverted angle above.
            if (facingDir === -1) {
                // If looking left, we need to flip the weapon vertically
                // And because we inverted the angle, the flip logic needs to be rock solid.
                this.weaponMesh.scale.y = -1;
                // Add PI to rotation to face the other way if it was the soldier group flipping,
                // but since we rotate 360 degrees, just flipping Y is usually enough 
                // IF the angle is already correct (which it is, from -PI to PI).
            } else {
                this.weaponMesh.scale.y = 1;
            }
            // Ensure X is always 1
            this.weaponMesh.scale.x = 1;
        }

        // 1. Determine which sheet to use
        let sheetKey = 'idle';
        if (isDead) {
            sheetKey = 'death';
            this.deathFrame += deltaTime * 12; // 12 FPS death animation
        } else if (isHurt) {
            sheetKey = 'hurt';
            this.deathFrame = 0; // Reset when not dead
        } else {
            sheetKey = 'idle';
            this.deathFrame = 0;
            if (isRolling) {
                sheetKey = 'somersault';
            } else if (!isGrounded) {
                sheetKey = 'jump';
            } else if (Math.abs(velocityX) > 0.5) {
                sheetKey = 'run';
            }
        }

        const texture = this.textures[sheetKey];
        if (!texture) return;

        // 2. Select texture
        if (this.currentSheet !== sheetKey) {
            this.mesh.material = (this.mesh.material as MeshBasicMaterial).clone();
            (this.mesh.material as MeshBasicMaterial).map = texture;
            this.currentSheet = sheetKey;
        }

        // 3. Calculate UV offset (Assuming 4 cols, 3 rows)
        let frameCount = 4;
        if (sheetKey === 'run' || sheetKey === 'somersault' || sheetKey === 'death') frameCount = 8;
        if (sheetKey === 'hurt') frameCount = 2;

        let frameIndex = 0;
        if (sheetKey === 'death') {
            frameIndex = Math.min(Math.floor(this.deathFrame), frameCount - 1);
        } else {
            frameIndex = Math.floor(walkPhase) % frameCount;
        }
        
        const col = frameIndex % 4;
        const row = Math.floor(frameIndex / 4);

        // Update offset (X-coord is standard, Y-coord is 1 - row in Three.js)
        texture.offset.x = col * (1/4);
        texture.offset.y = 1 - (row + 1) * (1/3);

        // 4. Flip and Rotate
        this.mesh.scale.x = facingDir;
        
        // Tilt based on velocity (optional lean)
        if (!isRolling) {
            this.mesh.rotation.z = velocityX * 0.02;
        }
    }
}
