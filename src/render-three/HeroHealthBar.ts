import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, type Texture } from 'three';
import type { Entity } from '../game/types';
import { HealthBarTrail } from '../render/HealthBarTrail';

const WIDTH = 64;
type BarMesh = Mesh<PlaneGeometry, MeshBasicMaterial>;

/** Stable client frame, segmented health and sword flow from the original HUD. */
export class HeroHealthBar extends Group {
  readonly fill: BarMesh;
  private readonly damage: BarMesh;
  private readonly highlight: BarMesh;
  private readonly shade: BarMesh;
  private readonly flow: BarMesh;
  private readonly flowHighlight: BarMesh;
  private readonly ticks = new Group();
  private readonly trail = new HealthBarTrail();
  private maxHp = 0;

  constructor(entity: Entity, frame: Texture) {
    super();
    this.name = `actor-health-${entity.id}`;
    const border = this.plane(WIDTH + 4, 15, 0xffffff, 0, -2, 100);
    border.material.map = frame; border.material.transparent = true;
    this.plane(WIDTH, 7, 0x09141a, 0, 0, 101);
    this.damage = this.plane(WIDTH, 7, 0xf0c48c, 0, 0, 102);
    const colors = entity.team === 'blue' ? [0x67be4c, 0xa5dd72, 0x367238] : [0xcf4b4d, 0xff9b8a, 0x8c3039];
    this.fill = this.plane(WIDTH, 7, colors[0], 0, 0, 103);
    this.highlight = this.plane(WIDTH, 1, colors[1], 0, 3, 104);
    this.shade = this.plane(WIDTH, 1, colors[2], 0, -3, 104);
    this.plane(WIDTH, 2, 0x07121b, 0, -6.5, 101);
    this.flow = this.plane(WIDTH, 2, 0x7c8c98, 0, -6.5, 103);
    this.flowHighlight = this.plane(WIDTH, 1, 0xb6c6cd, 0, -6, 104);
    this.add(this.ticks);
  }

  update(entity: Entity, time: number): void {
    const health = Math.max(0, Math.min(1, entity.hp / entity.maxHp));
    const lag = this.trail.sample(entity.id, entity.hp, entity.maxHp, time);
    this.amount(this.damage, lag); this.damage.visible = lag > health;
    for (const mesh of [this.fill, this.highlight, this.shade]) this.amount(mesh, health);
    const flow = Math.max(0, Math.min(1, (entity.flow ?? 0) / 100));
    this.amount(this.flow, flow); this.amount(this.flowHighlight, flow);
    this.flow.material.color.setHex(flow >= 1 ? 0xf3f8fa : 0x7c8c98);
    this.flowHighlight.material.color.setHex(flow >= 1 ? 0xffffff : 0xb6c6cd);
    if (this.maxHp !== entity.maxHp) {
      for (const child of this.ticks.children as BarMesh[]) { child.geometry.dispose(); child.material.dispose(); }
      this.ticks.clear(); this.maxHp = entity.maxHp;
      for (let hp = 100; hp < entity.maxHp; hp += 100) {
        const tick = this.plane(1, 7, 0x081115, -WIDTH / 2 + Math.round(WIDTH * hp / entity.maxHp), 0, 105);
        this.ticks.add(tick);
      }
    }
  }

  private amount(mesh: BarMesh, fraction: number): void {
    mesh.scale.x = fraction; mesh.position.x = -WIDTH / 2 * (1 - fraction);
  }

  private plane(width: number, height: number, color: number, x: number, y: number, order: number): BarMesh {
    const mesh = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    mesh.position.set(x, y, 0); mesh.renderOrder = order; mesh.frustumCulled = false;
    this.add(mesh); return mesh;
  }
}
