import { 
    Group, Mesh, MeshBasicMaterial, PlaneGeometry, 
    DoubleSide, TextureLoader, SphereGeometry, 
    CircleGeometry, MeshStandardMaterial 
} from 'three';
import { Vector2 } from '../engine/Vector2';
import { PickupData, PickupType, MapPolygon, PolygonType } from './GameMap';
import { Player } from './Player';
import { ParticleSystem } from './Particles';

export class PickupManager {
    private meshes: Map<PickupData, Group> = new Map();
    private textureLoader = new TextureLoader();
    private textures: Record<string, any> = {};

    constructor() {
        this.loadTextures();
    }

    private async loadTextures() {
        const paths = {
            [PickupType.HEALTH]: '/assets/maps/medkit.png',
            [PickupType.GRENADES]: '/assets/maps/grenade.png',
            [PickupType.AMMO]: '/assets/maps/ammo.png'
        };
        for (const [type, path] of Object.entries(paths)) {
            this.textures[type] = this.textureLoader.load(path);
        }
    }

    update(pickups: PickupData[], players: Player[], polygons: MapPolygon[], particles: ParticleSystem, scene: any): void {
        for (const p of pickups) {
            // Respawn logic
            if (p.timer > 0) {
                p.timer--;
                if (this.meshes.has(p)) {
                    scene.remove(this.meshes.get(p)!);
                    this.meshes.delete(p);
                }
                
                // When timer is about to finish, prepare for air-drop
                if (p.timer === 1) {
                    p.y = -500; // Drop from sky
                    p.isFalling = true;
                    p.velY = 1.5;
                    p.hasLanded = false;
                }
                continue;
            }

            // Create mesh if not exists
            if (!this.meshes.has(p)) {
                const group = this.createPickupMesh(p);
                this.meshes.set(p, group);
                scene.add(group);
            }

            const group = this.meshes.get(p)!;

            // --- PHYSICS & PARACHUTE ---
            if (p.isFalling) {
                p.y += p.velY || 1.5;
                
                // Show parachute
                const chute = group.getObjectByName('parachute');
                if (chute) chute.visible = true;

                // Simple collision detection with terrain
                for (const poly of polygons) {
                    if (poly.type === PolygonType.SOLID || poly.type === PolygonType.ONE_WAY) {
                        // Check if p.x is within polygon horizontally and p.y just touched its top
                        // Optimized for drop-down physics
                        const top = this.getPolygonTopAt(poly, p.x);
                        if (top !== null && p.y >= top - 10) {
                            p.y = top - 15;
                            p.isFalling = false;
                            p.hasLanded = true;
                            if (chute) chute.visible = false;
                            break;
                        }
                    }
                }
            }

            // Update mesh position
            group.position.set(p.x, -p.y, 45); // Z index 45
            
            // Animation: Slow rotation or floating
            const box = group.getObjectByName('box');
            if (box) {
                if (p.hasLanded) {
                    box.rotation.y += 0.02;
                    box.position.y = Math.sin(Date.now() * 0.005) * 5;
                } else {
                    // Slight sway while falling
                    box.rotation.z = Math.sin(Date.now() * 0.002) * 0.2;
                }
            }

            // Collision with players
            for (const player of players) {
                if (player.isDead) continue;
                const dist = player.pos.distance(new Vector2(p.x, p.y));
                if (dist < player.radius + 20) {
                    this.applyEffect(p, player);
                    p.timer = 1800; // 30s
                    particles.spawnMuzzleFlash(new Vector2(p.x, p.y), new Vector2(0, -1), '#fff');
                    break;
                }
            }
        }
    }

    private getPolygonTopAt(poly: MapPolygon, x: number): number | null {
        // Very simple bounding box check
        let minX = Infinity, maxX = -Infinity, minY = Infinity;
        for (const v of poly.vertices) {
            minX = Math.min(minX, v.x);
            maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y);
        }
        if (x >= minX && x <= maxX) return minY;
        return null;
    }

    private createPickupMesh(p: PickupData): Group {
        const group = new Group();

        // 1. The Item Box (Plane)
        const size = 32;
        const boxGeo = new PlaneGeometry(size, size);
        const boxMat = new MeshBasicMaterial({ 
            map: this.textures[p.type] || null, 
            transparent: true,
            side: DoubleSide
        });
        const boxMesh = new Mesh(boxGeo, boxMat);
        boxMesh.name = 'box';
        group.add(boxMesh);

        // 2. The Parachute (Visual for air drops)
        const chuteGeo = new SphereGeometry(40, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const chuteMat = new MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.8,
            side: DoubleSide,
            wireframe: true // Looks cool for low-poly/schematic feel
        });
        const chuteMesh = new Mesh(chuteGeo, chuteMat);
        chuteMesh.name = 'parachute';
        chuteMesh.rotation.x = Math.PI; // Invert to look like a chute
        chuteMesh.position.y = 50;
        chuteMesh.visible = false;
        group.add(chuteMesh);

        return group;
    }

    private applyEffect(pickup: PickupData, player: Player): void {
        switch (pickup.type) {
            case PickupType.HEALTH:
                player.health = Math.min(player.maxHealth, player.health + 50);
                break;
            case PickupType.GRENADES:
                player.grenadeCount = Math.min(5, player.grenadeCount + 3);
                break;
            case PickupType.AMMO:
                // Full magazine for current weapon
                player.refillAmmo();
                break;
        }
    }

    render(ctx: CanvasRenderingContext2D, pickups: PickupData[]): void {
        // Now handled by Three.js in update loop, keeping local canvas overlay empty or for labels
    }
}

