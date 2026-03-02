export class Vector2 {
    constructor(public x: number = 0, public y: number = 0) { }

    static zero(): Vector2 { return new Vector2(0, 0); }
    static one(): Vector2 { return new Vector2(1, 1); }
    static up(): Vector2 { return new Vector2(0, -1); }
    static down(): Vector2 { return new Vector2(0, 1); }
    static left(): Vector2 { return new Vector2(-1, 0); }
    static right(): Vector2 { return new Vector2(1, 0); }

    clone(): Vector2 { return new Vector2(this.x, this.y); }
    set(x: number, y: number): this { this.x = x; this.y = y; return this; }
    copy(v: Vector2): this { this.x = v.x; this.y = v.y; return this; }

    add(v: Vector2): Vector2 { return new Vector2(this.x + v.x, this.y + v.y); }
    sub(v: Vector2): Vector2 { return new Vector2(this.x - v.x, this.y - v.y); }
    scale(s: number): Vector2 { return new Vector2(this.x * s, this.y * s); }
    mul(v: Vector2): Vector2 { return new Vector2(this.x * v.x, this.y * v.y); }

    addMut(v: Vector2): this { this.x += v.x; this.y += v.y; return this; }
    subMut(v: Vector2): this { this.x -= v.x; this.y -= v.y; return this; }
    scaleMut(s: number): this { this.x *= s; this.y *= s; return this; }

    dot(v: Vector2): number { return this.x * v.x + this.y * v.y; }
    cross(v: Vector2): number { return this.x * v.y - this.y * v.x; }

    lengthSq(): number { return this.x * this.x + this.y * this.y; }
    length(): number { return Math.sqrt(this.lengthSq()); }

    normalize(): Vector2 {
        const len = this.length();
        if (len === 0) return Vector2.zero();
        return this.scale(1 / len);
    }

    normalizeMut(): this {
        const len = this.length();
        if (len > 0) { this.x /= len; this.y /= len; }
        return this;
    }

    perpCW(): Vector2 { return new Vector2(this.y, -this.x); }
    perpCCW(): Vector2 { return new Vector2(-this.y, this.x); }

    rotate(angle: number): Vector2 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Vector2(this.x * c - this.y * s, this.x * s + this.y * c);
    }

    lerp(v: Vector2, t: number): Vector2 {
        return new Vector2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
    }

    distance(v: Vector2): number { return this.sub(v).length(); }
    distanceSq(v: Vector2): number { return this.sub(v).lengthSq(); }

    angle(): number { return Math.atan2(this.y, this.x); }

    static fromAngle(angle: number, length: number = 1): Vector2 {
        return new Vector2(Math.cos(angle) * length, Math.sin(angle) * length);
    }

    reflect(normal: Vector2): Vector2 {
        const d = this.dot(normal) * 2;
        return this.sub(normal.scale(d));
    }

    toString(): string { return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`; }
}
