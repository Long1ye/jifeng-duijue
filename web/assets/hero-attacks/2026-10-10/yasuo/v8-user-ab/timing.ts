export type ClipId = 'A' | 'B';
export type PlaybackMode = 'loop' | 'once' | ClipId;
export interface ClipTiming { id: ClipId; durations_ms: readonly number[] }
export interface Sample { clip: ClipId; frame: number; active: boolean; cycle: number }

function order(mode: PlaybackMode): ClipId[] {
  return mode === 'loop' || mode === 'once' ? ['A', 'B'] : [mode];
}
function clipFrames(clips: readonly ClipTiming[], id: ClipId): readonly number[] {
  const frames = clips.find(clip => clip.id === id)?.durations_ms;
  if (!frames?.length || frames.some(ms => !Number.isFinite(ms) || ms <= 0)) throw new RangeError(`Invalid clip ${id}`);
  return frames;
}
function duration(clips: readonly ClipTiming[], ids: readonly ClipId[]): number {
  return ids.reduce((sum, id) => sum + clipFrames(clips, id).reduce((a, b) => a + b, 0), 0);
}
/** Keep every generated frame, in original order and with original durations. */
export function sampleAt(elapsed: number, clips: readonly ClipTiming[], mode: PlaybackMode): Sample {
  if (!Number.isFinite(elapsed)) throw new RangeError('Elapsed time must be finite');
  const ids = order(mode), total = duration(clips, ids), time = Math.max(0, elapsed);
  const looping = mode === 'loop', active = looping || time < total;
  const cycle = looping ? Math.floor(time / total) + 1 : 0;
  let remaining = looping ? time % total : time;
  for (const id of ids) for (const [frame, ms] of clipFrames(clips, id).entries()) {
    if (remaining < ms) return { clip: id, frame, active, cycle };
    remaining -= ms;
  }
  const clip = ids.at(-1)!;
  return { clip, frame: clipFrames(clips, clip).length - 1, active, cycle };
}
export function frameStart(id: ClipId, frame: number, clips: readonly ClipTiming[], mode: PlaybackMode): number {
  const frames = clipFrames(clips, id), ids = order(mode);
  if (!Number.isInteger(frame) || frame < 0 || frame >= frames.length || !ids.includes(id)) throw new RangeError('Frame is not in this timeline');
  return duration(clips, ids.slice(0, ids.indexOf(id))) + frames.slice(0, frame).reduce((a, b) => a + b, 0);
}
