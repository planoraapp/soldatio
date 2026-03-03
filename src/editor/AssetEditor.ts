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
            document.getElementById(id)?.addEventListener('input', update);
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
        this.weaponPreview.setWeapon({ name: w.name });
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

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2, cy = canvas.height / 2;

        if (type === 'health') {
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

        div.querySelectorAll('input[data-prop]').forEach(input => {
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
}
