export interface CycleSample { frame: number; active: boolean }
export function cycleSample(elapsed: number, durations: readonly number[], loop = true): CycleSample {
  if (!Number.isFinite(elapsed) || !durations.length || durations.some(d => !Number.isFinite(d) || d <= 0)) throw new Error('Invalid animation timing');
  const duration = durations.reduce((sum, d) => sum + d, 0);
  let time = Math.max(0, elapsed);
  if (!loop && time >= duration) return { frame: durations.length - 1, active: false };
  if (loop) time %= duration;
  let end = 0;
  for (let frame = 0; frame < durations.length; frame++) {
    end += durations[frame];
    if (time < end) return { frame, active: true };
  }
  throw new Error('Unreachable frame');
}
export function cycleFrameStart(frame: number, durations: readonly number[]): number {
  if (!Number.isInteger(frame) || frame < 0 || frame >= durations.length) throw new Error('Invalid frame');
  return durations.slice(0, frame).reduce((sum, d) => sum + d, 0);
}
