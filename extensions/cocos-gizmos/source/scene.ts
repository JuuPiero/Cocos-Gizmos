/// <reference path="../node_modules/@cocos/creator-types/engine/cc.d.ts" />
/**
 * Scene-process half of cocos-gizmos. Runs in every scene webview (the edit
 * scene and Play-in-Editor's own one). Each time the engine renders, it calls
 * onDrawGizmos / onDrawGizmosSelected on components and lets them draw into the
 * Scene view camera's GeometryRenderer through the runtime `Gizmos` API.
 *
 * Timing: GeometryRenderer clears itself after rendering, so shapes are added
 * on Director.EVENT_BEFORE_COMMIT, which root.frameMove emits right before it
 * uploads and renders them - also when the editor renders without a full
 * director tick.
 */
import { join } from 'path';
import type { Component, GeometryRenderer, Node, Scene, renderer } from 'cc';

module.paths.push(join(Editor.App.path, 'node_modules'));

type CC = typeof import('cc');
let ccModule: CC | null = null;
function cc(): CC {
    if (!ccModule) ccModule = require('cc') as CC;
    return ccModule;
}
const cce = () => (globalThis as any).cce || {};

interface GizmosApi {
    _begin(r: GeometryRenderer): void;
    _reset(): void;
    _end(): void;
}

interface Options {
    enabled: boolean;
    onlySelected: boolean;
}

const RESCAN_MS = 500;
const OPTIONS_MS = 1000;
const ERROR_REPEAT_MS = 5000;

const S = {
    hooked: false,
    options: { enabled: true, onlySelected: false } as Options,
    optionsAt: 0,
    scene: null as Scene | null,
    scanAt: 0,
    drawers: [] as Component[],
    errors: new Map<Component, number>(),
    calls: 0,
};

// ----------------------------------------------------------------- options

async function readOptions() {
    try {
        const enabled = await Editor.Profile.getConfig('cocos-gizmos', 'enabled');
        const onlySelected = await Editor.Profile.getConfig('cocos-gizmos', 'onlySelected');
        S.options = { enabled: enabled !== false, onlySelected: onlySelected === true };
    } catch {
        // keep the previous options
    }
}

function pollOptions() {
    const now = Date.now();
    if (now - S.optionsAt < OPTIONS_MS) return;
    S.optionsAt = now;
    readOptions();
}

// ------------------------------------------------------------------- scan

function hasGizmos(comp: any): boolean {
    return typeof comp.onDrawGizmos === 'function' || typeof comp.onDrawGizmosSelected === 'function';
}

function scan(scene: Scene) {
    const found: Component[] = [];
    const walk = (node: Node) => {
        const comps = node.components;
        for (let i = 0; i < comps.length; i++) if (hasGizmos(comps[i])) found.push(comps[i]);
        const children = node.children;
        for (let i = 0; i < children.length; i++) walk(children[i]);
    };
    walk(scene);
    S.drawers = found;
    S.scene = scene;
    S.scanAt = Date.now();
}

// ------------------------------------------------------------------- draw

/** The Scene view camera (not game cameras, not gizmo/preview cameras). */
function sceneViewCamera(): renderer.scene.Camera | null {
    const { director, renderer } = cc();
    const root = director.root;
    if (!root) return null;
    for (const cam of root.cameraList) {
        if (cam.cameraUsage === renderer.scene.CameraUsage.SCENE_VIEW && cam.enabled && cam.window === root.mainWindow) return cam;
    }
    return null;
}

function isSelected(node: Node | null, selected: Set<string>): boolean {
    for (let n = node; n; n = n.parent) if (selected.has(n.uuid)) return true;
    return false;
}

function reportError(comp: Component, method: string, e: unknown) {
    const now = Date.now();
    const last = S.errors.get(comp) || 0;
    if (now - last < ERROR_REPEAT_MS) return;
    S.errors.set(comp, now);
    console.error(`[Gizmos] ${comp.node?.name}.${(comp.constructor as any)?.name}.${method}:`, e);
}

function draw() {
    pollOptions();
    if (!S.options.enabled) return;
    const api = (globalThis as any).__cocosGizmosApi as GizmosApi | undefined;
    if (!api) return; // no script uses Gizmos yet
    const cam = sceneViewCamera();
    if (!cam) return; // e.g. Play-in-Editor while playing: no Scene view
    if (!cam.geometryRenderer) cam.initGeometryRenderer();
    const geometry = cam.geometryRenderer;
    if (!geometry) return;

    const scene = cc().director.getScene();
    if (!scene) return;
    if (scene !== S.scene || Date.now() - S.scanAt > RESCAN_MS) scan(scene);
    if (!S.drawers.length) return;

    const selected = new Set<string>(cce().Selection?.query?.() || []);
    api._begin(geometry);
    try {
        for (const comp of S.drawers) {
            if (!comp.isValid || !comp.enabledInHierarchy) continue;
            const c = comp as any;
            if (!S.options.onlySelected && typeof c.onDrawGizmos === 'function') {
                api._reset();
                try {
                    c.onDrawGizmos();
                    S.calls++;
                } catch (e) {
                    reportError(comp, 'onDrawGizmos', e);
                }
            }
            if (typeof c.onDrawGizmosSelected === 'function' && isSelected(comp.node, selected)) {
                api._reset();
                try {
                    c.onDrawGizmosSelected();
                    S.calls++;
                } catch (e) {
                    reportError(comp, 'onDrawGizmosSelected', e);
                }
            }
        }
    } finally {
        api._reset();
        api._end();
    }
}

function hook() {
    if (S.hooked) return;
    const { director, Director } = cc();
    director.on(Director.EVENT_BEFORE_COMMIT, draw);
    S.hooked = true;
    readOptions();
}

function unhook() {
    if (!S.hooked) return;
    const { director, Director } = cc();
    director.off(Director.EVENT_BEFORE_COMMIT, draw);
    S.hooked = false;
}

// ---------------------------------------------------------------- methods

export const methods: Record<string, (...args: any[]) => any> = {
    /** Re-read the options and redraw the Scene view now. */
    async gzRefresh() {
        hook();
        await readOptions();
        S.scanAt = 0;
        cce().Engine?.repaintInEditMode?.();
        return { ...S.options, drawers: S.drawers.length };
    },

    gzInfo() {
        hook();
        const cam = sceneViewCamera();
        return {
            ...S.options,
            hooked: S.hooked,
            api: !!(globalThis as any).__cocosGizmosApi,
            sceneViewCamera: cam ? cam.name : null,
            drawers: S.drawers.map((c) => `${c.node?.name}/${(c.constructor as any)?.name}`),
            calls: S.calls,
        };
    },
};

export function load() {
    // The engine may not be ready when the script loads; hook on first use too.
    try {
        hook();
    } catch {
        setTimeout(() => {
            try {
                hook();
            } catch {
                // retried by gzRefresh
            }
        }, 1000);
    }
}

export function unload() {
    try {
        unhook();
    } catch {
        // editor shutting down
    }
}
