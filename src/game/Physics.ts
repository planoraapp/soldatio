import { Vector2 } from '../engine/Vector2';
import { MapPolygon, PolygonType } from './GameMap';

/**
 * Circle-vs-polygon collision result.
 */
export interface CollisionResult {
    collided: boolean;
    /** Penetration normal (points outward from polygon) */
    normal: Vector2;
    /** Penetration depth */
    depth: number;
    /** Type of polygon hit */
    polyType: PolygonType;
}

/**
 * Raycast hit result.
 */
export interface RaycastHit {
    hit: boolean;
    point: Vector2;
    normal: Vector2;
    distance: number;
    polygon: MapPolygon | null;
}

/**
 * Test if a circle collides with a convex polygon.
 * Returns collision info with separation normal and depth.
 */
export function circleVsPolygon(
    circlePos: Vector2,
    radius: number,
    polygon: Vector2[]
): { collided: boolean; normal: Vector2; depth: number } {
    if (polygon.length < 3) return { collided: false, normal: Vector2.zero(), depth: 0 };

    let minDepth = Infinity;
    let bestNormal = Vector2.zero();

    // Test each edge normal
    for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        const edge = b.sub(a);
        const normal = new Vector2(-edge.y, edge.x).normalize();

        // Project polygon onto normal
        let minPoly = Infinity, maxPoly = -Infinity;
        for (const v of polygon) {
            const proj = v.dot(normal);
            if (proj < minPoly) minPoly = proj;
            if (proj > maxPoly) maxPoly = proj;
        }

        // Project circle onto normal
        const circleProj = circlePos.dot(normal);
        const minCircle = circleProj - radius;
        const maxCircle = circleProj + radius;

        // Check for separation
        if (minCircle >= maxPoly || maxCircle <= minPoly) {
            return { collided: false, normal: Vector2.zero(), depth: 0 };
        }

        const depth = Math.min(maxCircle - minPoly, maxPoly - minCircle);
        if (depth < minDepth) {
            minDepth = depth;
            bestNormal = normal;
        }
    }

    // Also test axis from closest vertex to circle center
    let closestDist = Infinity;
    let closestVertex = polygon[0];
    for (const v of polygon) {
        const d = circlePos.distanceSq(v);
        if (d < closestDist) {
            closestDist = d;
            closestVertex = v;
        }
    }
    const vertexAxis = circlePos.sub(closestVertex).normalize();
    if (vertexAxis.lengthSq() > 0) {
        let minPoly = Infinity, maxPoly = -Infinity;
        for (const v of polygon) {
            const proj = v.dot(vertexAxis);
            if (proj < minPoly) minPoly = proj;
            if (proj > maxPoly) maxPoly = proj;
        }
        const circleProj = circlePos.dot(vertexAxis);
        const minCircle = circleProj - radius;
        const maxCircle = circleProj + radius;

        if (minCircle >= maxPoly || maxCircle <= minPoly) {
            return { collided: false, normal: Vector2.zero(), depth: 0 };
        }

        const depth = Math.min(maxCircle - minPoly, maxPoly - minCircle);
        if (depth < minDepth) {
            minDepth = depth;
            bestNormal = vertexAxis;
        }
    }

    // Ensure normal points away from polygon center toward circle
    const polyCenterX = polygon.reduce((s, v) => s + v.x, 0) / polygon.length;
    const polyCenterY = polygon.reduce((s, v) => s + v.y, 0) / polygon.length;
    const toCircle = circlePos.sub(new Vector2(polyCenterX, polyCenterY));
    if (bestNormal.dot(toCircle) < 0) {
        bestNormal = bestNormal.scale(-1);
    }

    return { collided: true, normal: bestNormal, depth: minDepth };
}

/**
 * Test all solid map polygons for collision with a circle.
 * Returns the deepest collision (or null if none).
 */
export function resolveCircleMapCollision(
    pos: Vector2,
    radius: number,
    polygons: MapPolygon[]
): CollisionResult[] {
    const results: CollisionResult[] = [];

    for (const poly of polygons) {
        const result = circleVsPolygon(pos, radius, poly.vertices);
        if (result.collided) {
            results.push({
                ...result,
                polyType: poly.type,
            });
        }
    }

    // Sort by depth (deepest first) so we resolve the most important collision first
    results.sort((a, b) => b.depth - a.depth);
    return results;
}

/**
 * Raycast against a line segment.
 */
function rayVsSegment(
    origin: Vector2,
    dir: Vector2,
    a: Vector2,
    b: Vector2
): { t: number; u: number } | null {
    const edge = b.sub(a);
    const denom = dir.cross(edge);
    if (Math.abs(denom) < 1e-10) return null;

    const diff = a.sub(origin);
    const t = diff.cross(edge) / denom;
    const u = diff.cross(dir) / denom;

    if (t >= 0 && u >= 0 && u <= 1) {
        return { t, u };
    }
    return null;
}

/**
 * Raycast against map polygons. Returns the closest hit.
 */
export function raycastMap(
    origin: Vector2,
    direction: Vector2,
    maxDistance: number,
    polygons: MapPolygon[]
): RaycastHit {
    let closestT = maxDistance;
    let hitResult: RaycastHit = {
        hit: false,
        point: Vector2.zero(),
        normal: Vector2.zero(),
        distance: maxDistance,
        polygon: null,
    };

    const dir = direction.normalize();

    for (const poly of polygons) {
        const verts = poly.vertices;
        for (let i = 0; i < verts.length; i++) {
            const a = verts[i];
            const b = verts[(i + 1) % verts.length];
            const result = rayVsSegment(origin, dir, a, b);
            if (result && result.t < closestT && result.t > 0) {
                closestT = result.t;
                const edge = b.sub(a);
                const normal = new Vector2(-edge.y, edge.x).normalize();
                // Ensure normal faces the ray origin
                if (normal.dot(dir) > 0) {
                    normal.scaleMut(-1);
                }
                hitResult = {
                    hit: true,
                    point: origin.add(dir.scale(result.t)),
                    normal,
                    distance: result.t,
                    polygon: poly,
                };
            }
        }
    }

    return hitResult;
}

/**
 * Check if a point is inside a convex polygon using cross product test.
 */
export function pointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
    let positive = 0;
    let negative = 0;
    for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
        if (cross > 0) positive++;
        else if (cross < 0) negative++;
        if (positive > 0 && negative > 0) return false;
    }
    return true;
}
