import { CanvasTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { bridgePoint } from '../game/Bridge';
import { ART_BASE, ART_BRUSHES } from './PaintedMapLayout';
import { toThree } from './Coordinates';
import { disposeSceneResources } from './SceneResources';

/** Optional planning labels. These markers never participate in picking or combat. */
export class MapLayoutOverlay {
  readonly group = new Group();
  constructor() {
    this.group.name = 'map-layout-labels'; this.group.visible = false;
    const add = (text: string, u: number, v: number, color: string, scope = 'always') => {
      const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 72;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#0b1426e8'; ctx.fillRect(0, 0, 384, 72);
      ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 380, 68);
      ctx.fillStyle = color; ctx.font = 'bold 32px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 192, 36);
      const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace;
      const mesh = new Mesh(new PlaneGeometry(185, 35), new MeshBasicMaterial({ map, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide }));
      mesh.rotation.x = -Math.PI / 4; mesh.position.copy(toThree(bridgePoint(u, v), 30)); mesh.renderOrder = 100;
      mesh.userData.scope = scope;
      this.group.add(mesh);
    };
    for (const sign of [-1, 1]) {
      const color = sign < 0 ? '#90d9ff' : '#ffb2c2';
      add(sign < 0 ? '蓝方基地' : '红方基地', -ART_BASE.nexus[0] * sign, 160, color, 'overview');
      add('出生泉水', -ART_BASE.spawn[0] * sign, 58, color, 'detail');
      add('基地水晶', -ART_BASE.nexus[0] * sign, 25, color, 'detail');
      add('双守卫塔', -ART_BASE.nexusTowers[0][0] * sign, -68, color, 'detail');
      add('召唤水晶', -ART_BASE.inhibitor[0] * sign, 18, color, 'detail');
      add('内塔', -ART_BASE.innerTower[0] * sign, 0, color);
      add('外塔', -ART_BASE.outerTower[0] * sign, 0, color);
    }
    for (const [i, b] of ART_BRUSHES.entries()) add(`草丛 ${i + 1}`, b.u, b.v, '#b4efc4');
  }
  update(zoom: number): void {
    for (const child of this.group.children) {
      child.visible = child.userData.scope === 'always' || (zoom < .18 ? child.userData.scope === 'overview' : child.userData.scope === 'detail');
      child.scale.setScalar(Math.max(.7, Math.min(2.6, .16 / zoom)));
    }
  }
  dispose(): void { disposeSceneResources(this.group); this.group.clear(); this.group.removeFromParent(); }
}
