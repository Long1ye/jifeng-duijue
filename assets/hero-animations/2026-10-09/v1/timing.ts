/** Playback timing only; never controls game movement. */
export function frameAt(elapsedMs: number, durationsMs: readonly number[], rate = 1): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || !Number.isFinite(rate) || rate <= 0 ||
    !durationsMs.length || durationsMs.some(duration => !Number.isFinite(duration) || duration <= 0)) {
    throw new RangeError('Expected finite nonnegative time, positive speed and frame durations');
  }
  const total = durationsMs.reduce((sum, duration) => sum + duration, 0);
  if (!Number.isFinite(total) || !Number.isFinite(elapsedMs * rate)) throw new RangeError('Playback time overflow');
  let time = (elapsedMs * rate) % total;
  for (let frame = 0; frame < durationsMs.length; frame += 1) {
    if (time < durationsMs[frame]) return frame;
    time -= durationsMs[frame];
  }
  return 0;
}
