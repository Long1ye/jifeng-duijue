export type ClipVariant = 'a' | 'b';
export interface ABFrame { variant: ClipVariant; frame: number; index: number; active: boolean }

/** Continuous A→B→A playback. No idle gap, duplicated boundary, or hidden frame alignment. */
export function abSample(elapsed: number, a: readonly number[], b: readonly number[], loop = true): ABFrame {
  const durations = [...a, ...b];
  if (!a.length || !b.length || durations.some(n => !Number.isFinite(n) || n <= 0)) throw new Error('Invalid timing');
  if (!Number.isFinite(elapsed)) throw new Error('Invalid elapsed time');
  const total = durations.reduce((sum, n) => sum + n, 0);
  const time = loop ? Math.max(0, elapsed) % total : Math.max(0, elapsed);
  if (!loop && time >= total) return { variant: 'b', frame: b.length - 1, index: durations.length - 1, active: false };
  let end = 0;
  for (let index = 0; index < durations.length; index++) {
    end += durations[index];
    if (time < end) return { variant: index < a.length ? 'a' : 'b', frame: index < a.length ? index : index - a.length, index, active: true };
  }
  throw new Error('Unreachable timing');
}

export function frameStart(index: number, a: readonly number[], b: readonly number[]): number {
  if (!Number.isInteger(index) || index < 0 || index >= a.length + b.length) throw new Error('Invalid frame index');
  return [...a, ...b].slice(0, index).reduce((sum, n) => sum + n, 0);
}
