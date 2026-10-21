import catalog from '../../assets/hero-skills/2026-10-12/yasuo/e-v7-fixed-right/catalog.json';
import { headingToDirection } from '../../assets/hero-walk-directions/2026-10-09/v1/direction';
import { E, isDashing } from '../game/YasuoE';
import type { Entity } from '../game/types';
export const YASUO_E_CLIPS = catalog.directions.map(d => ({
  key: `yasuo-e-${d.direction}`, direction: d.direction, width: d.width, height: d.height,
  frame_count: d.count, anchor: [64, 117], durations_ms: d.durations,
}));
export type YasuoEClip = typeof YASUO_E_CLIPS[number];
export function sampleYasuoE(entity: Entity, now: number) {
  if (!isDashing(entity, now) && !(entity.hp>0 && entity.eqCast && now<entity.eqCast.endsAt)) return null;
  const cast = entity.eCast ?? {startedAt:entity.eqCast!.eStartedAt,facing:entity.eqCast!.facing};
  const clip = YASUO_E_CLIPS.find(c => c.direction === headingToDirection(cast.facing))!;
  const progress = Math.max(0, Math.min(1, (now - cast.startedAt) / E.duration));
  return { clip, frame: Math.min(clip.frame_count - 1, Math.floor(progress * clip.frame_count)), state: 'E' as const, scale: 0.25 };
}
