import { GostekPreview, GostekConfig } from './GostekPreview';
import { WeaponPreview } from './WeaponPreview';
import { ImageLoader, RefImage } from './ImageLoader';
import { exportGostekConfig, downloadText } from './ExportManager';
import { WEAPONS } from '../game/Weapon';

export class AssetEditor {
    private gostekPreview: GostekPreview;
    private weaponPreview: WeaponPreview;
    private imageLoader: ImageLoader;
    private currentAssetTab = 'character';
    private selectedWeaponIdx = 0;

    // Pixel Editor State
    private pxCanvas: HTMLCanvasElement | null = null;
    private pxCtx: CanvasRenderingContext2D | null = null;
    private pxSize = 64; // Increased from 32 to 64 for "High Definition" pixel art
    private pxData: string[][] = [];
    private pxColor = '#6ee7b7';
    private pxTool: 'pencil' | 'eraser' | 'bucket' = 'pencil';
    private isPxDrawing = false;
    private pxPalette = [
        '#000000', '#1a1a1a', '#333333', '#666666', '#999999', '#ffffff',
        '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
        '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#4b2c20', '#2d5a27'
    ];
    private customAssets: Record<string, string> = {}; // id -> dataUrl

    constructor(imageLoader: ImageLoader) {
        this.imageLoader = imageLoader;

        this.gostekPreview = new GostekPreview(
            document.getElementById('gostek-canvas') as HTMLCanvasElement
        );
        this.weaponPreview = new WeaponPreview(
            document.getElementById('weapon-canvas') as HTMLCanvasElement
        );

        this.bindCharacterTab();
        this.bindWeaponTab();
        this.bindItemTab();
        this.bindReferenceTab();
        this.bindAssetTabSwitching();
        this.buildWeaponList();
        this.renderItemPreview();
        this.initPixelEditor();
        this.applyDefaultHDAssets();

        // Initial export preview
        this.refreshExportPreview();
    }

    // ──────────────────────────────────────────
    // Tab switching
    // ──────────────────────────────────────────
    private bindAssetTabSwitching(): void {
        document.querySelectorAll('[data-asset-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = (e.currentTarget as HTMLElement).dataset.assetTab!;
                this.switchAssetTab(tab);
            });
        });
    }

    switchAssetTab(tab: string): void {
        this.currentAssetTab = tab;
        document.querySelectorAll('.asset-tab').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('active');
        });
        document.querySelectorAll('[data-asset-tab]').forEach(btn => btn.classList.remove('active'));
        const target = document.getElementById(`asset-${tab}`);
        const btn = document.querySelector(`[data-asset-tab="${tab}"]`);
        target?.classList.remove('hidden');
        target?.classList.add('active');
        btn?.classList.add('active');
        this.refreshExportPreview();
    }

    // ──────────────────────────────────────────
    // Character Tab
    // ──────────────────────────────────────────
    private bindCharacterTab(): void {
        const colorIds: (keyof GostekConfig)[] = ['skinColor', 'shirtColor', 'pantsColor', 'bootColor', 'headgearColor'];
        const inputIds = ['c-skin', 'c-shirt', 'c-pants', 'c-boots', 'c-headgear'];

        const update = () => {
            const cfg: GostekConfig = {
                skinColor: (document.getElementById('c-skin') as HTMLInputElement).value,
                shirtColor: (document.getElementById('c-shirt') as HTMLInputElement).value,
                pantsColor: (document.getElementById('c-pants') as HTMLInputElement).value,
                bootColor: (document.getElementById('c-boots') as HTMLInputElement).value,
                headgearColor: (document.getElementById('c-headgear') as HTMLInputElement).value,
            };
            this.gostekPreview.setConfig(cfg);
            this.refreshExportPreview();
        };

        inputIds.forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.updateCharacterPreview());
        });

        const speedSlider = document.getElementById('gostek-speed') as HTMLInputElement;
        speedSlider?.addEventListener('input', () => {
            const v = Number(speedSlider.value);
            document.getElementById('gostek-speed-val')!.textContent = String(v);
            this.gostekPreview.setWalkSpeed(v);
        });

        const aimSlider = document.getElementById('gostek-aim') as HTMLInputElement;
        aimSlider?.addEventListener('input', () => {
            this.gostekPreview.setAimDeg(Number(aimSlider.value));
        });

        const crouchCb = document.getElementById('gostek-crouch') as HTMLInputElement;
        crouchCb?.addEventListener('change', () => {
            this.gostekPreview.setCrouching(crouchCb.checked);
        });

        const weaponSel = document.getElementById('gostek-weapon') as HTMLSelectElement;
        weaponSel?.addEventListener('change', () => {
            this.gostekPreview.setWeapon(weaponSel.value);
        });

        document.getElementById('btn-export-gostek')?.addEventListener('click', () => {
            const cfg = {
                skinColor: (document.getElementById('c-skin') as HTMLInputElement).value,
                shirtColor: (document.getElementById('c-shirt') as HTMLInputElement).value,
                pantsColor: (document.getElementById('c-pants') as HTMLInputElement).value,
                bootColor: (document.getElementById('c-boots') as HTMLInputElement).value,
                headgearColor: (document.getElementById('c-headgear') as HTMLInputElement).value,
            };
            downloadText(exportGostekConfig(cfg), 'gostek-config.json');
        });
    }

    // ──────────────────────────────────────────
    // Weapon Tab
    // ──────────────────────────────────────────
    private buildWeaponList(): void {
        const list = document.getElementById('weapon-list')!;
        list.innerHTML = '';
        WEAPONS.forEach((w, i) => {
            const btn = document.createElement('button');
            btn.className = 'weapon-btn' + (i === 0 ? ' active' : '');
            btn.textContent = w.name;
            btn.addEventListener('click', () => {
                list.querySelectorAll('.weapon-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectWeapon(i);
            });
            list.appendChild(btn);
        });
        this.selectWeapon(0);
    }

    private selectWeapon(idx: number): void {
        this.selectedWeaponIdx = idx;
        const w = WEAPONS[idx];
        const custom = this.customAssets[`weapon_${w.name}`];
        this.weaponPreview.setWeapon({ name: w.name, customSprite: custom });
        this.refreshExportPreview();
    }

    private bindWeaponTab(): void {
        const lengthSl = document.getElementById('w-length') as HTMLInputElement;
        const heightSl = document.getElementById('w-height') as HTMLInputElement;
        const colorIn = document.getElementById('w-color') as HTMLInputElement;
        const handleIn = document.getElementById('w-handle') as HTMLInputElement;

        const update = () => {
            document.getElementById('w-length-val')!.textContent = lengthSl.value;
            document.getElementById('w-height-val')!.textContent = heightSl.value;
            this.weaponPreview.setWeapon({
                length: Number(lengthSl.value),
                height: Number(heightSl.value),
                color: colorIn.value,
                handleColor: handleIn.value,
            });
        };

        [lengthSl, heightSl, colorIn, handleIn].forEach(el => el?.addEventListener('input', update));
    }

    // ──────────────────────────────────────────
    // Item Tab
    // ──────────────────────────────────────────
    private bindItemTab(): void {
        document.querySelectorAll('.item-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                document.querySelectorAll('.item-btn').forEach(b => b.classList.remove('active'));
                (e.currentTarget as HTMLElement).classList.add('active');
                this.renderItemPreview();
            });
        });

        document.getElementById('item-color')?.addEventListener('input', () => this.renderItemPreview());
    }

    private renderItemPreview(): void {
        const canvas = document.getElementById('item-canvas') as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        const activeBtn = document.querySelector('.item-btn.active') as HTMLElement;
        const type = activeBtn?.dataset.item ?? 'health';
        const color = (document.getElementById('item-color') as HTMLInputElement)?.value ?? '#44ff88';
        const custom = this.customAssets[`item_${type}`];

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2, cy = canvas.height / 2;

        if (custom) {
            const img = new Image();
            img.src = custom;
            img.onload = () => {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, cx - 32, cy - 32, 64, 64);
            };
        } else if (type === 'health') {
            // Red cross
            ctx.fillStyle = color;
            ctx.fillRect(cx - 6, cy - 20, 12, 40);
            ctx.fillRect(cx - 20, cy - 6, 40, 12);
            // Glow
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
            ctx.fillRect(cx - 6, cy - 20, 12, 40);
            ctx.shadowBlur = 0;
        } else {
            // Grenade
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 4, 12, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#777';
            ctx.fillRect(cx - 4, cy - 18, 8, 10);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(cx, cy - 22, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(type.toUpperCase(), cx, cy + 52);
    }

    // ──────────────────────────────────────────
    // Reference Image Tab
    // ──────────────────────────────────────────
    private bindReferenceTab(): void {
        const dropZone = document.getElementById('img-drop-zone')!;
        const fileInput = document.getElementById('img-file-input') as HTMLInputElement;

        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files) {
                this.imageLoader.loadFiles(fileInput.files);
                fileInput.value = '';
            }
        });

        dropZone.addEventListener('dragover', e => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer?.files) this.imageLoader.loadFiles(e.dataTransfer.files);
        });

        // Listen for changes from imageLoader to rebuild UI
        this.renderImageList();
    }

    renderImageList(): void {
        const list = document.getElementById('img-list')!;
        const images = this.imageLoader.getImages();

        if (images.length === 0) {
            list.innerHTML = '<p class="no-selection">Nenhuma imagem carregada.</p>';
            return;
        }

        list.innerHTML = '';
        for (const img of images) {
            list.appendChild(this.buildImageItem(img));
        }
    }

    private buildImageItem(img: RefImage): HTMLElement {
        const div = document.createElement('div');
        div.className = 'img-item';
        div.innerHTML = `
            <div class="img-item-header">
                <span class="img-item-name">${img.name}</span>
                <button class="btn-remove" data-id="${img.id}">✕</button>
            </div>
            <div class="img-item-controls">
                <div class="img-ctrl-row">
                    <span style="width:56px">Opacidade</span>
                    <input type="range" min="0" max="1" step="0.05" value="${img.opacity}" data-prop="opacity">
                    <span>${Math.round(img.opacity * 100)}%</span>
                </div>
                <div class="img-ctrl-row">
                    <span style="width:56px">Escala</span>
                    <input type="range" min="0.1" max="5" step="0.1" value="${img.scale}" data-prop="scale">
                    <span>${img.scale.toFixed(1)}×</span>
                </div>
                <div class="img-ctrl-row">
                    <span style="width:56px">Visível</span>
                    <input type="checkbox" ${img.visible ? 'checked' : ''} data-prop="visible">
                </div>
            </div>
        `;

        div.querySelector('.btn-remove')?.addEventListener('click', () => {
            this.imageLoader.remove(img.id);
            this.renderImageList();
        });

        div.querySelectorAll('input[data-prop]').forEach(inputEl => {
            const input = inputEl as HTMLInputElement;
            input.addEventListener('input', () => {
                const prop = (input as HTMLElement).dataset.prop!;
                let value: any;
                if (input.type === 'checkbox') {
                    value = (input as HTMLInputElement).checked;
                } else if (input.type === 'range') {
                    value = Number((input as HTMLInputElement).value);
                }
                this.imageLoader.update(img.id, { [prop]: value });
                // Update span next to slider
                const span = input.nextElementSibling as HTMLElement;
                if (span && prop === 'opacity') span.textContent = `${Math.round(value * 100)}%`;
                if (span && prop === 'scale') span.textContent = `${Number(value).toFixed(1)}×`;
            });
        });

        return div;
    }

    // ──────────────────────────────────────────
    // Export preview (right sidebar)
    // ──────────────────────────────────────────
    private refreshExportPreview(): void {
        const preview = document.getElementById('asset-export-preview');
        if (!preview) return;

        let data: any = {};
        if (this.currentAssetTab === 'character') {
            data = {
                skinColor: (document.getElementById('c-skin') as HTMLInputElement)?.value,
                shirtColor: (document.getElementById('c-shirt') as HTMLInputElement)?.value,
                pantsColor: (document.getElementById('c-pants') as HTMLInputElement)?.value,
                bootColor: (document.getElementById('c-boots') as HTMLInputElement)?.value,
                headgearColor: (document.getElementById('c-headgear') as HTMLInputElement)?.value,
            };
        } else if (this.currentAssetTab === 'weapon') {
            const w = WEAPONS[this.selectedWeaponIdx];
            data = { name: w.name, damage: w.damage, fireRate: w.fireRate, bulletSpeed: w.bulletSpeed };
        }

        preview.textContent = JSON.stringify(data, null, 2);
    }

    // ──────────────────────────────────────────
    // Pixel Editor Logic
    // ──────────────────────────────────────────
    private initPixelEditor(): void {
        this.pxCanvas = document.getElementById('pixel-canvas') as HTMLCanvasElement;
        if (!this.pxCanvas) return;
        this.pxCtx = this.pxCanvas.getContext('2d')!;
        this.clearPixelData();

        // Build palette
        const paletteContainer = document.getElementById('px-palette')!;
        this.pxPalette.forEach(c => {
            const s = document.createElement('div');
            s.className = 'px-color-swatch';
            s.style.backgroundColor = c;
            if (c === this.pxColor) s.classList.add('active');
            s.addEventListener('click', () => {
                this.pxColor = c;
                paletteContainer.querySelectorAll('.px-color-swatch').forEach(el => el.classList.remove('active'));
                s.classList.add('active');
            });
            paletteContainer.appendChild(s);
        });

        // Custom color
        document.getElementById('px-color-custom')?.addEventListener('input', (e) => {
            this.pxColor = (e.target as HTMLInputElement).value;
            paletteContainer.querySelectorAll('.px-color-swatch').forEach(el => el.classList.remove('active'));
        });

        // Tool binding
        ['pencil', 'eraser', 'bucket'].forEach(tool => {
            const btn = document.getElementById(`px-tool-${tool}`);
            btn?.addEventListener('click', () => {
                this.pxTool = tool as any;
                document.querySelectorAll('.pixel-tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Fill targets in select
        const weaponGroup = document.getElementById('px-target-weapons')!;
        WEAPONS.forEach(w => {
            const opt = document.createElement('option');
            opt.value = `weapon_${w.name}`;
            opt.textContent = w.name;
            weaponGroup.appendChild(opt);
        });
        const itemGroup = document.getElementById('px-target-items')!;
        ['health', 'grenades'].forEach(i => {
            const opt = document.createElement('option');
            opt.value = `item_${i}`;
            opt.textContent = i === 'health' ? 'Saúde' : 'Granadas';
            itemGroup.appendChild(opt);
        });
        const charGroup = document.createElement('optgroup');
        charGroup.label = 'Personagem';
        ['head', 'torso', 'arm', 'leg', 'boot', 'headgear'].forEach(p => {
            const opt = document.createElement('option');
            opt.value = `char_${p}`;
            opt.textContent = p.charAt(0).toUpperCase() + p.slice(1);
            charGroup.appendChild(opt);
        });
        document.getElementById('px-assign-target')?.appendChild(charGroup);

        // Interaction
        this.pxCanvas.addEventListener('mousedown', (e) => {
            this.isPxDrawing = true;
            this.drawPixel(e);
        });
        this.pxCanvas.addEventListener('mousemove', (e) => {
            if (this.isPxDrawing) this.drawPixel(e);
        });
        window.addEventListener('mouseup', () => this.isPxDrawing = false);

        document.getElementById('btn-clear-pixel')?.addEventListener('click', () => {
            this.clearPixelData();
            this.renderPixelCanvas();
        });

        document.getElementById('btn-apply-pixel')?.addEventListener('click', () => {
            const target = (document.getElementById('px-assign-target') as HTMLSelectElement).value;
            if (target === 'none') {
                alert('Selecione um asset para atribuir esta arte.');
                return;
            }
            this.customAssets[target] = this.pxCanvas!.toDataURL();
            if (target.startsWith('weapon_')) this.selectWeapon(this.selectedWeaponIdx);
            if (target.startsWith('item_')) this.renderItemPreview();
            if (target.startsWith('char_')) this.updateCharacterPreview();
            alert('Arte aplicada com sucesso!');
        });

        document.getElementById('px-tool-load')?.addEventListener('click', () => {
            this.loadCurrentToPixelEditor();
        });

        const resIn = document.getElementById('px-resolution') as HTMLSelectElement;
        resIn?.addEventListener('change', () => {
            if (confirm('Mudar a resolução irá limpar o desenho atual. Continuar?')) {
                this.pxSize = Number(resIn.value);
                const grid = document.getElementById('pixel-grid');
                if (grid) grid.style.backgroundSize = `${512 / this.pxSize}px ${512 / this.pxSize}px`;
                this.clearPixelData();
                this.renderPixelCanvas();
                const info = document.querySelector('.pixel-info');
                if (info) info.textContent = `Tamanho: ${this.pxSize}x${this.pxSize} | Clique/Arraste para desenhar`;
            } else {
                resIn.value = String(this.pxSize);
            }
        });

        this.renderPixelCanvas();
    }

    private updateCharacterPreview(): void {
        const cfg: GostekConfig = {
            skinColor: (document.getElementById('c-skin') as HTMLInputElement).value,
            shirtColor: (document.getElementById('c-shirt') as HTMLInputElement).value,
            pantsColor: (document.getElementById('c-pants') as HTMLInputElement).value,
            bootColor: (document.getElementById('c-boots') as HTMLInputElement).value,
            headgearColor: (document.getElementById('c-headgear') as HTMLInputElement).value,
        };
        const charSprites: Record<string, string> = {};
        Object.keys(this.customAssets).forEach(k => {
            if (k.startsWith('char_')) {
                charSprites[k.replace('char_', '')] = this.customAssets[k];
            }
        });
        console.log('Updating Gostek with sprites:', Object.keys(charSprites));
        this.gostekPreview.setConfig(cfg, charSprites);
        this.refreshExportPreview();
    }

    private loadCurrentToPixelEditor(): void {
        const target = (document.getElementById('px-assign-target') as HTMLSelectElement).value;
        if (target === 'none') return;

        const current = this.customAssets[target];
        if (current) {
            const img = new Image();
            img.src = current;
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.pxSize;
                tempCanvas.height = this.pxSize;
                const tCtx = tempCanvas.getContext('2d')!;
                tCtx.drawImage(img, 0, 0, this.pxSize, this.pxSize);
                const imageData = tCtx.getImageData(0, 0, this.pxSize, this.pxSize).data;

                this.clearPixelData();
                for (let i = 0; i < imageData.length; i += 4) {
                    const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2], a = imageData[i + 3];
                    if (a > 10) {
                        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                        const pxIdx = i / 4;
                        const x = pxIdx % this.pxSize;
                        const y = Math.floor(pxIdx / this.pxSize);
                        this.pxData[y][x] = hex;
                    }
                }
                this.renderPixelCanvas();
            };
        } else {
            // If no custom asset, use a silhouette or basic shape representation
            this.clearPixelData();
            const cx = this.pxSize / 2, cy = this.pxSize / 2;
            const s = this.pxSize / 64; // Scale factor

            if (target.includes('head')) {
                // Detailed Head/Helmet
                this.fillCircleShaded(cx, cy, 14 * s, '#e8b88a', '#d0a070'); // Face
                this.fillRectShaded(cx - 16 * s, cy - 18 * s, 32 * s, 10 * s, '#4a7c4f', '#3a663e'); // Helmet
                this.fillRect(cx + 6 * s, cy - 2 * s, 4 * s, 4 * s, '#222'); // Eye (HD)
                this.fillRect(cx + 8 * s, cy - 1 * s, 1 * s, 1 * s, '#fff'); // Eye highlight
            } else if (target.includes('torso')) {
                // Tactical Vest
                this.fillRectShaded(cx - 12 * s, cy - 20 * s, 24 * s, 40 * s, '#4a7c4f', '#3a663e');
                this.fillRect(cx - 8 * s, cy - 10 * s, 16 * s, 4 * s, '#3d5c3e'); // Pocket 1
                this.fillRect(cx - 8 * s, cy + 2 * s, 16 * s, 4 * s, '#3d5c3e'); // Pocket 2
                this.fillRect(cx - 10 * s, cy - 18 * s, 4 * s, 36 * s, 'rgba(0,0,0,0.1)'); // Left edge shadow
            } else if (target.includes('arm')) {
                // Arm with muscle shading
                this.fillRectShaded(cx - 6 * s, cy - 15 * s, 12 * s, 30 * s, '#e8b88a', '#d0a070');
                this.fillRect(cx - 2 * s, cy - 10 * s, 1 * s, 20 * s, 'rgba(255,255,255,0.2)'); // Highlight
            } else if (target.includes('leg')) {
                // Pant leg with folds
                this.fillRectShaded(cx - 8 * s, cy - 15 * s, 16 * s, 30 * s, '#3d5c3e', '#2d4a2e');
                this.fillRect(cx - 2 * s, cy, 10 * s, 2 * s, 'rgba(0,0,0,0.15)'); // Fold line
            } else if (target.includes('boot')) {
                // Tactical boot
                this.fillRectShaded(cx - 10 * s, cy - 8 * s, 20 * s, 16 * s, '#2a2a2a', '#1a1a1a');
                this.fillRect(cx - 10 * s, cy + 5 * s, 20 * s, 3 * s, '#111'); // Sole
            } else if (target.startsWith('weapon_')) {
                // High Detail Weapon Silhouettes based on guns.png
                this.fillRectShaded(cx - 25 * s, cy - 4 * s, 50 * s, 8 * s, '#444', '#333'); // Default Barrel

                if (target.includes('Desert Eagles')) {
                    this.fillRectShaded(cx - 8 * s, cy - 10 * s, 24 * s, 10 * s, '#999', '#666'); // Slide
                    this.fillRectShaded(cx - 10 * s, cy, 10 * s, 18 * s, '#333', '#111'); // Handle
                    this.fillRect(cx + 4 * s, cy - 8 * s, 12 * s, 2 * s, '#666'); // Highlight
                } else if (target.includes('MP5')) {
                    this.fillRectShaded(cx - 15 * s, cy - 8 * s, 30 * s, 10 * s, '#3a3a3a', '#222'); // Receiver
                    this.fillRectShaded(cx - 28 * s, cy - 8 * s, 14 * s, 6 * s, '#222', '#111'); // Stock
                    this.fillRectShaded(cx + 15 * s, cy - 6 * s, 18 * s, 6 * s, '#222', '#111'); // Silencer
                    this.fillRectShaded(cx - 2 * s, cy + 2 * s, 6 * s, 14 * s, '#333', '#222'); // Handle
                    this.fillRect(cx + 4 * s, cy + 4 * s, 4 * s, 16 * s, '#222'); // Mag
                } else if (target.includes('Ak-74')) {
                    this.fillRectShaded(cx - 10 * s, cy - 8 * s, 35 * s, 10 * s, '#333', '#222'); // Metal body
                    this.fillRectShaded(cx - 28 * s, cy - 8 * s, 18 * s, 10 * s, '#8b4513', '#5d2e0d'); // Wood stock
                    this.fillRectShaded(cx + 5 * s, cy - 4 * s, 18 * s, 6 * s, '#8b4513', '#5d2e0d'); // Wood handguard
                    this.fillRectShaded(cx + 25 * s, cy - 4 * s, 10 * s, 2 * s, '#222', '#000'); // Barrel tip
                    this.fillRectShaded(cx + 8 * s, cy + 2 * s, 6 * s, 18 * s, '#a0522d', '#8b4513'); // Mag
                } else if (target.includes('AUG')) {
                    this.fillRectShaded(cx - 25 * s, cy - 12 * s, 40 * s, 18 * s, '#556b2f', '#425b20'); // Tactical body
                    this.fillRectShaded(cx + 5 * s, cy - 16 * s, 12 * s, 4 * s, '#222', '#111'); // Integrated scope
                    this.fillRectShaded(cx + 15 * s, cy - 4 * s, 20 * s, 3 * s, '#333', '#222'); // Barrel
                    this.fillRectShaded(cx - 8 * s, cy + 6 * s, 8 * s, 14 * s, 'rgba(255,255,255,0.2)', 'transparent'); // Mag
                } else if (target.includes('Ruger') || target.includes('Sniper') || target.includes('Barrett')) {
                    this.fillRectShaded(cx - 32 * s, cy - 8 * s, 30 * s, 10 * s, '#2d4a2e', '#1e331f'); // Green stock
                    this.fillRectShaded(cx - 5 * s, cy - 6 * s, 50 * s, 4 * s, '#222', '#111'); // Long barrel
                    this.fillRectShaded(cx - 5 * s, cy - 14 * s, 18 * s, 6 * s, '#222', '#111'); // Scope
                    this.fillRect(cx + 35 * s, cy - 2 * s, 4 * s, 8 * s, '#333'); // Bipod
                } else if (target.includes('LAW') || target.includes('Rocket')) {
                    this.fillRectShaded(cx - 30 * s, cy - 10 * s, 60 * s, 14 * s, '#4a7c4f', '#3a663e'); // Tube
                    this.fillRectShaded(cx - 10 * s, cy + 4 * s, 6 * s, 12 * s, '#3a3a3a', '#222'); // Handle
                } else if (target.includes('M79')) {
                    this.fillRectShaded(cx - 15 * s, cy - 4 * s, 25 * s, 10 * s, '#333', '#222'); // Barrel
                    this.fillRectShaded(cx - 28 * s, cy - 4 * s, 15 * s, 8 * s, '#8b4513', '#5d2e0d'); // Stock
                } else if (target.includes('Minigun')) {
                    this.fillRectShaded(cx + 5 * s, cy - 8 * s, 35 * s, 14 * s, '#444', '#222'); // Barrels
                    this.fillRectShaded(cx - 25 * s, cy - 12 * s, 30 * s, 20 * s, '#333', '#111'); // Motor
                } else if (target.includes('Chainsaw')) {
                    this.fillRectShaded(cx - 25 * s, cy - 12 * s, 25 * s, 25 * s, '#ff8c00', '#cc7000'); // Orange body
                    this.fillRectShaded(cx, cy - 4 * s, 40 * s, 10 * s, '#999', '#666'); // Saw blade
                }
            } else {
                this.fillRectShaded(cx - 10 * s, cy - 10 * s, 20 * s, 20 * s, '#666', '#444');
            }
            this.renderPixelCanvas();
        }
    }

    private fillRectShaded(x: number, y: number, w: number, h: number, color: string, shade: string): void {
        this.fillRect(x, y, w, h, color);
        // Add subtle shading on right and bottom
        this.fillRect(x + w - (w > 4 ? 2 : 1), y, (w > 4 ? 2 : 1), h, shade);
        this.fillRect(x, y + h - (h > 4 ? 2 : 1), w, (h > 4 ? 2 : 1), shade);
    }

    private fillCircleShaded(cx: number, cy: number, r: number, color: string, shade: string): void {
        this.fillCircle(cx, cy, r, color);
        // Very simple crescent shadow
        for (let j = 0; j < this.pxSize; j++) {
            for (let i = 0; i < this.pxSize; i++) {
                const dist = Math.sqrt((i - cx) ** 2 + (j - cy) ** 2);
                if (dist <= r && dist > r * 0.7 && (i > cx || j > cy)) {
                    this.pxData[j][i] = shade;
                }
            }
        }
    }

    private fillRect(x: number, y: number, w: number, h: number, color: string): void {
        for (let j = y; j < y + h; j++) {
            for (let i = x; i < x + w; i++) {
                if (i >= 0 && i < this.pxSize && j >= 0 && j < this.pxSize) {
                    this.pxData[j][i] = color;
                }
            }
        }
    }

    private fillCircle(cx: number, cy: number, r: number, color: string): void {
        for (let j = 0; j < this.pxSize; j++) {
            for (let i = 0; i < this.pxSize; i++) {
                const dist = Math.sqrt((i - cx) ** 2 + (j - cy) ** 2);
                if (dist <= r) this.pxData[j][i] = color;
            }
        }
    }

    private applyDefaultHDAssets(): void {
        const targets = [
            'char_head', 'char_torso', 'char_arm', 'char_leg', 'char_boot', 'char_headgear',
            ...WEAPONS.map(w => `weapon_${w.name}`),
            'item_health', 'item_grenades'
        ];

        targets.forEach(target => {
            // Setup target in select so loadCurrent works
            const select = document.getElementById('px-assign-target') as HTMLSelectElement;
            if (select) select.value = target;

            this.loadCurrentToPixelEditor();
            this.customAssets[target] = this.pxCanvas!.toDataURL();
        });

        // Reset UI
        const select = document.getElementById('px-assign-target') as HTMLSelectElement;
        if (select) select.value = 'none';
        this.clearPixelData();
        this.renderPixelCanvas();

        // Refresh previews
        this.selectWeapon(this.selectedWeaponIdx);
        this.updateCharacterPreview();
        this.renderItemPreview();
    }

    private clearPixelData(): void {
        this.pxData = Array(this.pxSize).fill(null).map(() => Array(this.pxSize).fill('transparent'));
    }

    private drawPixel(e: MouseEvent): void {
        if (!this.pxCanvas) return;
        const rect = this.pxCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / (rect.width / this.pxSize));
        const y = Math.floor((e.clientY - rect.top) / (rect.height / this.pxSize));

        if (x >= 0 && x < this.pxSize && y >= 0 && y < this.pxSize) {
            if (this.pxTool === 'pencil') this.pxData[y][x] = this.pxColor;
            else if (this.pxTool === 'eraser') this.pxData[y][x] = 'transparent';
            else if (this.pxTool === 'bucket') this.floodFill(x, y, this.pxData[y][x], this.pxColor);
            this.renderPixelCanvas();
        }
    }

    private floodFill(startX: number, startY: number, target: string, replacement: string): void {
        if (target === replacement) return;
        const stack = [[startX, startY]];
        while (stack.length > 0) {
            const [x, y] = stack.pop()!;
            if (this.pxData[y][x] === target) {
                this.pxData[y][x] = replacement;
                if (x > 0) stack.push([x - 1, y]);
                if (x < this.pxSize - 1) stack.push([x + 1, y]);
                if (y > 0) stack.push([x, y - 1]);
                if (y < this.pxSize - 1) stack.push([x, y + 1]);
            }
        }
    }

    private renderPixelCanvas(): void {
        if (!this.pxCtx || !this.pxCanvas) return;
        this.pxCtx.clearRect(0, 0, this.pxCanvas.width, this.pxCanvas.height);
        const pSize = this.pxCanvas.width / this.pxSize;

        for (let y = 0; y < this.pxSize; y++) {
            for (let x = 0; x < this.pxSize; x++) {
                const color = this.pxData[y][x];
                if (color !== 'transparent') {
                    this.pxCtx.fillStyle = color;
                    this.pxCtx.fillRect(x * pSize, y * pSize, pSize, pSize);
                }
            }
        }
    }
}
