import registry from '../../assets/heroes/yasuo/q-meowa-eight-2026-10-13/animations.json';
import { headingToDirection } from '../../assets/hero-walk-directions/2026-10-09/v1/direction';
import { isYasuoQCasting } from '../game/YasuoQ';
import type { Entity } from '../game/types';

export const YASUO_Q_ASSETS = registry;
export type YasuoQClip = typeof registry.clips[number];
export const Q_DIRECTION_LABELS: Record<string, string> = { e: '正右', se: '右下', s: '正下', sw: '左下', w: '正左', nw: '左上', n: '正上', ne: '右上' };

export function sampleYasuoQ(entity: Entity, now: number) {
  if (!isYasuoQCasting(entity, now)) return null;
  const cast = entity.qCast!;
  // Quantize the artwork once from the accepted cast, independent of walking hysteresis.
  const direction = headingToDirection(cast.facing);
  const clip = registry.clips.find(candidate => candidate.direction === direction)!;
  const elapsedMs = Math.max(0, now - cast.startedAt) * 1000;
  const frame = Math.min(clip.frame_count - 1, Math.floor(elapsedMs / registry.sample_step_ms));
  return { clip, frame, state: 'Q' as const, scale: registry.scale_in_world };
}
