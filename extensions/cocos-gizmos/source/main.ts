// @ts-ignore
import packageJSON from '../package.json';

const NAME: string = packageJSON.name;

async function toggle(key: 'enabled' | 'onlySelected', label: string, fallback: boolean) {
    const current = await Editor.Profile.getConfig(NAME, key);
    const next = !(current ?? fallback);
    await Editor.Profile.setConfig(NAME, key, next, 'global');
    console.log(`[Gizmos] ${label}: ${next ? 'on' : 'off'}`);
    // Redraw the edit scene now (Play-in-Editor's scene picks it up within a second).
    try {
        await Editor.Message.request('scene', 'execute-scene-script', { name: NAME, method: 'gzRefresh', args: [] });
    } catch {
        // scene not ready
    }
}

/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
export const methods: { [key: string]: (...any: any) => any } = {
    toggleGizmos() {
        return toggle('enabled', 'Gizmos', true);
    },
    toggleOnlySelected() {
        return toggle('onlySelected', 'Only selected', false);
    },
    /** Print what the edit scene's gizmo drawer sees (for troubleshooting). */
    async showInfo() {
        try {
            const info = await Editor.Message.request('scene', 'execute-scene-script', { name: NAME, method: 'gzInfo', args: [] });
            console.log('[Gizmos]', JSON.stringify(info));
        } catch (e) {
            console.warn('[Gizmos] scene not ready:', e);
        }
    },
};

/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
export function load() { }

/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
export function unload() { }
