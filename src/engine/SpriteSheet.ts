/**
 * SpriteSheet — Central registry for all game spritesheets.
 *
 * All coordinates were measured from the actual PNG dimensions:
 *   terrain.png   168 × 1024  (6 materials, single column)
 *   char.png      825 × 1024  (4 cols × 5 rows)
 *   guns.png      323 × 1024  (1 col  × 10 rows)
 *   items.png     765 × 1024  (3 cols × 4 rows)
 *   particles.png 928 × 1152  (4 cols × 5 rows)
 */

// ─── Loaded image cache ────────────────────────────────────
const loadedImages = new Map<string, HTMLImageElement>();

export function loadImage(src: string): Promise<HTMLImageElement> {
    if (loadedImages.has(src)) return Promise.resolve(loadedImages.get(src)!);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { loadedImages.set(src, img); resolve(img); };
        img.onerror = reject;
        img.src = src;
    });
}

export function getImage(src: string): HTMLImageElement | null {
    return loadedImages.get(src) ?? null;
}

export async function loadAllSprites(): Promise<void> {
    await Promise.all([
        loadImage('/assets/maps/terrain.png'),
        loadImage('/assets/char/char.png'),
        loadImage('/assets/weapons/guns.png'),
        loadImage('/assets/maps/items.png'),
        loadImage('/assets/maps/particles.png'),
        loadImage('/assets/maps/tiles_nature.png'),
        loadImage('/assets/maps/props_industrial.png'),
        loadImage('/assets/char/idle (1).png'),
        loadImage('/assets/char/run (1).png'),
        loadImage('/assets/char/jump (1).png'),
        loadImage('/assets/char/sommersault (1).png'),
        loadImage('/assets/char/hurt (1).png'),
        loadImage('/assets/char/death (1).png'),
        loadImage('/assets/maps/scenario.png'),
        loadImage('/assets/weapons/m72law.png'),
        loadImage('/assets/weapons/m79.png'),
        loadImage('/assets/weapons/minigun.png'),
        loadImage('/assets/weapons/rugger77.png'),
        loadImage('/assets/weapons/hkmp5.png'),
        loadImage('/assets/weapons/chainsaw.png'),
        loadImage('/assets/weapons/ak47.png'),
        loadImage('/assets/weapons/deserteagle.png'),
        loadImage('/assets/weapons/steyraug.png'),
        loadImage('/assets/weapons/barret.png'),
        loadImage('/assets/weapons/fnminimi.png'),
        loadImage('/assets/weapons/knife.png'),
        loadImage('/assets/weapons/ussocom.png'),
        loadImage('/assets/weapons/spas12.png'),
        loadImage('/assets/maps/medkit.png'),
        loadImage('/assets/maps/ammo.png'),
        loadImage('/assets/maps/grenade.png'),
        loadImage('/assets/maps/sandbag.png'),
        loadImage('/assets/maps/sign.png'),
    ]);
}

// ─── Sprite definition ──────────────────────────────────────
export interface SpriteDef {
    sheet: string;  // path to the sheet (e.g. '/terrain.png')
    sx: number;     // source x
    sy: number;     // source y
    sw: number;     // source width
    sh: number;     // source height
}

// ────────────────────────────────────────────────────────────
// TERRAIN.PNG  (168 × 1024)
// Pixel analysis: tile texture = x:0..85 (85px wide).
// 6 bands stacked: each band ≈ 170px tall.
// We use the top portion of each band, skipping label overhang.
// ────────────────────────────────────────────────────────────
const T_W = 85;   // actual texture width (labels start at x≈85)
const T_H = 140;  // texture height per band (leaving bottom margin for separation line)
const T_BAND = 170;  // full band height (1024 / 6 ≈ 170)

export const TERRAIN_SPRITES: Record<string, SpriteDef> = {
    // Original Banded Sheet
    dirt_old: { sheet: '/terrain.png', sx: 0, sy: 0 * T_BAND + 2, sw: T_W, sh: T_H },
    grass_old: { sheet: '/terrain.png', sx: 0, sy: 1 * T_BAND + 2, sw: T_W, sh: T_H },
    
    // New Sideview Tileset (128x128 tiles in 512x512 grid)
    dirt: { sheet: '/tiles_nature.png', sx: 0, sy: 128, sw: 128, sh: 128 },
    grass: { sheet: '/tiles_nature.png', sx: 0, sy: 0, sw: 128, sh: 128 },
    rock: { sheet: '/tiles_nature.png', sx: 128, sy: 0, sw: 128, sh: 128 },
    concrete: { sheet: '/tiles_nature.png', sx: 256, sy: 0, sw: 128, sh: 128 },
    wood: { sheet: '/tiles_nature.png', sx: 384, sy: 0, sw: 128, sh: 128 },
    metal: { sheet: '/tiles_nature.png', sx: 0, sy: 256, sw: 128, sh: 128 },
};

// ────────────────────────────────────────────────────────────
// CHAR.PNG  (825 × 1024)
// 4 cols × 5 rows  →  cell = 206.25 × 204.8  ≈  206 × 205
// ────────────────────────────────────────────────────────────
const C_CW = Math.round(825 / 4);   // 206
const C_CH = Math.round(1024 / 5);  // 204

function charSprite(col: number, row: number): SpriteDef {
    return { sheet: '/char.png', sx: col * C_CW, sy: row * C_CH, sw: C_CW, sh: C_CH };
}

export const CHAR_SPRITES = {
    head: charSprite(0, 0),
    torso: charSprite(0, 1),
    r_upper_arm: charSprite(0, 2),
    r_lower_arm: charSprite(1, 2),
    l_upper_arm: charSprite(2, 2),
    l_lower_arm: charSprite(3, 2),
    r_thigh: charSprite(0, 3),
    r_shin: charSprite(1, 3),
    l_thigh: charSprite(2, 3),
    l_shin: charSprite(3, 3),
    r_foot: charSprite(0, 4),
    l_foot: charSprite(1, 4),
    pelvis: charSprite(2, 4),
};

// ────────────────────────────────────────────────────────────
// GUNS.PNG  (323 × 1024)
// 10 weapons in rows. Row height = 1024 / 10 = 102.4
// Weapon pixel area occupies left ~220px (labels on right).
// ────────────────────────────────────────────────────────────
const G_RH = Math.round(1024 / 10); // 102
const G_W = 220;

function gunSprite(row: number): SpriteDef {
    return { sheet: '/assets/weapons/guns.png', sx: 0, sy: row * G_RH, sw: G_W, sh: G_RH };
}

export const GUN_SPRITES: Record<string, SpriteDef> = {
    desert_eagle: gunSprite(0),
    mp5: gunSprite(1),
    ak74: gunSprite(2),
    aug: gunSprite(3),
    sniper: gunSprite(4),
    rocket_launcher: gunSprite(5),
    grenade_launcher: gunSprite(6),
    minigun: gunSprite(7),
    chainsaw: gunSprite(8),
    fists: gunSprite(9),
};

/** Map game weapon names → sprite keys */
export const WEAPON_SPRITE_MAP: Record<string, keyof typeof GUN_SPRITES> = {
    'Desert Eagle': 'desert_eagle',
    'MP5': 'mp5',
    'AK-74': 'ak74',
    'Steyr AUG': 'aug',
    'Sniper Rifle': 'sniper',
    'Rocket Launcher': 'rocket_launcher',
    'Grenade Launcher': 'grenade_launcher',
    'Minigun': 'minigun',
    'Chainsaw': 'chainsaw',
    'Fists': 'fists',
};

// ────────────────────────────────────────────────────────────
// ITEMS.PNG  (765 × 1024)
// 3 cols × 4 rows  →  cell ≈ 255 × 256
// ────────────────────────────────────────────────────────────
const I_CW = Math.round(765 / 3);   // 255
const I_CH = Math.round(1024 / 4);  // 256

function itemSprite(col: number, row: number): SpriteDef {
    return { sheet: '/assets/maps/items.png', sx: col * I_CW, sy: row * I_CH, sw: I_CW, sh: I_CH };
}

export const ITEM_SPRITES = {
    health: itemSprite(0, 0),
    grenade: itemSprite(1, 0),
    ammo: itemSprite(2, 0),
    crate: itemSprite(0, 1),
    barrel: itemSprite(1, 1),
    sandbag: itemSprite(2, 1),
    flag_blue: itemSprite(0, 2),
    flag_red: itemSprite(1, 2),
    sign: itemSprite(2, 2),
    bush: itemSprite(0, 3),
    pillar: itemSprite(1, 3),
    barrel_rusted: itemSprite(2, 3),
};

// ────────────────────────────────────────────────────────────
// PARTICLES.PNG  (928 × 1152)
// 5 rows of effects × 4 animation frames  →  cell ≈ 232 × 230
// ────────────────────────────────────────────────────────────
const P_CW = Math.round(928 / 4);    // 232
const P_CH = Math.round(1152 / 5);   // 230

function particleSprites(row: number): SpriteDef[] {
    return [0, 1, 2, 3].map(col => ({
        sheet: '/assets/maps/particles.png',
        sx: col * P_CW,
        sy: row * P_CH,
        sw: P_CW,
        sh: P_CH,
    }));
}

export const PARTICLE_SPRITES = {
    blood: particleSprites(0),   // 4 frames
    dust: particleSprites(1),   // 4 frames
    spark: particleSprites(2),   // 4 frames
    explosion: particleSprites(3),   // 4 frames
    shell: particleSprites(4),   // 4 frames
};

// ─── ANIMATED PLAYER SPRITES ────────────────────────────────
// These are 4x3 grids of 32x32 cells (from SpriteCook output)
// ────────────────────────────────────────────────────────────
const A_CW = 32;
const A_CH = 32;

function animSprite(sheet: string, col: number, row: number): SpriteDef {
    return { sheet, sx: col * A_CW, sy: row * A_CH, sw: A_CW, sh: A_CH };
}

function animSeq(sheet: string, count: number): SpriteDef[] {
    const seq: SpriteDef[] = [];
    for (let i = 0; i < count; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        seq.push(animSprite(sheet, col, row));
    }
    return seq;
}

export const PLAYER_ANIMATIONS = {
    idle: animSeq('/assets/char/idle (1).png', 4),       // First 4 frames for idle
    run: animSeq('/assets/char/run (1).png', 8),         // First 8 frames for walk/run
    jump: animSeq('/assets/char/jump (1).png', 4),       // First 4 frames for jump sequence
    somersault: animSeq('/assets/char/sommersault (1).png', 8), // 8 frames for the rolling maneuver
    hurt: animSeq('/assets/char/hurt (1).png', 2),       // 2 impact frames
    death: animSeq('/assets/char/death (1).png', 8),     // 8 frames of dying sequence
};

/** Scenario Pros from the new unified sheet (Estimated 32x32 or 64x64 grid) */
export const SCENARIO_SPRITES = {
    barrel: animSprite('/assets/maps/scenario.png', 0, 0),
    crate: animSprite('/assets/maps/scenario.png', 1, 0),
    barrier: animSprite('/assets/maps/scenario.png', 2, 0),
    fence: animSprite('/assets/maps/scenario.png', 3, 0),
};

/** Particles sheet — each row is a different effect (64x64 cells typically) */
const P_W = 64;
const P_H = 64;
function animRow(row: number, count: number): SpriteDef[] {
    const seq: SpriteDef[] = [];
    for (let i = 0; i < count; i++) {
        seq.push({ sheet: '/particles.png', sx: i * P_W, sy: row * P_H, sw: P_W, sh: P_H });
    }
    return seq;
}

export const PARTICLE_ANIMATIONS = {
    blood: animRow(0, 4),
    dust: animRow(1, 4),
    spark: animRow(2, 4),
    explosion: animRow(3, 4),
    shell: animRow(4, 4),
};

// ─── Utility: draw a sprite onto a canvas context ──────────
export function drawSprite(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    sprite: SpriteDef,
    dx: number, dy: number,
    dw: number, dh: number,
    flipX = false,
    alpha = 1,
): void {
    const img = getImage(sprite.sheet);
    if (!img) return;

    ctx.save();
    if (alpha !== 1) ctx.globalAlpha = alpha;
    if (flipX) {
        ctx.scale(-1, 1);
        ctx.drawImage(img, sprite.sx, sprite.sy, sprite.sw, sprite.sh,
            -(dx + dw), dy, dw, dh);
    } else {
        ctx.drawImage(img, sprite.sx, sprite.sy, sprite.sw, sprite.sh,
            dx, dy, dw, dh);
    }
    ctx.restore();
}

// ─── Canvas pattern cache for terrain tiles ─────────────────
const terrainPatternCache = new Map<string, CanvasPattern>();

export function getTerrainPattern(
    material: string,
    ctx: CanvasRenderingContext2D
): CanvasPattern | null {
    if (terrainPatternCache.has(material)) return terrainPatternCache.get(material)!;
    const sprite = TERRAIN_SPRITES[material];
    const img = sprite ? getImage(sprite.sheet) : null;
    if (!sprite || !img) return null;

    // Bake into an offscreen canvas to crop the exact tile area
    const oc = document.createElement('canvas');
    oc.width = sprite.sw; oc.height = sprite.sh;
    const octx = oc.getContext('2d')!;
    octx.drawImage(img, sprite.sx, sprite.sy, sprite.sw, sprite.sh, 0, 0, sprite.sw, sprite.sh);

    const pattern = ctx.createPattern(oc, 'repeat');
    if (pattern) terrainPatternCache.set(material, pattern);
    return pattern ?? null;
}
