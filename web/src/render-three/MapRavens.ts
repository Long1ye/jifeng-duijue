import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader, LinearMipmapLinearFilter, NearestFilter } from 'three';
import atlasUrl from '../../assets/map-modules/howling-wildlife-v1/raven-atlas.png?url';
import atlas from '../../assets/map-modules/howling-wildlife-v1/manifest.json';
import caps from '../../assets/map-modules/howling-wildlife-v1/wall-caps.json';
import { BRIDGE, bridgePoint } from '../game/Bridge';
import type { Point } from '../game/types';
import { toThree, type ThreeCamera } from './Coordinates';
import { PARAPET_ART, parapetCut, parapetFoot, parapetRuns } from './PaintedParapet';
import { ART_GUARDIANS, artEdgeV } from './PaintedMapLayout';
import { RavenBehavior, type RavenPerch } from './RavenBehavior';
import { disposeSceneResources } from './SceneResources';

/** Perches inherit the wall's source silhouette and run placement, including snow caps. */
export function ravenPerches(): readonly (readonly [RavenPerch, RavenPerch])[] {
  const candidates: { perch: RavenPerch; side: number }[] = [];
  for (const side of [-1, 1]) for (const run of parapetRuns(side)) {
    const [left, right] = parapetCut(run.end - run.start);
    for (const cap of caps) if (cap.x > left + 20 && cap.x < right - 20) {
      const u = run.start + (cap.x - left) * PARAPET_ART.scale / BRIDGE.projection.along[0];
      if (ART_GUARDIANS.some(g => Math.sign(g.v) === side && Math.abs(u - g.u) < 30)) continue;
      candidates.push({ side, perch: { u, v: side * artEdgeV(u), height: .6 + (parapetFoot(cap.x) - cap.top) * PARAPET_ART.scale * Math.SQRT2 } });
    }
  }
  return [-370, -15, 355].map(target => {
    const ordered = candidates.filter(c => c.side < 0).map(c => c.perch).sort((a, b) => Math.abs(a.u - target) - Math.abs(b.u - target));
    const first = ordered[0], second = candidates.filter(c => c.side > 0).map(c => c.perch)
      .sort((a, b) => Math.abs(a.u - (target + 30)) - Math.abs(b.u - (target + 30)))[0];
    if (!second) throw new Error('Raven needs two nearby wall perches');
    return [first, second] as const;
  });
}

export class MapRavens {
  readonly group = new Group();
  readonly errors: string[] = [];
  private ready = false;
  private disposed = false;
  private readonly map = new TextureLoader().load(atlasUrl, () => { if (!this.disposed) this.ready = true; }, undefined, () => this.errors.push('raven-atlas'));
  private readonly residents: { body: Mesh<PlaneGeometry, MeshBasicMaterial>; motion: RavenBehavior }[] = [];
  constructor() {
    this.group.name = 'map-ravens';
    this.map.colorSpace = SRGBColorSpace; this.map.magFilter = NearestFilter; this.map.minFilter = LinearMipmapLinearFilter;
    ravenPerches().forEach((perches, i) => {
      const body = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: this.map, alphaTest: .32, depthWrite: true, toneMapped: false, fog: false }));
      body.name = `raven-${i}`; body.visible = false;
      this.residents.push({ body, motion: new RavenBehavior(perches, i * 3.7) }); this.group.add(body);
    });
  }
  update(time: number, camera: ThreeCamera, visibleHeroes: readonly Point[]): void {
    if (this.disposed) return;
    for (const { body, motion } of this.residents) {
      motion.update(time, visibleHeroes);
      const frame = atlas.frames[motion.frame], [x, y, w, h] = frame.rect, [ax, ay] = frame.anchor;
      const scale = atlas.pixelScale, sign = motion.facing;
      const p = body.geometry.getAttribute('position'), uv = body.geometry.getAttribute('uv');
      p.setXYZ(0, -ax * scale * sign, ay * scale, 0); p.setXYZ(1, (w - ax) * scale * sign, ay * scale, 0);
      p.setXYZ(2, -ax * scale * sign, (ay - h) * scale, 0); p.setXYZ(3, (w - ax) * scale * sign, (ay - h) * scale, 0);
      // Mirroring positions reverses the winding; mirror UVs instead to keep front-face culling.
      if (sign < 0) { for (let row = 0; row < 2; row++) { const a = row * 2, b = a + 1, ax = p.getX(a); p.setX(a, p.getX(b)); p.setX(b, ax); } }
      const left = x / atlas.size[0], right = (x + w) / atlas.size[0], top = 1 - y / atlas.size[1], bottom = 1 - (y + h) / atlas.size[1];
      uv.setXY(0, sign > 0 ? left : right, top); uv.setXY(1, sign > 0 ? right : left, top);
      uv.setXY(2, sign > 0 ? left : right, bottom); uv.setXY(3, sign > 0 ? right : left, bottom);
      p.needsUpdate = uv.needsUpdate = true; body.geometry.computeBoundingSphere();
      body.position.copy(toThree(bridgePoint(motion.u, motion.v), motion.height + .5)); body.quaternion.copy(camera.camera.quaternion);
      body.visible = this.ready;
      body.userData.state = motion.state; body.userData.frame = motion.frame;
    }
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; disposeSceneResources(this.group); this.group.clear(); this.residents.length = 0; }
}
