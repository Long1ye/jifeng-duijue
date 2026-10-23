import type { Point } from '../game/types';
import { BRIDGE } from '../game/Bridge';
import { unproject } from '../../assets/map-studies/howling-abyss-v1/geometry';
import { ART_BRUSHES } from './PaintedMapLayout';

/** Use the authored ground footprint, not the grass card's tall silhouette. */
export function brushAt(point: Point): string | null {
  const [u, v] = unproject(BRIDGE, point.x, point.y);
  return ART_BRUSHES.find(brush => Math.abs(u - brush.u) <= brush.length / 2 && Math.abs(v - brush.v) <= brush.width / 2)?.id ?? null;
}
