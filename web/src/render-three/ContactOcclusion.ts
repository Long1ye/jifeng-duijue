import { BufferGeometry, DoubleSide, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bridgePoint } from '../game/Bridge';
import { artEdgeV } from './PaintedMapLayout';
import { contactShadowTexture } from './S01Look';
import { toThree } from './Coordinates';
import { QUALITY_TUNING, type QualitySettings } from './QualitySettings';

interface Contact { source: Mesh; width: number; depth: number }
/** Local, ground-only occlusion. No screen-space depth assumptions about painted cards. */
export class ContactOcclusion {
  readonly group = new Group();
  private readonly map = contactShadowTexture();
  private readonly contacts: Contact[] = [];
  private readonly stampGeometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly stamps: InstancedMesh;
  private readonly stampMaterial = new MeshBasicMaterial({ map: this.map, color: 0x0c1825, transparent: true, depthWrite: false, toneMapped: false, fog: false, opacity: QUALITY_TUNING.buildingContactOpacity });
  private readonly wall: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly transform = new Object3D();
  private readonly empty = new Matrix4().makeScale(0, 0, 0);
  private disposed = false;
  constructor(private readonly settings: QualitySettings, roots: readonly Group[]) {
    this.group.name = 'local-contact-occlusion';
    for (const root of roots) root.traverse(object => {
      if (!(object instanceof Mesh)) return;
      if (/^painted-(tower|inner-tower|nexus-tower)$/.test(object.name)) this.contacts.push({ source: object, width: 200 * object.scale.x, depth: 130 * object.scale.x });
      else if (object.name === 'painted-inhibitor') this.contacts.push({ source: object, width: 125, depth: 80 });
      else if (object.name === 'painted-nexus') this.contacts.push({ source: object, width: 240, depth: 155 });
      else if (object.name === 'painted-guardian-pillar') this.contacts.push({ source: object, width: 140, depth: 88 });
      else if (object.name === 'painted-fire-bowl') this.contacts.push({ source: object, width: 60, depth: 42 });
    });
    this.stampMaterial.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nfloat contactRadius = length((vMapUv - vec2(0.5)) * 2.0);\ndiffuseColor.a = opacity * (1.0 - smoothstep(0.32, 1.0, contactRadius));');
    };
    this.stampMaterial.customProgramCacheKey = () => 'architectural-contact-plateau-v1';
    this.stamps = new InstancedMesh(this.stampGeometry, this.stampMaterial, this.contacts.length);
    this.stamps.name = 'building-contact-stamps'; this.stamps.frustumCulled = false; this.group.add(this.stamps);
    this.stamps.renderOrder = 3;
    // Thin inner-wall strips, continuously parameterized across each segment.
    const strips: BufferGeometry[] = [];
    for (const side of [-1, 1]) for (let u = -720; u < 720; u += 12) {
      const geometry = new PlaneGeometry(1, 1), p = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
      for (let i = 0; i < 4; i++) {
        const along = u + (i % 2 ? 12 : 0), across = side * (artEdgeV(along) - (i < 2 ? 2 : 16));
        const world = toThree(bridgePoint(along, across), QUALITY_TUNING.buildingContactHeight); p.setXYZ(i, world.x, world.y, world.z);
        uv.setXY(i, i % 2, i < 2 ? .5 : 0);
      }
      // Ground normals face the camera, independently of bridge edge winding.
      strips.push(geometry);
    }
    const geometry = mergeGeometries(strips, false)!; strips.forEach(geometry => geometry.dispose());
    const material = new MeshBasicMaterial({ map: this.map, color: 0x102133, transparent: true, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide, opacity: QUALITY_TUNING.wallContactOpacity });
    material.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.a = opacity * pow(clamp(vMapUv.y * 2.0, 0.0, 1.0), 2.0);'); };
    material.customProgramCacheKey = () => 'continuous-wall-contact-v1';
    this.wall = new Mesh(geometry, material); this.wall.name = 'wall-foot-contact'; this.group.add(this.wall);
    this.update();
  }
  update() {
    this.group.visible = this.settings.contact.value > 0;
    let changed = false;
    this.contacts.forEach(({ source, width, depth }, i) => {
      source.updateWorldMatrix(true, false);
      let visible = true;
      for (let parent: import('three').Object3D | null = source; parent; parent = parent.parent) visible &&= parent.visible;
      if (!visible) { this.stamps.setMatrixAt(i, this.empty); changed = true; return; }
      this.transform.position.setFromMatrixPosition(source.matrixWorld); this.transform.position.y = QUALITY_TUNING.buildingContactHeight;
      this.transform.scale.set(width, 1, depth); this.transform.updateMatrix();
      this.stamps.setMatrixAt(i, this.transform.matrix); changed = true;
    });
    if (changed) this.stamps.instanceMatrix.needsUpdate = true;
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    this.stamps.dispose(); this.stampGeometry.dispose(); this.stampMaterial.dispose();
    this.wall.geometry.dispose(); this.wall.material.dispose(); this.map.dispose(); this.group.clear(); this.group.removeFromParent();
  }
}
