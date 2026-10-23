import { abSample, frameStart } from '../v2-ab/timing';
import { cycleSample, cycleFrameStart } from '../v3-horizontal/timing';

export type AttackMode = 'a' | 'b' | 'ab';
/** Preview-only attack-speed scaling. Preserves every original frame and relative timing. */
export function previewDurations(durations: readonly number[], targetMs?: number): number[] {
  if (!durations.length || durations.some(value => !Number.isFinite(value) || value <= 0)) throw new Error('Invalid timing');
  if (targetMs === undefined) return [...durations];
  if (!Number.isFinite(targetMs) || targetMs <= 0) throw new Error('Invalid preview attack duration');
  const factor = targetMs / durations.reduce((sum, value) => sum + value, 0);
  return durations.map(value => value * factor);
}
export function attackSample(elapsed: number, a: readonly number[], b: readonly number[], mode: AttackMode, loop: boolean) {
  if (mode === 'ab') return abSample(elapsed, a, b, loop);
  const clip = mode === 'a' ? a : b;
  const sample = cycleSample(elapsed, clip, loop);
  return { ...sample, variant: mode, index: sample.frame };
}
export function attackFrameStart(index: number, a: readonly number[], b: readonly number[], mode: AttackMode): number {
  return mode === 'ab' ? frameStart(index, a, b) : cycleFrameStart(index, mode === 'a' ? a : b);
}
