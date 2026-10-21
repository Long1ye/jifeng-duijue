import { describe, expect, it } from 'vitest';
import { cycleSample, cycleFrameStart } from '../assets/hero-attacks/2026-10-09/yasuo/v3-horizontal/timing';

describe('Dense-frame horizontal attack study', () => {
  const durations = [41, 42, 41, 42];
  it('uses decoded individual frame durations', () => {
    expect(cycleSample(40, durations).frame).toBe(0);
    expect(cycleSample(41, durations).frame).toBe(1);
    expect(cycleSample(83, durations).frame).toBe(2);
    expect(cycleFrameStart(3, durations)).toBe(124);
  });
  it('loops without adding an idle gap', () => {
    expect(cycleSample(165, durations).frame).toBe(3);
    expect(cycleSample(166, durations).frame).toBe(0);
    expect(cycleSample(332, durations).frame).toBe(0);
  });
  it('stops at the last frame for one complete cycle', () => {
    expect(cycleSample(166, durations, false)).toEqual({ frame: 3, active: false });
    expect(cycleSample(124, durations, false)).toEqual({ frame: 3, active: true });
  });
  it('supports more than sixteen generated frames', () => {
    const dense = Array(56).fill(42);
    expect(cycleSample(55 * 42, dense).frame).toBe(55);
    expect(cycleSample(56 * 42, dense).frame).toBe(0);
  });
  it('rejects invalid data and clamps negative elapsed time', () => {
    expect(cycleSample(-5, durations).frame).toBe(0);
    expect(() => cycleSample(0, [])).toThrow();
    expect(() => cycleSample(NaN, durations)).toThrow();
    expect(() => cycleSample(0, [0])).toThrow();
    expect(() => cycleFrameStart(-1, durations)).toThrow();
  });
});
