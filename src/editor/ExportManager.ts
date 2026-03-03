import { MapData, PolygonType, Material } from '../game/GameMap';

/** Serialises MapData to a beautified JSON string */
export function exportMapJSON(data: MapData): string {
    // Convert Vector2 instances to plain objects for JSON
    const plain = deepPlain(data);
    return JSON.stringify(plain, null, 2);
}

/** Serialises MapData to a TypeScript module string ready to paste into src/game/maps/ */
export function exportMapTS(data: MapData, varName: string = 'myMap'): string {
    const json = exportMapJSON(data);
    return `import { MapData, PolygonType, Material, PickupType } from '../GameMap';\n\nexport const ${varName}: MapData = ${json};\n`;
}

/** Exports a Gostek color config as JSON */
export function exportGostekConfig(cfg: Record<string, string>): string {
    return JSON.stringify(cfg, null, 2);
}

/** Triggers a browser download of a text file */
export function downloadText(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Deep-converts class instances (Vector2) to plain-object equivalents */
function deepPlain(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(deepPlain);
    if (typeof obj === 'object') {
        const out: any = {};
        for (const key of Object.keys(obj)) {
            out[key] = deepPlain(obj[key]);
        }
        return out;
    }
    return obj;
}
