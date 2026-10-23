import { EQ } from '../game/YasuoE';
import type { Entity } from '../game/types';

/** The generated bright cutting rim has radius 94px inside a 256px-wide cell. */
export const MEOWA_EQ_RIM = 94;
export function meowaEQPose(cast: NonNullable<Entity['eqCast']>, now: number) {
  const after = now - cast.triggerAt, recovery = cast.endsAt - cast.triggerAt;
  const lead = Math.min(.075, cast.triggerAt - cast.startedAt);
  const frame = after < 0 ? Math.min(1, Math.floor((after + lead) / lead * 2))
    : Math.min(7, 2 + Math.floor(after / Math.max(.001, recovery) * 6));
  const alpha = Math.max(0, Math.min(1, (after + lead) / .025, (recovery - after) / .07));
  return { visible: now >= cast.startedAt && after >= -lead && now < cast.endsAt,
    frame: Math.max(0, frame), alpha, width: EQ.radius * 256 / MEOWA_EQ_RIM,
    height: EQ.radius * 512 / MEOWA_EQ_RIM, ax: .5, ay: .5,
    stormWidth: EQ.radius * 256 / 110, stormHeight: EQ.radius * 512 / 110 * .72,
    stormAy: 400 / 512, empowered: !!cast.empowered };
}
