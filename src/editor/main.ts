import './editor.css';
import { MapEditor } from './MapEditor';
import { AssetEditor } from './AssetEditor';
import { ImageLoader } from './ImageLoader';
import { exportMapJSON, exportMapTS, downloadText } from './ExportManager';
import { PolygonType, Material } from '../game/GameMap';
import { trincheiras } from '../game/maps/trincheiras';
import { PRESETS, CATEGORIES } from './Presets';
import { drawThumbnail } from './TerrainTextures';
import { SpritePickerPanel } from './SpritePickerPanel';

// ─────────────────────────────────────────────
// Shared image loader (used by map overlay + asset editor)
// ─────────────────────────────────────────────
const imageLoader = new ImageLoader(() => {
    assetEditor?.renderImageList();
});

// ─────────────────────────────────────────────
// Map Editor setup
// ─────────────────────────────────────────────
const mapCanvas = document.getElementById('map-canvas') as HTMLCanvasElement;
const mapEditor = new MapEditor(mapCanvas, imageLoader);

// Status hooks
mapEditor.onStatusUpdate = (msg) => {
    const coordEl = document.getElementById('status-coords');
    const toolEl = document.getElementById('status-tool');
    if (msg.startsWith('X:')) {
        if (coordEl) coordEl.textContent = msg;
    } else {
        if (toolEl) toolEl.textContent = `Ferramenta: ${msg}`;
    }
};
mapEditor.onCountChange = () => {
    const el = document.getElementById('status-count');
    if (el) el.textContent = `Polígonos: ${mapEditor.polygons.length} | Spawns: ${mapEditor.spawns.length} | Pickups: ${mapEditor.pickups.length}`;
};
mapEditor.onSelectionChange = (poly) => updatePropertiesPanel(poly);

// ─────────────────────────────────────────────
// Asset Editor setup
// ─────────────────────────────────────────────
let assetEditor: AssetEditor | null = null;

// ─────────────────────────────────────────────
// Main tab switching
// ─────────────────────────────────────────────
document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
        const view = (btn as HTMLElement).dataset.view!;
        document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.editor-view').forEach(el => {
            (el as HTMLElement).classList.add('hidden');
        });
        const target = document.getElementById(`view-${view}`);
        target?.classList.remove('hidden');

        if (view === 'asset' && !assetEditor) {
            assetEditor = new AssetEditor(imageLoader);
        }
        if (view === 'map') {
            mapEditor.onResize();
        }
    });
});

// ─────────────────────────────────────────────
// Toolbox
// ─────────────────────────────────────────────
document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mapEditor.setTool((btn as HTMLElement).dataset.tool as any);
    });
});

// Grid controls
const gridSnapCb = document.getElementById('grid-snap') as HTMLInputElement;
gridSnapCb?.addEventListener('change', () => { mapEditor.gridSnap = gridSnapCb.checked; });

const gridSizeIn = document.getElementById('grid-size') as HTMLInputElement;
gridSizeIn?.addEventListener('change', () => { mapEditor.gridSize = Number(gridSizeIn.value) || 20; });

// New polygon options
document.getElementById('new-poly-type')?.addEventListener('change', e => {
    mapEditor.newPolyType = Number((e.target as HTMLSelectElement).value) as PolygonType;
});
document.getElementById('new-poly-material')?.addEventListener('change', e => {
    mapEditor.newPolyMaterial = (e.target as HTMLSelectElement).value as Material;
});
document.getElementById('new-poly-color')?.addEventListener('input', e => {
    mapEditor.newPolyColor = (e.target as HTMLInputElement).value;
});

// Spawn / Pickup / Scenery controls
document.getElementById('spawn-team')?.addEventListener('change', e => {
    mapEditor.spawnTeam = Number((e.target as HTMLSelectElement).value);
});
document.getElementById('pickup-type')?.addEventListener('change', e => {
    mapEditor.pickupTypeStr = (e.target as HTMLSelectElement).value as 'health' | 'grenades';
});
document.getElementById('scenery-type')?.addEventListener('change', e => {
    mapEditor.sceneryTypeStr = (e.target as HTMLSelectElement).value;
});

// Map name & bounds
document.getElementById('map-name')?.addEventListener('input', e => {
    mapEditor.mapName = (e.target as HTMLInputElement).value;
});
(['left', 'top', 'right', 'bottom'] as const).forEach(k => {
    document.getElementById(`bounds-${k}`)?.addEventListener('input', e => {
        mapEditor.bounds[k] = Number((e.target as HTMLInputElement).value) || 0;
    });
});

// Clear and load sample
document.getElementById('btn-clear-map')?.addEventListener('click', () => {
    if (confirm('Limpar todo o mapa?')) mapEditor.clearAll();
});
document.getElementById('btn-load-sample')?.addEventListener('click', () => {
    if (confirm('Carregar mapa de exemplo? Isso irá sobrescrever o mapa atual.')) {
        mapEditor.loadMapData(trincheiras as any);
    }
});

// ─────────────────────────────
// Terrain Brush Controls
// ─────────────────────────────
const brushSizeSlider = document.getElementById('brush-size') as HTMLInputElement;
const brushSizeVal = document.getElementById('brush-size-val')!;
brushSizeSlider?.addEventListener('input', () => {
    const v = Number(brushSizeSlider.value);
    mapEditor.brushSize = v;
    brushSizeVal.textContent = String(v);
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
});

document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const size = Number((btn as HTMLElement).dataset.size);
        mapEditor.brushSize = size;
        if (brushSizeSlider) brushSizeSlider.value = String(size);
        if (brushSizeVal) brushSizeVal.textContent = String(size);
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.querySelectorAll('.terrain-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.terrain-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const m = (btn as HTMLElement).dataset.material as Material;
        mapEditor.brushMaterial = m;
        // Auto-switch to brush tool
        const brushBtn = document.querySelector('[data-tool="BRUSH"]');
        if (brushBtn) {
            document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
            brushBtn.classList.add('active');
            mapEditor.setTool('BRUSH' as any);
        }
    });
});

document.getElementById('brush-poly-type')?.addEventListener('change', e => {
    mapEditor.brushType = Number((e.target as HTMLSelectElement).value) as PolygonType;
});

// ─────────────────────────────
// Preset Gallery
// ─────────────────────────────
let currentPresetCat = 'ground';

function buildPresetGallery(cat: string): void {
    const gallery = document.getElementById('preset-gallery')!;
    const filtered = PRESETS.filter(p => p.category === cat);
    gallery.innerHTML = '';

    for (const preset of filtered) {
        const card = document.createElement('div');
        card.className = 'preset-card';
        card.title = preset.name;

        // Textured thumbnail canvas
        const canvas = document.createElement('canvas');
        canvas.width = 96;
        canvas.height = 44;
        drawThumbnail(canvas, preset.vertices, preset.material, preset.w, preset.h);
        card.appendChild(canvas);

        const label = document.createElement('div');
        label.className = 'preset-card-label';
        label.textContent = preset.name;
        card.appendChild(label);

        card.addEventListener('click', () => {
            // Mark active
            document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            // Activate PLACE_PRESET tool
            mapEditor.setPendingPreset(preset);
            document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        });

        gallery.appendChild(card);
    }
}

function buildPresetCategoryTabs(): void {
    const container = document.getElementById('preset-cat-tabs')!;
    CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'pcat-btn' + (cat.key === currentPresetCat ? ' active' : '');
        btn.textContent = cat.label;
        btn.addEventListener('click', () => {
            currentPresetCat = cat.key;
            container.querySelectorAll('.pcat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            buildPresetGallery(cat.key);
        });
        container.appendChild(btn);
    });
}

// Initialise gallery
buildPresetCategoryTabs();
buildPresetGallery(currentPresetCat);

// ─────────────────────────────────────────────
// Properties Panel
// ─────────────────────────────────────────────
function updatePropertiesPanel(poly: any | null): void {
    const content = document.getElementById('props-content')!;
    if (!poly) {
        content.innerHTML = '<p class="no-selection">Nenhum item selecionado.<br>Use Selecionar e clique em um polígono.</p>';
        return;
    }

    content.innerHTML = `
        <div class="prop-row">
            <label>ID</label>
            <span class="prop-tag" style="background:rgba(124,58,237,0.15);color:#a78bfa">${poly.id.slice(0, 8)}…</span>
        </div>
        <div class="prop-row">
            <label>Tipo</label>
            <select id="prop-type" class="select-sm">
                ${[['0', 'SOLID'], ['1', 'BACKGROUND'], ['2', 'BOUNCY'], ['3', 'DEADLY'], ['4', 'ONLY_BULLETS'], ['5', 'ONLY_PLAYERS'], ['6', 'ONE_WAY']]
            .map(([v, l]) => `<option value="${v}" ${poly.type == v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
        </div>
        <div class="prop-row">
            <label>Material</label>
            <select id="prop-material" class="select-sm">
                ${['dirt', 'rock', 'metal', 'concrete', 'wood', 'grass']
            .map(m => `<option value="${m}" ${poly.material === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
        </div>
        <div class="prop-row">
            <label>Cor</label>
            <input type="color" id="prop-color" value="${poly.color}" class="color-input">
        </div>
        <div class="prop-row">
            <label>Vértices (${poly.vertices.length})</label>
            <table class="vertex-table">
                <thead><tr><th>#</th><th>X</th><th>Y</th></tr></thead>
                <tbody>
                    ${poly.vertices.map((v: any, i: number) => `
                    <tr>
                        <td>${i}</td>
                        <td><input class="vertex-input" data-vi="${i}" data-axis="x" type="number" value="${Math.round(v.x)}"></td>
                        <td><input class="vertex-input" data-vi="${i}" data-axis="y" type="number" value="${Math.round(v.y)}"></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
        <div class="prop-row" style="margin-top:12px">
            <button class="btn-action danger" id="prop-delete">🗑 Deletar Polígono</button>
        </div>
    `;

    document.getElementById('prop-type')?.addEventListener('change', e => {
        mapEditor.updateSelectedPolygon({ type: Number((e.target as HTMLSelectElement).value) as PolygonType });
    });
    document.getElementById('prop-material')?.addEventListener('change', e => {
        mapEditor.updateSelectedPolygon({ material: (e.target as HTMLSelectElement).value as Material });
    });
    document.getElementById('prop-color')?.addEventListener('input', e => {
        mapEditor.updateSelectedPolygon({ color: (e.target as HTMLInputElement).value });
    });
    document.querySelectorAll('.vertex-input').forEach(input => {
        input.addEventListener('change', () => {
            const el = input as HTMLInputElement;
            const vi = Number(el.dataset.vi);
            const axis = el.dataset.axis!;
            const v = mapEditor.getSelectedPolygon()?.vertices[vi];
            if (!v) return;
            const newValue = Number(el.value);
            mapEditor.updateSelectedVertex(vi, axis === 'x' ? newValue : v.x, axis === 'y' ? newValue : v.y);
        });
    });
    document.getElementById('prop-delete')?.addEventListener('click', () => {
        mapEditor.updateSelectedPolygon({});
        const poly = mapEditor.getSelectedPolygon();
        if (poly) {
            mapEditor.polygons.splice(mapEditor.polygons.indexOf(poly), 1);
            mapEditor.onSelectionChange?.(null);
            mapEditor.onCountChange?.();
        }
    });
}

// ─────────────────────────────────────────────
// Export Modal
// ─────────────────────────────────────────────
let exportFormat: 'json' | 'ts' = 'json';

function openExportModal(): void {
    const modal = document.getElementById('export-modal')!;
    const output = document.getElementById('export-output') as HTMLTextAreaElement;
    modal.classList.remove('hidden');
    refreshExportOutput(output);
}

function refreshExportOutput(textarea: HTMLTextAreaElement): void {
    const mapData = mapEditor.toMapData();
    const name = mapEditor.mapName.replace(/\s+/g, '_') || 'myMap';
    textarea.value = exportFormat === 'json' ? exportMapJSON(mapData) : exportMapTS(mapData, name);
}

document.getElementById('btn-export')?.addEventListener('click', openExportModal);
document.getElementById('modal-close')?.addEventListener('click', () => {
    document.getElementById('export-modal')!.classList.add('hidden');
});

document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        exportFormat = (btn as HTMLElement).dataset.format as 'json' | 'ts';
        const output = document.getElementById('export-output') as HTMLTextAreaElement;
        refreshExportOutput(output);
    });
});

document.getElementById('btn-copy-export')?.addEventListener('click', () => {
    const output = document.getElementById('export-output') as HTMLTextAreaElement;
    navigator.clipboard.writeText(output.value);
    const btn = document.getElementById('btn-copy-export')!;
    btn.textContent = '✅ Copiado!';
    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
});

document.getElementById('btn-download-export')?.addEventListener('click', () => {
    const output = document.getElementById('export-output') as HTMLTextAreaElement;
    const ext = exportFormat === 'json' ? 'json' : 'ts';
    downloadText(output.value, `${mapEditor.mapName || 'map'}.${ext}`);
});

document.getElementById('btn-import')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target!.result as string);
                mapEditor.loadMapData(data);
            } catch { alert('Arquivo JSON inválido.'); }
        };
        reader.readAsText(file);
    };
    input.click();
});

// ─────────────────────────────────────────────
// Resize handling
// ─────────────────────────────────────────────
window.addEventListener('resize', () => mapEditor.onResize());

// ─────────────────────────────────────────────
// Keyboard shortcut hints
// ─────────────────────────────────────────────
window.addEventListener('keydown', e => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
    const toolMap: Record<string, string> = {
        's': 'SELECT', 'd': 'DRAW', 'b': 'BRUSH', 'p': 'PAN', 'e': 'ERASE', 't': 'STAMP',
    };
    const tool = toolMap[e.key.toLowerCase()];
    if (tool) {
        if (tool === 'STAMP') {
            // Toggle the sprite picker panel
            spritePickerPanel?.classList.toggle('hidden');
            if (!spritePickerPanel?.classList.contains('hidden')) {
                const btn = document.querySelector('[data-tool="STAMP"]');
                btn?.dispatchEvent(new MouseEvent('click'));
            }
        } else {
            const btn = document.querySelector(`[data-tool="${tool}"]`);
            btn?.dispatchEvent(new MouseEvent('click'));
        }
    }
    if (e.key === ' ') { e.preventDefault(); } // prevent scrolling on space
});
window.addEventListener('keyup', e => {
    if (e.key === ' ') (mapEditor as any)._spaceDown = false;
});

// ─────────────────────────────────────────────
// Sprite Picker Panel
// ─────────────────────────────────────────────
const spritePickerPanel = document.getElementById('sprite-picker-panel');
const spritePickerCanvas = document.getElementById('sprite-picker-canvas') as HTMLCanvasElement;
let spritePicker: SpritePickerPanel | null = null;

if (spritePickerCanvas) {
    spritePicker = new SpritePickerPanel(spritePickerCanvas);

    // When user finalises a selection → activate STAMP tool
    spritePicker.onSelect = (sel) => {
        mapEditor.setPendingStamp(sel);
        // Update info label
        const info = document.getElementById('stamp-sel-info');
        if (info) info.textContent = `${sel.sheet.split('/').pop()}  ${sel.sx},${sel.sy}  ${sel.sw}×${sel.sh}px`;
        // Sync active tool button
        document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-tool="STAMP"]')?.classList.add('active');
    };
}

// Open picker when STAMP tool button clicked
document.querySelector('[data-tool="STAMP"]')?.addEventListener('click', () => {
    spritePickerPanel?.classList.remove('hidden');
});

// Close button
document.getElementById('sprite-picker-close')?.addEventListener('click', () => {
    spritePickerPanel?.classList.add('hidden');
});

// Sheet tabs
document.querySelectorAll('.ssheet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.ssheet-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        spritePicker?.setSheet((btn as HTMLElement).dataset.sheet!);
    });
});

// Stamp size slider
const stampSizeSlider = document.getElementById('stamp-size') as HTMLInputElement;
const stampSizeVal = document.getElementById('stamp-size-val');
stampSizeSlider?.addEventListener('input', () => {
    const v = Number(stampSizeSlider.value);
    if (stampSizeVal) stampSizeVal.textContent = String(v);
    mapEditor.stampScale = v / 64; // 64 = baseline
    // Reapply to current pending stamp
    (mapEditor as any).stampW = v;
    (mapEditor as any).stampH = v;
});

// Opacity slider
const stampOpacitySlider = document.getElementById('stamp-opacity') as HTMLInputElement;
const stampOpacityVal = document.getElementById('stamp-opacity-val');
stampOpacitySlider?.addEventListener('input', () => {
    const v = Number(stampOpacitySlider.value);
    if (stampOpacityVal) stampOpacityVal.textContent = String(v);
    mapEditor.stampOpacity = v / 100;
});

// Z-index buttons
document.getElementById('stamp-z-behind')?.addEventListener('click', () => {
    mapEditor.stampZIndex = -1;
    document.getElementById('stamp-z-behind')?.classList.add('active');
    document.getElementById('stamp-z-front')?.classList.remove('active');
});
document.getElementById('stamp-z-front')?.addEventListener('click', () => {
    mapEditor.stampZIndex = 0;
    document.getElementById('stamp-z-front')?.classList.add('active');
    document.getElementById('stamp-z-behind')?.classList.remove('active');
});
