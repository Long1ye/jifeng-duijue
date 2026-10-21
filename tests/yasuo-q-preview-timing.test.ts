import { describe, expect, it } from 'vitest';
import { sampleQ, frameStartQ } from '../assets/hero-skills/2026-10-10/yasuo/q-v1-se/timing';

describe('single Q study playback', () => {
  const durations = [100, 100, 60, 40, 80, 100, 100, 120];
  it('preserves source frame order and nonuniform duration boundaries', () => {
    expect(durations.map((_, index) => sampleQ(frameStartQ(index, durations) + 0.01, durations, false).frame)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(sampleQ(199, durations, false).frame).toBe(1);
    expect(sampleQ(200, durations, false).frame).toBe(2);
  });
  it('retimes the same frames to the demo duration without changing input', () => {
    const original = [...durations];
    expect(durations.map((_, index) => sampleQ(frameStartQ(index, durations, 450) + 0.01, durations, false, 450).frame)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(durations).toEqual(original);
  });
  it('ends on the last frame and loops back to the first only when requested', () => {
    expect(sampleQ(450, durations, false, 450)).toMatchObject({ frame: 7, active: false, cycle: 0 });
    expect(sampleQ(900, durations, true, 450)).toMatchObject({ frame: 0, active: true, cycle: 2 });
  });
  it('rejects empty, negative and nonfinite timings and invalid frame indices', () => {
    for (const bad of [-1, NaN, Infinity]) expect(() => sampleQ(bad, durations, true)).toThrow(RangeError);
    expect(() => sampleQ(0, [], true)).toThrow(RangeError);
    expect(() => sampleQ(0, [0], true)).toThrow(RangeError);
    expect(() => sampleQ(0, [100], true, 0)).toThrow(RangeError);
    expect(() => frameStartQ(8, durations)).toThrow(RangeError);
  });
});
