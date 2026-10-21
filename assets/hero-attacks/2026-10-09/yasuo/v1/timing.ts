/** Preview timing only: combat damage events must be authored separately. */
export function attackSample(elapsedMs: number, durations: readonly number[], loop = false, gapMs = 600): { frame: number; active: boolean } {
  if (!Number.isFinite(elapsedMs) || !durations.length || durations.some(d => !Number.isFinite(d) || d <= 0)
    || !Number.isFinite(gapMs) || gapMs < 0) throw new Error('Invalid attack preview timing');
  const duration = durations.reduce((sum, value) => sum + value, 0);
  const time = loop ? Math.max(0, elapsedMs) % (duration + gapMs) : Math.max(0, elapsedMs);
  if (time >= duration) return { frame: -1, active: false };
  let end = 0;
  for (let frame = 0; frame < durations.length; frame++) {
    end += durations[frame];
    if (time < end) return { frame, active: true };
  }
  return { frame: -1, active: false };
}
