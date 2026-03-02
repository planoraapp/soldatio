/**
 * Weapon definitions mimicking the classic Soldat arsenal.
 */
export interface WeaponDef {
    name: string;
    fireRate: number;       // ms between shots
    bulletSpeed: number;    // pixels per frame
    bulletCount: number;    // bullets per shot (>1 for shotgun)
    spread: number;         // radians of random spread
    recoilForce: number;    // force applied to player on fire
    damage: number;         // damage per bullet
    bulletGravity: number;  // gravity applied to bullet per frame
    magazineSize: number;   // bullets before reload
    reloadTime: number;     // ms to reload
    bulletLifetime: number; // frames before bullet despawns
    automatic: boolean;     // hold to keep firing?
    bulletTrailColor: string;
    muzzleFlashColor: string;
}

export const WEAPONS: WeaponDef[] = [
    {
        name: 'Desert Eagles',
        fireRate: 200,
        bulletSpeed: 28,
        bulletCount: 1,
        spread: 0.02,
        recoilForce: 3.5,
        damage: 33,
        bulletGravity: 0.04,
        magazineSize: 7,
        reloadTime: 1200,
        bulletLifetime: 90,
        automatic: false,
        bulletTrailColor: '#ffdd44',
        muzzleFlashColor: '#ffaa00',
    },
    {
        name: 'MP5',
        fireRate: 60,
        bulletSpeed: 26,
        bulletCount: 1,
        spread: 0.05,
        recoilForce: 1.2,
        damage: 12,
        bulletGravity: 0.03,
        magazineSize: 30,
        reloadTime: 1600,
        bulletLifetime: 70,
        automatic: true,
        bulletTrailColor: '#ffee66',
        muzzleFlashColor: '#ff8800',
    },
    {
        name: 'AK-74',
        fireRate: 90,
        bulletSpeed: 30,
        bulletCount: 1,
        spread: 0.04,
        recoilForce: 2.0,
        damage: 18,
        bulletGravity: 0.03,
        magazineSize: 40,
        reloadTime: 1800,
        bulletLifetime: 85,
        automatic: true,
        bulletTrailColor: '#ffcc33',
        muzzleFlashColor: '#ff6600',
    },
    {
        name: 'Barrett M82',
        fireRate: 1100,
        bulletSpeed: 50,
        bulletCount: 1,
        spread: 0.005,
        recoilForce: 10.0,
        damage: 95,
        bulletGravity: 0.01,
        magazineSize: 10,
        reloadTime: 2200,
        bulletLifetime: 120,
        automatic: false,
        bulletTrailColor: '#ff4444',
        muzzleFlashColor: '#ff2200',
    },
    {
        name: 'SPAS-12',
        fireRate: 350,
        bulletSpeed: 24,
        bulletCount: 6,
        spread: 0.12,
        recoilForce: 6.0,
        damage: 16,
        bulletGravity: 0.06,
        magazineSize: 7,
        reloadTime: 2000,
        bulletLifetime: 40,
        automatic: false,
        bulletTrailColor: '#ddaa33',
        muzzleFlashColor: '#ff9900',
    },
];
