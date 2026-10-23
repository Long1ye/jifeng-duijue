/** Preview retiming only; generated frame pixels and source durations are untouched. */
export function sampleQ(milliseconds: number, durations: readonly number[], loop: boolean, playbackDuration?: number) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0 || !durations.length || durations.some(d => !Number.isFinite(d) || d <= 0)) {
    throw new RangeError('Invalid Q preview timing');
  }
  const sourceDuration = durations.reduce((sum, duration) => sum + duration, 0);
  const total = playbackDuration ?? sourceDuration;
  if (!Number.isFinite(total) || total <= 0) throw new RangeError('Invalid playback duration');
  const active = loop || milliseconds < total;
  const cycle = loop ? Math.floor(milliseconds / total) : 0;
  let sourceTime = (loop ? milliseconds % total : Math.min(milliseconds, total)) * sourceDuration / total;
  let frame = durations.length - 1;
  for (let index = 0; index < durations.length; index++) {
    if (sourceTime < durations[index]) { frame = index; break; }
    sourceTime -= durations[index];
  }
  return { frame, cycle, active, total };
}

export function frameStartQ(index: number, durations: readonly number[], playbackDuration?: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= durations.length) throw new RangeError('Invalid Q frame');
  sampleQ(0, durations, false, playbackDuration);
  const sourceDuration = durations.reduce((sum, duration) => sum + duration, 0);
  return durations.slice(0, index).reduce((sum, duration) => sum + duration, 0) * (playbackDuration ?? sourceDuration) / sourceDuration;
}
