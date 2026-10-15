"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// source/scene.ts
var scene_exports = {};
__export(scene_exports, {
  load: () => load,
  methods: () => methods,
  unload: () => unload
});
module.exports = __toCommonJS(scene_exports);
var import_path = require("path");
module.paths.push((0, import_path.join)(Editor.App.path, "node_modules"));
var ccModule = null;
function cc() {
  if (!ccModule) ccModule = require("cc");
  return ccModule;
}
var cce = () => globalThis.cce || {};
var RESCAN_MS = 500;
var OPTIONS_MS = 1e3;
var ERROR_REPEAT_MS = 5e3;
var S = {
  hooked: false,
  options: { enabled: true, onlySelected: false },
  optionsAt: 0,
  scene: null,
  scanAt: 0,
  drawers: [],
  errors: /* @__PURE__ */ new Map(),
  calls: 0
};
async function readOptions() {
  try {
    const enabled = await Editor.Profile.getConfig("cocos-gizmos", "enabled");
    const onlySelected = await Editor.Profile.getConfig("cocos-gizmos", "onlySelected");
    S.options = { enabled: enabled !== false, onlySelected: onlySelected === true };
  } catch {
  }
}
function pollOptions() {
  const now = Date.now();
  if (now - S.optionsAt < OPTIONS_MS) return;
  S.optionsAt = now;
  readOptions();
}
function hasGizmos(comp) {
  return typeof comp.onDrawGizmos === "function" || typeof comp.onDrawGizmosSelected === "function";
}
function scan(scene) {
  const found = [];
  const walk = (node) => {
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
function sceneViewCamera() {
  const { director, renderer } = cc();
  const root = director.root;
  if (!root) return null;
  for (const cam of root.cameraList) {
    if (cam.cameraUsage === renderer.scene.CameraUsage.SCENE_VIEW && cam.enabled && cam.window === root.mainWindow) return cam;
  }
  return null;
}
function isSelected(node, selected) {
  for (let n = node; n; n = n.parent) if (selected.has(n.uuid)) return true;
  return false;
}
function reportError(comp, method, e) {
  var _a, _b;
  const now = Date.now();
  const last = S.errors.get(comp) || 0;
  if (now - last < ERROR_REPEAT_MS) return;
  S.errors.set(comp, now);
  console.error(`[Gizmos] ${(_a = comp.node) == null ? void 0 : _a.name}.${(_b = comp.constructor) == null ? void 0 : _b.name}.${method}:`, e);
}
function draw() {
  var _a, _b;
  pollOptions();
  if (!S.options.enabled) return;
  const api = globalThis.__cocosGizmosApi;
  if (!api) return;
  const cam = sceneViewCamera();
  if (!cam) return;
  if (!cam.geometryRenderer) cam.initGeometryRenderer();
  const geometry = cam.geometryRenderer;
  if (!geometry) return;
  const scene = cc().director.getScene();
  if (!scene) return;
  if (scene !== S.scene || Date.now() - S.scanAt > RESCAN_MS) scan(scene);
  if (!S.drawers.length) return;
  const selected = new Set(((_b = (_a = cce().Selection) == null ? void 0 : _a.query) == null ? void 0 : _b.call(_a)) || []);
  api._begin(geometry);
  try {
    for (const comp of S.drawers) {
      if (!comp.isValid || !comp.enabledInHierarchy) continue;
      const c = comp;
      if (!S.options.onlySelected && typeof c.onDrawGizmos === "function") {
        api._reset();
        try {
          c.onDrawGizmos();
          S.calls++;
        } catch (e) {
          reportError(comp, "onDrawGizmos", e);
        }
      }
      if (typeof c.onDrawGizmosSelected === "function" && isSelected(comp.node, selected)) {
        api._reset();
        try {
          c.onDrawGizmosSelected();
          S.calls++;
        } catch (e) {
          reportError(comp, "onDrawGizmosSelected", e);
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
var methods = {
  /** Re-read the options and redraw the Scene view now. */
  async gzRefresh() {
    var _a, _b;
    hook();
    await readOptions();
    S.scanAt = 0;
    (_b = (_a = cce().Engine) == null ? void 0 : _a.repaintInEditMode) == null ? void 0 : _b.call(_a);
    return { ...S.options, drawers: S.drawers.length };
  },
  gzInfo() {
    hook();
    const cam = sceneViewCamera();
    return {
      ...S.options,
      hooked: S.hooked,
      api: !!globalThis.__cocosGizmosApi,
      sceneViewCamera: cam ? cam.name : null,
      drawers: S.drawers.map((c) => {
        var _a, _b;
        return `${(_a = c.node) == null ? void 0 : _a.name}/${(_b = c.constructor) == null ? void 0 : _b.name}`;
      }),
      calls: S.calls
    };
  }
};
function load() {
  try {
    hook();
  } catch {
    setTimeout(() => {
      try {
        hook();
      } catch {
      }
    }, 1e3);
  }
}
function unload() {
  try {
    unhook();
  } catch {
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  load,
  methods,
  unload
});
//# sourceMappingURL=scene.js.map
