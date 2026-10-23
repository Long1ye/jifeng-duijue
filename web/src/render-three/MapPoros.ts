import { Group, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, NearestFilter, PlaneGeometry, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import sleepUrl from '../../assets/map-modules/howling-poros-v1/poro-sleep.png?url';
import alertUrl from '../../assets/map-modules/howling-poros-v1/poro-alert.png?url';
import curiousUrl from '../../assets/map-modules/howling-poros-v1/poro-curious.png?url';
import metadata from '../../assets/map-modules/howling-poros-v1/manifest.json';
import walkUrl from '../../assets/map-modules/howling-poros-v1/poro-walk.png?url';
import walk from '../../assets/map-modules/howling-poros-v1/walk.json';
import { bridgePoint } from '../game/Bridge';
import type { Point } from '../game/types';
import { toThree, type ThreeCamera } from './Coordinates';
import { contactShadowTexture } from './S01Look';
import { disposeSceneResources } from './SceneResources';
import { PORO_PLACEMENTS, PoroBehavior, poroDirection, type PoroPlacement } from './PoroBehavior';
export { PORO_PLACEMENTS } from './PoroBehavior';

/** Scenic residents only: no entities, collision bodies, health bars or picking. */
export class MapPoros {
  readonly group = new Group();
  readonly errors: string[] = [];
  private readonly ready = new Set<Texture>();
  private readonly residents: { body: Mesh<PlaneGeometry, MeshBasicMaterial>; shadow: Mesh<PlaneGeometry, MeshBasicMaterial>; placement: PoroPlacement; motion: PoroBehavior; idle: Texture; direction: number }[] = [];
  private readonly walkMap: Texture;
  private disposed = false;
  constructor() {
    this.group.name = 'map-poro-residents';
    const loader = new TextureLoader(), shadowMap = contactShadowTexture();
    this.walkMap = loader.load(walkUrl, texture => {
      if (!this.disposed) this.ready.add(texture);
    }, undefined, () => { if (!this.disposed) this.errors.push('poro-walk'); });
    this.walkMap.colorSpace = SRGBColorSpace; this.walkMap.magFilter = NearestFilter; this.walkMap.minFilter = LinearMipmapLinearFilter;
    const urls = { sleep: sleepUrl, alert: alertUrl, curious: curiousUrl };
    const idleMaps = new Map<string, Texture>();
    for (const placement of PORO_PLACEMENTS) {
      let map = idleMaps.get(placement.pose);
      if (!map) { map = loader.load(urls[placement.pose], texture => {
        if (!this.disposed) this.ready.add(texture);
      }, undefined, () => { if (!this.disposed) this.errors.push(placement.id); }); idleMaps.set(placement.pose, map); }
      map.colorSpace = SRGBColorSpace; map.magFilter = NearestFilter; map.minFilter = LinearMipmapLinearFilter;
      const size = metadata.assets[placement.pose].size;
      const height = placement.width * size[1] / size[0];
      const geometry = new PlaneGeometry(placement.width, height).translate(0, height / 2, 0);
      const body = new Mesh(geometry, new MeshBasicMaterial({ map, alphaTest: .35, toneMapped: false, fog: false, color: 0xdce5f0 }));
      body.name = `poro-${placement.id}`; body.visible = false;
      const shadow = new Mesh(new PlaneGeometry(placement.width * .86, placement.width * .48), new MeshBasicMaterial({
        map: shadowMap, color: 0x142438, transparent: true, opacity: .48, depthWrite: false, toneMapped: false, fog: false,
      }));
      shadow.name = `poro-shadow-${placement.id}`; shadow.rotation.x = -Math.PI / 2; shadow.visible = false;
      shadow.position.copy(toThree(bridgePoint(placement.u, placement.v), .72));
      this.group.add(body, shadow); this.residents.push({ body, shadow, placement, motion: new PoroBehavior(placement), idle: map, direction: 0 });
    }
  }
  update(time: number, camera: ThreeCamera, heroes: readonly Point[] = []): void {
    if (this.disposed) return;
    for (const resident of this.residents) {
      const { body, shadow, placement: p, motion, idle } = resident;
      motion.update(time, heroes);
      const point = bridgePoint(motion.u, motion.v);
      resident.direction = poroDirection(camera.screenHeading(point, Math.atan2(motion.facing.y, motion.facing.x)), resident.direction);
      const awake = (motion.moving || motion.attention) && this.ready.has(this.walkMap);
      const map = awake ? this.walkMap : idle;
      if (body.material.map !== map) { body.material.map = map; body.material.needsUpdate = true; }
      body.visible = shadow.visible = this.ready.has(map);
      const phase = time + p.phase;
      const frame = awake ? resident.direction * 4 + (motion.moving ? Math.floor(phase * walk.fps) % 4 : 0) : 0;
      const size = metadata.assets[p.pose].size;
      const width = awake ? p.width * walk.cell[0] / 184 : p.width;
      const height = awake ? width : p.width * size[1] / size[0];
      const anchor = awake ? walk.anchor[1] / walk.cell[1] : 1;
      const positions = body.geometry.getAttribute('position');
      positions.setXYZ(0, -width / 2, height * anchor, 0); positions.setXYZ(1, width / 2, height * anchor, 0);
      positions.setXYZ(2, -width / 2, height * (anchor - 1), 0); positions.setXYZ(3, width / 2, height * (anchor - 1), 0);
      positions.needsUpdate = true; body.geometry.computeBoundingSphere();
      const uv = body.geometry.getAttribute('uv');
      const left = awake ? frame % 4 / 4 : 0, right = awake ? left + .25 : 1;
      const top = awake ? 1 - Math.floor(frame / 4) / 4 : 1, bottom = awake ? top - .25 : 0;
      // Rest poses face right in their source images. Mirror the complete
      // sprite when resting to retain the same head/body facing as its walk.
      const flipIdle = !awake && resident.direction === 1;
      const u0 = flipIdle ? right : left, u1 = flipIdle ? left : right;
      uv.setXY(0, u0, top); uv.setXY(1, u1, top); uv.setXY(2, u0, bottom); uv.setXY(3, u1, bottom); uv.needsUpdate = true;
      body.position.copy(toThree(point, .9));
      body.quaternion.copy(camera.camera.quaternion);
      const gesture = Math.sin(Math.PI * motion.gestureProgress);
      if (motion.gesture === 'hop') body.position.y += gesture * 7;
      if (motion.gesture === 'sniff') body.rotateZ((resident.direction ? 1 : -1) * gesture * .12);
      if (motion.gesture === 'shake') body.rotateZ(Math.sin(motion.gestureProgress * Math.PI * 10) * gesture * .09);
      body.scale.y = 1 + Math.sin(phase * (motion.moving ? walk.fps * Math.PI : 1.5)) * (motion.moving ? .018 : .012);
      shadow.scale.setScalar(motion.gesture === 'hop' ? 1 - gesture * .2 : 1);
      shadow.position.copy(toThree(point, .72));
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; disposeSceneResources(this.group); this.group.clear(); this.group.removeFromParent();
    // Idle maps can be detached while an atlas pose is displayed.
    const attached = new Set(this.residents.map(r => r.body.material.map));
    for (const idle of new Set(this.residents.map(r => r.idle))) if (!attached.has(idle)) idle.dispose();
    if (!attached.has(this.walkMap)) this.walkMap.dispose();
    this.residents.length = 0; this.ready.clear();
  }
}
