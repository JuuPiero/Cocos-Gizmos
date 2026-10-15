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

// source/main.ts
var main_exports = {};
__export(main_exports, {
  load: () => load,
  methods: () => methods,
  unload: () => unload
});
module.exports = __toCommonJS(main_exports);

// package.json
var package_default = {
  $schema: "./@types/schema/package/index.json",
  package_version: 2,
  name: "cocos-gizmos",
  version: "1.0.0",
  author: "Thanh Hoang",
  editor: ">=3.8.6",
  scripts: {
    preinstall: "node ./scripts/preinstall.js",
    build: "tsc && node ./scripts/build.js",
    watch: "node ./scripts/build.js --watch",
    typecheck: "tsc"
  },
  description: "i18n:cocos-gizmos.description",
  main: "./dist/main.js",
  devDependencies: {
    "@cocos/creator-types": "^3.8.6",
    "@types/node": "^18.17.1",
    esbuild: "^0.24.2",
    typescript: "^5.8.2"
  },
  contributions: {
    menu: [
      {
        path: "i18n:menu.extension/Gizmos",
        label: "i18n:cocos-gizmos.toggle_gizmos",
        message: "toggle-gizmos"
      },
      {
        path: "i18n:menu.extension/Gizmos",
        label: "i18n:cocos-gizmos.toggle_only_selected",
        message: "toggle-only-selected"
      },
      {
        path: "i18n:menu.extension/Gizmos",
        label: "i18n:cocos-gizmos.show_info",
        message: "show-info"
      }
    ],
    messages: {
      "toggle-gizmos": {
        methods: ["toggleGizmos"]
      },
      "toggle-only-selected": {
        methods: ["toggleOnlySelected"]
      },
      "show-info": {
        methods: ["showInfo"]
      }
    },
    scene: {
      script: "./dist/scene.js"
    },
    "asset-db": {
      mount: {
        path: "./assets",
        readonly: false
      }
    },
    profile: {
      editor: {
        enabled: {
          default: true
        },
        onlySelected: {
          default: false
        }
      }
    }
  }
};

// source/main.ts
var NAME = package_default.name;
async function toggle(key, label, fallback) {
  const current = await Editor.Profile.getConfig(NAME, key);
  const next = !(current ?? fallback);
  await Editor.Profile.setConfig(NAME, key, next, "global");
  console.log(`[Gizmos] ${label}: ${next ? "on" : "off"}`);
  try {
    await Editor.Message.request("scene", "execute-scene-script", { name: NAME, method: "gzRefresh", args: [] });
  } catch {
  }
}
var methods = {
  toggleGizmos() {
    return toggle("enabled", "Gizmos", true);
  },
  toggleOnlySelected() {
    return toggle("onlySelected", "Only selected", false);
  },
  /** Print what the edit scene's gizmo drawer sees (for troubleshooting). */
  async showInfo() {
    try {
      const info = await Editor.Message.request("scene", "execute-scene-script", { name: NAME, method: "gzInfo", args: [] });
      console.log("[Gizmos]", JSON.stringify(info));
    } catch (e) {
      console.warn("[Gizmos] scene not ready:", e);
    }
  }
};
function load() {
}
function unload() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  load,
  methods,
  unload
});
//# sourceMappingURL=main.js.map
