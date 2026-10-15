import { Camera, Color, Mat4, Quat, Vec2, Vec3, geometry } from 'cc';
import type { GeometryRenderer } from 'cc';
import { EDITOR } from 'cc/env';

/**
 * Unity-style gizmos for the Scene view.
 *
 * Add `onDrawGizmos()` and/or `onDrawGizmosSelected()` to any component and
 * draw with these functions. The cocos-gizmos extension calls them every time
 * the Scene view renders (onDrawGizmosSelected only when the node, or one of
 * its parents, is selected).
 *
 * Gizmos are editor-only: outside the editor every function returns at once,
 * and the onDrawGizmos methods are never called.
 *
 * ```ts
 * onDrawGizmos() {
 *     Gizmos.color = Color.YELLOW;
 *     Gizmos.drawWireSphere(this.node.worldPosition, this.radius);
 * }
 * onDrawGizmosSelected() {
 *     Gizmos.matrix = this.node.worldMatrix; // shapes below are in local space
 *     Gizmos.drawWireCube(Vec3.ZERO, new Vec3(1, 2, 1));
 * }
 * ```
 */
export class Gizmos {
    /**
     * Color of the shapes drawn next. Reset to white before every
     * onDrawGizmos call. Assign a color, do not mutate shared constants.
     */
    static color: Readonly<Color> = new Color(255, 255, 255, 255);

    /**
     * Transform applied to the shapes drawn next (e.g. `this.node.worldMatrix`
     * to draw in the node's local space). Reset to identity before every call.
     */
    static matrix: Readonly<Mat4> = new Mat4();

    /** false: draw on top of everything instead of being hidden by geometry. Reset to true. */
    static depthTest = true;

    /** True while the Scene view is collecting gizmos. */
    static get isDrawing(): boolean {
        return !!renderer;
    }

    // ----------------------------------------------------------------- lines

    static drawLine(from: Readonly<Vec3>, to: Readonly<Vec3>): void {
        const r = target();
        if (!r) return;
        r.addLine(toWorld(from, _a), toWorld(to, _b), Gizmos.color as Color, Gizmos.depthTest);
    }

    static drawDashedLine(from: Readonly<Vec3>, to: Readonly<Vec3>): void {
        const r = target();
        if (!r) return;
        r.addDashedLine(toWorld(from, _a), toWorld(to, _b), Gizmos.color as Color, Gizmos.depthTest);
    }

    /** Line from `from` to `from + direction`. */
    static drawRay(from: Readonly<Vec3>, direction: Readonly<Vec3>): void {
        Gizmos.drawLine(from, Vec3.add(_c, from, direction));
    }

    /** Independent segments: points[0]-points[1], points[2]-points[3], ... */
    static drawLineList(points: ReadonlyArray<Readonly<Vec3>>): void {
        for (let i = 0; i + 1 < points.length; i += 2) Gizmos.drawLine(points[i], points[i + 1]);
    }

    /** Connected polyline; `looped` closes it back to the first point. */
    static drawLineStrip(points: ReadonlyArray<Readonly<Vec3>>, looped = false): void {
        for (let i = 0; i + 1 < points.length; i++) Gizmos.drawLine(points[i], points[i + 1]);
        if (looped && points.length > 2) Gizmos.drawLine(points[points.length - 1], points[0]);
    }

    /** Line with an arrow head at `to`. `headSize` defaults to 20% of the length. */
    static drawArrow(from: Readonly<Vec3>, to: Readonly<Vec3>, headSize?: number): void {
        const dir = Vec3.subtract(new Vec3(), to, from);
        const length = dir.length();
        if (length < 1e-6) return;
        dir.multiplyScalar(1 / length);
        const size = headSize ?? length * 0.2;
        const [u, v] = basis(dir);
        Gizmos.drawLine(from, to);
        const back = Vec3.scaleAndAdd(new Vec3(), to, dir, -size);
        for (const side of [u, v]) {
            Gizmos.drawLine(to, Vec3.scaleAndAdd(new Vec3(), back, side, size * 0.5));
            Gizmos.drawLine(to, Vec3.scaleAndAdd(new Vec3(), back, side, -size * 0.5));
        }
    }

    static drawCross(position: Readonly<Vec3>, size = 0.5): void {
        const h = size / 2;
        Gizmos.drawLine(new Vec3(position.x - h, position.y, position.z), new Vec3(position.x + h, position.y, position.z));
        Gizmos.drawLine(new Vec3(position.x, position.y - h, position.z), new Vec3(position.x, position.y + h, position.z));
        Gizmos.drawLine(new Vec3(position.x, position.y, position.z - h), new Vec3(position.x, position.y, position.z + h));
    }

    /** Cubic Bézier curve. */
    static drawBezier(p0: Readonly<Vec3>, p1: Readonly<Vec3>, p2: Readonly<Vec3>, p3: Readonly<Vec3>, segments = 32): void {
        const r = target();
        if (!r) return;
        r.addBezier(p0 as Vec3, p1 as Vec3, p2 as Vec3, p3 as Vec3, Gizmos.color as Color, segments, Gizmos.depthTest, ...transformArgs());
    }

    // ------------------------------------------------------------ 3D shapes

    static drawWireCube(center: Readonly<Vec3>, size: Readonly<Vec3>): void {
        const r = target();
        if (!r) return;
        r.addBoundingBox(box(center, size), Gizmos.color as Color, true, Gizmos.depthTest, false, ...transformArgs());
    }

    static drawCube(center: Readonly<Vec3>, size: Readonly<Vec3>): void {
        const r = target();
        if (!r) return;
        r.addBoundingBox(box(center, size), Gizmos.color as Color, false, Gizmos.depthTest, false, ...transformArgs());
    }

    /** Three circles, like Unity's wire sphere. */
    static drawWireSphere(center: Readonly<Vec3>, radius: number): void {
        Gizmos.drawWireCircle(center, radius, Vec3.UNIT_X);
        Gizmos.drawWireCircle(center, radius, Vec3.UNIT_Y);
        Gizmos.drawWireCircle(center, radius, Vec3.UNIT_Z);
    }

    static drawSphere(center: Readonly<Vec3>, radius: number): void {
        const r = target();
        if (!r) return;
        r.addSphere(center as Vec3, radius, Gizmos.color as Color, 24, 12, false, Gizmos.depthTest, false, ...transformArgs());
    }

    /** Capsule along Y; `height` is the total height including the caps (like CapsuleCollider). */
    static drawWireCapsule(center: Readonly<Vec3>, radius: number, height: number): void {
        const r = target();
        if (!r) return;
        const body = Math.max(0, height - radius * 2);
        r.addCapsule(center as Vec3, radius, body, Gizmos.color as Color, 24, 6, true, Gizmos.depthTest, false, ...transformArgs());
    }

    /** Cylinder along Y. */
    static drawWireCylinder(center: Readonly<Vec3>, radius: number, height: number): void {
        const r = target();
        if (!r) return;
        r.addCylinder(center as Vec3, radius, height, Gizmos.color as Color, 24, true, Gizmos.depthTest, false, ...transformArgs());
    }

    /** Cone along Y, tip up; `center` is the middle of its height. */
    static drawWireCone(center: Readonly<Vec3>, radius: number, height: number): void {
        const r = target();
        if (!r) return;
        r.addCone(center as Vec3, radius, height, Gizmos.color as Color, 24, true, Gizmos.depthTest, false, ...transformArgs());
    }

    /** View frustum of a camera (world space; Gizmos.matrix is ignored). */
    static drawCameraFrustum(camera: Camera): void {
        const r = target();
        const frustum = camera?.camera?.frustum as geometry.Frustum | undefined;
        if (!r || !frustum) return;
        r.addFrustum(frustum, Gizmos.color as Color, Gizmos.depthTest);
    }

    // ------------------------------------------------------- flat / 2D shapes

    /** Circle around `normal` (default Z: the XY plane used by 2D). */
    static drawWireCircle(center: Readonly<Vec3>, radius: number, normal: Readonly<Vec3> = Vec3.UNIT_Z, segments = 48): void {
        const r = target();
        if (!r) return;
        r.addCircle(Vec3.ZERO, radius, Gizmos.color as Color, segments, Gizmos.depthTest, true, planeMatrix(center, normal));
    }

    /** Filled disc around `normal` (default Z). */
    static drawDisc(center: Readonly<Vec3>, radius: number, normal: Readonly<Vec3> = Vec3.UNIT_Z, segments = 48): void {
        const r = target();
        if (!r) return;
        r.addDisc(Vec3.ZERO, radius, Gizmos.color as Color, segments, false, Gizmos.depthTest, true, true, planeMatrix(center, normal));
    }

    /**
     * Arc around `normal`, starting at direction `from`, sweeping `angle`
     * degrees (Unity's Handles.DrawWireArc).
     */
    static drawWireArc(center: Readonly<Vec3>, normal: Readonly<Vec3>, from: Readonly<Vec3>, angle: number, radius: number, segments = 32): void {
        const axis = Vec3.normalize(new Vec3(), normal);
        const start = Vec3.normalize(new Vec3(), from);
        const steps = Math.max(1, Math.ceil(segments * Math.min(1, Math.abs(angle) / 360)));
        const q = new Quat();
        const points: Vec3[] = [];
        for (let i = 0; i <= steps; i++) {
            Quat.fromAxisAngle(q, axis, (angle * i / steps) * Math.PI / 180);
            const p = Vec3.transformQuat(new Vec3(), start, q).multiplyScalar(radius).add(center);
            points.push(p);
        }
        Gizmos.drawLineStrip(points);
    }

    /** Rectangle in the XY plane (2D). Use Gizmos.matrix to rotate/scale it. */
    static drawWireRect(center: Readonly<Vec3>, size: Readonly<Vec2>): void {
        Gizmos.drawLineStrip(rect(center, size), true);
    }

    /** Filled rectangle in the XY plane (2D). */
    static drawRect(center: Readonly<Vec3>, size: Readonly<Vec2>): void {
        const r = target();
        if (!r) return;
        const [a, b, c, d] = rect(center, size).map((p) => toWorld(p, new Vec3()));
        r.addQuad(a, b, c, d, Gizmos.color as Color, false, Gizmos.depthTest, true);
    }

    /** Closed polygon through `points` (any plane). */
    static drawWirePolygon(points: ReadonlyArray<Readonly<Vec3>>): void {
        Gizmos.drawLineStrip(points, true);
    }

    // -------------------------------------------- used by the cocos-gizmos extension

    /** @internal Start collecting for a Scene view camera. */
    static _begin(geometryRenderer: GeometryRenderer): void {
        renderer = geometryRenderer;
    }

    /** @internal Reset color/matrix/depthTest before each onDrawGizmos call. */
    static _reset(): void {
        ownColor.set(255, 255, 255, 255);
        Mat4.identity(ownMatrix);
        // Reassign rather than mutate: user code may have assigned a shared Color/Mat4.
        Gizmos.color = ownColor;
        Gizmos.matrix = ownMatrix;
        Gizmos.depthTest = true;
    }

    /** @internal */
    static _end(): void {
        renderer = null;
    }
}

let renderer: GeometryRenderer | null = null;
const ownColor = new Color(255, 255, 255, 255);
const ownMatrix = new Mat4();
const _a = new Vec3();
const _b = new Vec3();
const _c = new Vec3();

function target(): GeometryRenderer | null {
    return EDITOR ? renderer : null;
}

function isIdentity(m: Readonly<Mat4>): boolean {
    return Mat4.strictEquals(m, Mat4.IDENTITY);
}

function toWorld(p: Readonly<Vec3>, out: Vec3): Vec3 {
    return isIdentity(Gizmos.matrix) ? Vec3.copy(out, p) : Vec3.transformMat4(out, p, Gizmos.matrix);
}

function transformArgs(): [boolean, Mat4] {
    const m = Gizmos.matrix as Mat4;
    return [!isIdentity(m), m];
}

function box(center: Readonly<Vec3>, size: Readonly<Vec3>): geometry.AABB {
    return geometry.AABB.create(center.x, center.y, center.z, Math.abs(size.x) / 2, Math.abs(size.y) / 2, Math.abs(size.z) / 2);
}

function rect(center: Readonly<Vec3>, size: Readonly<Vec2>): Vec3[] {
    const hw = size.x / 2;
    const hh = size.y / 2;
    return [
        new Vec3(center.x - hw, center.y - hh, center.z),
        new Vec3(center.x + hw, center.y - hh, center.z),
        new Vec3(center.x + hw, center.y + hh, center.z),
        new Vec3(center.x - hw, center.y + hh, center.z),
    ];
}

/** Two unit vectors perpendicular to `dir` (and to each other). */
function basis(dir: Readonly<Vec3>): [Vec3, Vec3] {
    const ref = Math.abs(dir.y) < 0.99 ? Vec3.UNIT_Y : Vec3.UNIT_X;
    const u = Vec3.cross(new Vec3(), dir, ref).normalize();
    const v = Vec3.cross(new Vec3(), dir, u).normalize();
    return [u, v];
}

/**
 * Gizmos.matrix * translate(center) * rotation taking +Y (the engine's circle
 * plane normal) to `normal`.
 */
function planeMatrix(center: Readonly<Vec3>, normal: Readonly<Vec3>): Mat4 {
    const n = Vec3.normalize(new Vec3(), normal);
    const q = Quat.rotationTo(new Quat(), Vec3.UNIT_Y, n);
    const local = Mat4.fromRT(new Mat4(), q, center);
    return Mat4.multiply(new Mat4(), Gizmos.matrix, local);
}

if (EDITOR) {
    // The extension's scene script finds the API here.
    (globalThis as any).__cocosGizmosApi = Gizmos;
}
