# cocos-gizmos

Unity-style **Gizmos** for Cocos Creator 3.8: add `onDrawGizmos()` / `onDrawGizmosSelected()` to any component and draw lines and shapes in the Scene view.

```ts
import { _decorator, Color, Component, Vec3 } from 'cc';
import { Gizmos } from 'db://cocos-gizmos/Gizmos';
const { ccclass, property } = _decorator;

@ccclass('Enemy')
export class Enemy extends Component {
    @property viewRadius = 5;

    onDrawGizmos() {
        Gizmos.color = Color.YELLOW;
        Gizmos.drawWireSphere(this.node.worldPosition, this.viewRadius);
    }

    onDrawGizmosSelected() {
        Gizmos.matrix = this.node.worldMatrix;   // shapes below use the node's local space
        Gizmos.color = Color.RED;
        Gizmos.drawArrow(Vec3.ZERO, new Vec3(0, 0, -2));
    }
}
```

- `onDrawGizmos()` is called every time the Scene view renders.
- `onDrawGizmosSelected()` is called only when the node, or one of its parents, is selected.
- Both are called only for enabled components on active nodes.
- Gizmos are editor-only. In a built game the functions do nothing and the methods are never called.
- They appear in the Scene view, including Cocos' Preview (Play-in-Editor) while it is paused. They do not appear in the game view.

## API

State, reset before every call:

| | |
|---|---|
| `Gizmos.color` | Color of the next shapes (white). Assign a color; don't mutate shared constants like `Color.RED`. |
| `Gizmos.matrix` | Transform for the next shapes (identity). `Gizmos.matrix = this.node.worldMatrix` draws in local space. |
| `Gizmos.depthTest` | `false` draws on top of everything (true). |

Lines: `drawLine`, `drawDashedLine`, `drawRay`, `drawLineList`, `drawLineStrip(points, looped)`, `drawArrow(from, to, headSize?)`, `drawCross`, `drawBezier`.

3D shapes: `drawWireCube`, `drawCube`, `drawWireSphere`, `drawSphere`, `drawWireCapsule`, `drawWireCylinder`, `drawWireCone`, `drawCameraFrustum(camera)`.

Flat / 2D (default plane XY, normal +Z):
- `drawWireCircle(center, radius, normal?)`
- `drawDisc(center, radius, normal?)`
- `drawWireArc(center, normal, from, angle, radius)`
- `drawWireRect(center, size)`
- `drawRect(center, size)`
- `drawWirePolygon(points)`

## Menu

**Extension → Gizmos**:
- **Toggle Gizmos**: turns all gizmos on or off.
- **Toggle Only Selected**: draws only `onDrawGizmosSelected`.
- **Show Info**: prints what the gizmo drawer sees (options, Scene view camera, components with gizmos) to the Console.

## Demo

`assets/GizmosDemo.ts` (in the test project) draws every function. Add it to an empty node and select the node.

## How it works

- The runtime `Gizmos` class (`assets/Gizmos.ts`) lives in this extension's folder, which is mounted into the project as `db://cocos-gizmos`.
- The extension's scene script (`source/scene.ts`) runs in each scene process. On `Director.EVENT_BEFORE_COMMIT` it collects components with gizmo methods and calls them. They draw into the Scene view camera's `GeometryRenderer`, which renders them in the same frame.

## Development

```bash
npm install
npm run build      # type-check + bundle to dist/
```

After a build, reload `cocos-gizmos` in **Extension → Extension Manager**.
