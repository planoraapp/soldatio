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
        loadImage('/terrain.png'),
        loadImage('/char.png'),
        loadImage('/guns.png'),
        loadImage('/items.png'),
        loadImage('/particles.png'),
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
    dirt: { sheet: '/terrain.png', sx: 0, sy: 0 * T_BAND + 2, sw: T_W, sh: T_H },
    grass: { sheet: '/terrain.png', sx: 0, sy: 1 * T_BAND + 2, sw: T_W, sh: T_H },
    rock: { sheet: '/terrain.png', sx: 0, sy: 2 * T_BAND + 2, sw: T_W, sh: T_H },
    concrete: { sheet: '/terrain.png', sx: 0, sy: 3 * T_BAND + 2, sw: T_W, sh: T_H },
    wood: { sheet: '/terrain.png', sx: 0, sy: 4 * T_BAND + 2, sw: T_W, sh: T_H },
    metal: { sheet: '/terrain.png', sx: 0, sy: 5 * T_BAND + 2, sw: T_W, sh: T_H },
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
    return { sheet: '/guns.png', sx: 0, sy: row * G_RH, sw: G_W, sh: G_RH };
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
    return { sheet: '/items.png', sx: col * I_CW, sy: row * I_CH, sw: I_CW, sh: I_CH };
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
        sheet: '/particles.png',
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
