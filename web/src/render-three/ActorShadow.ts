import type { BufferGeometry } from 'three';
import { QUALITY_TUNING } from './QualitySettings';

/** Project the current atlas silhouette along the fixed sun, using four vertices.
 * The painted billboard's camera-facing depth is not physical body depth. */
export function projectActorShadow(body: BufferGeometry, shadow: BufferGeometry, lift: number) {
  const source = body.getAttribute('position'), target = shadow.getAttribute('position');
  for (let i = 0; i < source.count; i++) {
    // At the fixed 45° view a vertical height projects at 1/sqrt(2).
    // Recover that upright height instead of flattening the billboard depth.
    const height = Math.max(0, source.getY(i) * Math.SQRT2) + Math.max(0, lift);
    target.setXYZ(i, source.getX(i) + height * QUALITY_TUNING.actorShadowSunX, 0, height * QUALITY_TUNING.actorShadowSunZ);
  }
  target.needsUpdate = true;
  const sourceUv = body.getAttribute('uv'), targetUv = shadow.getAttribute('uv');
  for (let i = 0; i < sourceUv.count; i++) targetUv.setXY(i, sourceUv.getX(i), sourceUv.getY(i));
  targetUv.needsUpdate = true;
}
