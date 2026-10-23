export type ClipId = 1 | 2 | 3 | 4;
export type PlaybackMode = 'full' | 'loop' | 'once' | ClipId;
export interface ClipTiming { id: ClipId; durations_ms: readonly number[] }
export interface Sample { clip: ClipId; frame: number; active: boolean; cycle: number }

function order(mode: PlaybackMode): { intro: ClipId[]; loop: ClipId[] } {
  if (mode === 'full') return { intro: [1, 2], loop: [3, 4] };
  if (mode === 'loop') return { intro: [], loop: [3, 4] };
  if (mode === 'once') return { intro: [1, 2, 3, 4], loop: [] };
  return { intro: [mode], loop: [] };
}

function clipFrames(clips: readonly ClipTiming[], id: ClipId): readonly number[] {
  const frames = clips.find(clip => clip.id === id)?.durations_ms;
  if (!frames?.length || frames.some(ms => !Number.isFinite(ms) || ms <= 0)) throw new RangeError(`Invalid clip ${id}`);
  return frames;
}

function duration(clips: readonly ClipTiming[], ids: readonly ClipId[]): number {
  return ids.reduce((sum, id) => sum + clipFrames(clips, id).reduce((a, b) => a + b, 0), 0);
}

function within(elapsed: number, clips: readonly ClipTiming[], ids: readonly ClipId[], active: boolean, cycle: number): Sample {
  for (const id of ids) for (const [frame, ms] of clipFrames(clips, id).entries()) {
    if (elapsed < ms) return { clip: id, frame, active, cycle };
    elapsed -= ms;
  }
  const id = ids.at(-1)!;
  return { clip: id, frame: clipFrames(clips, id).length - 1, active, cycle };
}

/** Play entry clips once, then repeat only the two independently generated attacks. */
export function sampleAt(elapsed: number, clips: readonly ClipTiming[], mode: PlaybackMode): Sample {
  if (!Number.isFinite(elapsed)) throw new RangeError('Elapsed time must be finite');
  const time = Math.max(0, elapsed), { intro, loop } = order(mode);
  const introDuration = duration(clips, intro);
  if (time < introDuration) return within(time, clips, intro, true, 0);
  if (!loop.length) return within(introDuration, clips, intro, false, 0);
  const loopDuration = duration(clips, loop), tailTime = time - introDuration;
  return within(tailTime % loopDuration, clips, loop, true, Math.floor(tailTime / loopDuration) + 1);
}

/** Seek into the first pass without dropping, reversing or replacing generated frames. */
export function frameStart(id: ClipId, frame: number, clips: readonly ClipTiming[], mode: PlaybackMode): number {
  const frames = clipFrames(clips, id), { intro, loop } = order(mode), ids = [...intro, ...loop];
  if (!Number.isInteger(frame) || frame < 0 || frame >= frames.length || !ids.includes(id)) throw new RangeError('Frame is not in this timeline');
  return duration(clips, ids.slice(0, ids.indexOf(id))) + frames.slice(0, frame).reduce((a, b) => a + b, 0);
}
