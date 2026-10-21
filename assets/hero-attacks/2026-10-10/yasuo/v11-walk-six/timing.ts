export type Segment = 'walk' | 'entry' | 'second' | 'repeat';
export interface Timing { durations_ms: number[]; duration_ms: number }
export function frameAt(elapsed: number, clip: Timing): number {
  const time = ((elapsed % clip.duration_ms) + clip.duration_ms) % clip.duration_ms;
  let edge = 0;
  for (let i = 0; i < clip.durations_ms.length; i++) {
    edge += clip.durations_ms[i];
    if (time < edge) return i;
  }
  return clip.durations_ms.length - 1;
}
export function sequenceAt(elapsed: number, timings: Record<Segment, Timing>): { segment: Segment; frame: number; cycle: number } {
  const time = Math.max(0, elapsed);
  if (time < timings.walk.duration_ms) return { segment: 'walk', frame: frameAt(time, timings.walk), cycle: 0 };
  const attack = time - timings.walk.duration_ms;
  if (attack < timings.entry.duration_ms) return { segment: 'entry', frame: frameAt(attack, timings.entry), cycle: 0 };
  const repeated = attack - timings.entry.duration_ms;
  const length = timings.second.duration_ms + timings.repeat.duration_ms;
  const within = repeated % length;
  return within < timings.second.duration_ms
    ? { segment: 'second', frame: frameAt(within, timings.second), cycle: Math.floor(repeated / length) + 1 }
    : { segment: 'repeat', frame: frameAt(within - timings.second.duration_ms, timings.repeat), cycle: Math.floor(repeated / length) + 1 };
}
