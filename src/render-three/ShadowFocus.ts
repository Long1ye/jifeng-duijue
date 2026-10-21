import { DirectionalLight, Vector3 } from 'three';
import { toThree, type ThreeCamera } from './Coordinates';
import { QUALITY_TUNING } from './QualitySettings';

/** Fit a directional shadow to visible ground plus tall, nearby painted casters. */
export class ShadowFocus {
  private readonly direction = new Vector3(-400, 850, 350).normalize().multiplyScalar(3500);
  private last = '';
  constructor(private readonly sun: DirectionalLight) {
    sun.shadow.mapSize.set(QUALITY_TUNING.shadowMapSize, QUALITY_TUNING.shadowMapSize);
  }
  update(rig: ThreeCamera, enabled: boolean, casterSignature = '') {
    const light = this.sun, camera = light.shadow.camera;
    if (!enabled) {
      light.shadow.autoUpdate = true;
      light.position.set(-400, 850, 350); light.target.position.set(0, 0, 0);
      light.updateMatrixWorld(); light.target.updateMatrixWorld();
      Object.assign(camera, { left: -3200, right: 3200, top: 2200, bottom: -2200, near: 1, far: 6000 });
      camera.updateProjectionMatrix(); this.last = ''; return;
    }
    light.shadow.autoUpdate = false;
    const focus = toThree(rig.focus), corners: Vector3[] = [];
    for (const x of [0, rig.size.width]) for (const y of [0, rig.size.height]) {
      const point = rig.pick({ x, y }, { left: 0, top: 0, ...rig.size });
      if (point) for (const height of [0, 420]) corners.push(toThree(point, height));
    }
    const aim = (target: Vector3) => {
      light.target.position.copy(target); light.position.copy(target).add(this.direction);
      light.updateMatrixWorld(); light.target.updateMatrixWorld();
      camera.position.copy(light.position); camera.lookAt(target); camera.updateMatrixWorld();
    };
    aim(focus);
    const local = corners.map(point => point.clone().applyMatrix4(camera.matrixWorldInverse));
    const span = (axis: 'x' | 'y') => Math.max(QUALITY_TUNING.shadowMinimumExtent, Math.ceil((Math.max(...local.map(p => p[axis])) - Math.min(...local.map(p => p[axis])) + QUALITY_TUNING.shadowPadding * 2) / 64) * 64);
    const width = span('x'), height = span('y'), texelX = width / light.shadow.mapSize.x, texelY = height / light.shadow.mapSize.y;
    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion), up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    focus.addScaledVector(right, Math.round(focus.dot(right) / texelX) * texelX - focus.dot(right));
    focus.addScaledVector(up, Math.round(focus.dot(up) / texelY) * texelY - focus.dot(up)); aim(focus);
    const points = corners.map(point => point.applyMatrix4(camera.matrixWorldInverse));
    const centerX = (Math.max(...points.map(p => p.x)) + Math.min(...points.map(p => p.x))) / 2;
    const centerY = (Math.max(...points.map(p => p.y)) + Math.min(...points.map(p => p.y))) / 2;
    const cx = Math.round(centerX / texelX) * texelX, cy = Math.round(centerY / texelY) * texelY;
    Object.assign(camera, { left: cx - width / 2, right: cx + width / 2, top: cy + height / 2, bottom: cy - height / 2, near: 1, far: 10000 }); camera.updateProjectionMatrix();
    const signature = [focus.x, focus.y, focus.z, width, height, cx, cy, casterSignature].join(',');
    if (signature !== this.last) { light.shadow.needsUpdate = true; this.last = signature; }
  }
}
