import { _decorator, Color, Component, Vec2, Vec3 } from 'cc';
import { Gizmos } from 'db://cocos-gizmos/Gizmos';

const { ccclass, property } = _decorator;

/**
 * Shows every Gizmos function. Add it to an empty node at the origin.
 * Shapes are laid out along +X, 3 units apart:
 *   x=0 wire cube | 3 cube | 6 wire sphere | 9 sphere | 12 capsule
 *   15 cylinder | 18 cone | 21 circle (XY) + disc | 24 rect (XY) | 27 arrow + ray
 *   30 arc + bezier | 33 dashed line + cross
 * Select the node to also see the onDrawGizmosSelected shapes (red).
 */
@ccclass('GizmosDemo')
export class GizmosDemo extends Component {
    @property
    spacing = 3;

    @property
    drawOnTop = false;

    onDrawGizmos() {
        const p = (i: number, y = 0) => new Vec3(this.node.worldPosition.x + i * this.spacing, this.node.worldPosition.y + y, this.node.worldPosition.z);
        Gizmos.depthTest = !this.drawOnTop;

        Gizmos.color = Color.WHITE;
        Gizmos.drawWireCube(p(0), new Vec3(2, 2, 2));
        Gizmos.color = new Color(80, 160, 255, 255);
        Gizmos.drawCube(p(1), new Vec3(1.5, 1.5, 1.5));

        Gizmos.color = Color.YELLOW;
        Gizmos.drawWireSphere(p(2), 1);
        Gizmos.color = new Color(255, 140, 0, 255);
        Gizmos.drawSphere(p(3), 0.8);

        Gizmos.color = Color.GREEN;
        Gizmos.drawWireCapsule(p(4), 0.6, 2.5);
        Gizmos.drawWireCylinder(p(5), 0.7, 2);
        Gizmos.drawWireCone(p(6), 0.8, 2);

        Gizmos.color = Color.CYAN;
        Gizmos.drawWireCircle(p(7), 1);
        Gizmos.color = new Color(0, 255, 255, 90);
        Gizmos.drawDisc(p(7, -2), 0.8, Vec3.UNIT_Y);

        Gizmos.color = Color.MAGENTA;
        Gizmos.drawWireRect(p(8), new Vec2(2, 1.2));
        Gizmos.color = new Color(255, 0, 255, 90);
        Gizmos.drawRect(p(8, -2), new Vec2(1.6, 1));

        Gizmos.color = Color.WHITE;
        Gizmos.drawArrow(p(9, -1), p(9, 1));
        Gizmos.color = Color.GRAY;
        Gizmos.drawRay(p(9, -1), new Vec3(1, 0, 0));

        Gizmos.color = Color.YELLOW;
        Gizmos.drawWireArc(p(10), Vec3.UNIT_Z, Vec3.UNIT_X, 270, 1);
        Gizmos.drawBezier(p(10, -2), p(10.3, -0.5), p(10.7, -3.5), p(11, -2));

        Gizmos.color = Color.WHITE;
        Gizmos.drawDashedLine(p(11, -1), p(11, 1));
        Gizmos.drawCross(p(11, 1.5), 0.6);

        // Local space: follows the node's rotation and scale.
        Gizmos.matrix = this.node.worldMatrix;
        Gizmos.color = new Color(255, 255, 255, 120);
        Gizmos.drawWireCube(new Vec3(0, 2.5, 0), new Vec3(1, 1, 1));
    }

    onDrawGizmosSelected() {
        Gizmos.color = Color.RED;
        Gizmos.drawWireSphere(this.node.worldPosition, 0.3);
        Gizmos.drawLine(this.node.worldPosition, new Vec3(this.node.worldPosition.x + 11 * this.spacing, this.node.worldPosition.y, this.node.worldPosition.z));
    }
}
