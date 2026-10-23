import { describe, expect, it } from 'vitest';
import { attackSample } from '../assets/hero-attacks/2026-10-09/yasuo/v1/timing';
describe('single basic attack preview', () => {
  const durations = Array(8).fill(100);
  it('plays exactly one attack then returns to idle, not another attack', () => {
    expect(attackSample(0, durations)).toEqual({ frame: 0, active: true });
    expect(attackSample(799, durations).frame).toBe(7);
    expect(attackSample(800, durations)).toEqual({ frame: -1, active: false });
    expect(attackSample(1600, durations).active).toBe(false);
  });
  it('loops only with the explicit idle gap', () => {
    expect(attackSample(800, durations, true).active).toBe(false);
    expect(attackSample(1399, durations, true).active).toBe(false);
    expect(attackSample(1400, durations, true).frame).toBe(0);
  });
  it('supports uneven durations and exact boundaries', () => {
    expect(attackSample(49, [50, 100, 150]).frame).toBe(0);
    expect(attackSample(50, [50, 100, 150]).frame).toBe(1);
    expect(attackSample(150, [50, 100, 150]).frame).toBe(2);
    expect(attackSample(-1, durations).frame).toBe(0);
  });
  it('rejects invalid timing data', () => {
    for (const durations of [[], [0], [NaN], [-1]]) expect(() => attackSample(0, durations)).toThrow();
    expect(() => attackSample(Infinity, durations)).toThrow();
    expect(() => attackSample(0, durations, true, -1)).toThrow();
  });
});
