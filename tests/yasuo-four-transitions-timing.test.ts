import { describe, expect, it } from 'vitest';
import { sampleAt, frameStart, type ClipId, type ClipTiming } from '../assets/hero-attacks/2026-10-10/yasuo/v7-user-prompts/timing';

const clips: ClipTiming[] = ([1, 2, 3, 4] as ClipId[]).map(id => ({ id, durations_ms: Array(12).fill(100) }));
describe('four user-authored Yasuo transitions', () => {
  it('plays entry and first slash once, then repeats only the two attacks', () => {
    expect(sampleAt(0, clips, 'full')).toEqual({ clip: 1, frame: 0, active: true, cycle: 0 });
    expect(sampleAt(1200, clips, 'full').clip).toBe(2);
    expect(sampleAt(2399, clips, 'full')).toEqual({ clip: 2, frame: 11, active: true, cycle: 0 });
    expect(sampleAt(2400, clips, 'full')).toEqual({ clip: 3, frame: 0, active: true, cycle: 1 });
    expect(sampleAt(3600, clips, 'full').clip).toBe(4);
    expect(sampleAt(4800, clips, 'full')).toEqual({ clip: 3, frame: 0, active: true, cycle: 2 });
    for (let time = 2400; time < 30000; time += 37) expect([3, 4]).toContain(sampleAt(time, clips, 'full').clip);
  });
  it('stops a single transition and a once-only sequence at their final frames', () => {
    for (const id of [1, 2, 3, 4] as const) expect(sampleAt(1200, clips, id)).toEqual({ clip: id, frame: 11, active: false, cycle: 0 });
    expect(sampleAt(4800, clips, 'once')).toEqual({ clip: 4, frame: 11, active: false, cycle: 0 });
  });
  it('starts attack-only looping from clip 3 and preserves original timing', () => {
    expect(sampleAt(0, clips, 'loop').clip).toBe(3);
    expect(sampleAt(1200, clips, 'loop').clip).toBe(4);
    expect(sampleAt(2400, clips, 'loop').clip).toBe(3);
    const varied = clips.map(clip => ({ ...clip, durations_ms: [40, 160, 80] }));
    expect(sampleAt(39, varied, 1).frame).toBe(0);
    expect(sampleAt(40, varied, 1).frame).toBe(1);
    expect(sampleAt(200, varied, 1).frame).toBe(2);
  });
  it('can seek all generated frames without deleting duplicate endpoint frames', () => {
    for (const id of [1, 2, 3, 4] as const) for (let frame = 0; frame < 12; frame++) {
      const sample = sampleAt(frameStart(id, frame, clips, 'full'), clips, 'full');
      expect([sample.clip, sample.frame]).toEqual([id, frame]);
    }
    expect(() => frameStart(1, 0, clips, 'loop')).toThrow(RangeError);
    expect(() => frameStart(3, 12, clips, 'full')).toThrow(RangeError);
    expect(() => sampleAt(Infinity, clips, 'full')).toThrow(RangeError);
  });
});
