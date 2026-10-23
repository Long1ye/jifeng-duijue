import type { Entity } from './types';

/** V11's committed cast: input orders are retained and resume after recovery. */
export const YASUO_Q_CAST_SECONDS = 0.72;
/** Contact is the first sword-flash frame in the approved 37-frame draw animation. */
export const YASUO_Q_HIT_SECONDS = 22 / 37 * YASUO_Q_CAST_SECONDS;
export const YASUO_Q_HALF_WIDTH = 6;
export function isYasuoQCasting(entity: Entity, now: number): boolean {
  return entity.kind === 'hero' && entity.hp > 0 && entity.qCast !== null &&
    now >= entity.qCast.startedAt && now < entity.qCast.startedAt + YASUO_Q_CAST_SECONDS;
}
