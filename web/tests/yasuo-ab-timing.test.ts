import { describe, expect, it } from 'vitest';
import { abSample, frameStart } from '../assets/hero-attacks/2026-10-09/yasuo/v2-ab/timing';

describe('Yasuo A/B study sequencer', () => {
  const a = Array(8).fill(100), b = Array(8).fill(100);
  it('plays every A and B frame in order without gaps', () => {
    for (let i = 0; i < 16; i++) expect(abSample(i * 100, a, b)).toEqual({
      variant: i < 8 ? 'a' : 'b', frame: i % 8, index: i, active: true,
    });
  });
  it('crosses both A/B and B/A boundaries at the correct time', () => {
    expect(abSample(799, a, b).index).toBe(7);
    expect(abSample(800, a, b).index).toBe(8);
    expect(abSample(1599, a, b).index).toBe(15);
    expect(abSample(1600, a, b).index).toBe(0);
  });
  it('uses individual frame durations, not a fixed FPS', () => {
    expect(abSample(69, [30, 40], [50, 60]).index).toBe(1);
    expect(abSample(70, [30, 40], [50, 60]).index).toBe(2);
    expect(frameStart(3, [30, 40], [50, 60])).toBe(120);
  });
  it('stops on the last B frame after one pair', () => {
    expect(abSample(1600, a, b, false)).toEqual({ variant: 'b', frame: 7, index: 15, active: false });
    expect(abSample(2000, a, b, false).active).toBe(false);
  });
  it('clamps negative elapsed time and rejects invalid inputs', () => {
    expect(abSample(-10, a, b).index).toBe(0);
    expect(() => abSample(NaN, a, b)).toThrow();
    expect(() => abSample(0, [], b)).toThrow();
    expect(() => abSample(0, [0], b)).toThrow();
    expect(() => frameStart(16, a, b)).toThrow();
  });
});
