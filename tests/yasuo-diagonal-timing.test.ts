import { describe, expect, it } from 'vitest';
import { attackFrameStart, attackSample, previewDurations } from '../assets/hero-attacks/2026-10-09/yasuo/v4-diagonal-ab/timing';
import study from '../assets/hero-attacks/2026-10-09/yasuo/v4-diagonal-ab/study.json';

describe('independent diagonal attacks', () => {
  const a = [50, 51, 49], b = [40, 60];
  it('A ends on its own recovery without starting B', () => {
    expect(attackSample(150, a, b, 'a', false)).toMatchObject({ variant: 'a', frame: 2, active: false });
  });
  it('B starts from its own first pose and stops on its last', () => {
    expect(attackSample(0, a, b, 'b', false)).toMatchObject({ variant: 'b', frame: 0, active: true });
    expect(attackSample(100, a, b, 'b', false)).toMatchObject({ variant: 'b', frame: 1, active: false });
  });
  it('A→B has no extra neutral frame and supports unequal counts', () => {
    expect(attackSample(149, a, b, 'ab', true)).toMatchObject({ variant: 'a', frame: 2 });
    expect(attackSample(150, a, b, 'ab', true)).toMatchObject({ variant: 'b', frame: 0 });
    expect(attackSample(250, a, b, 'ab', true)).toMatchObject({ variant: 'a', frame: 0 });
  });
  it('pair one-shot stops at B recovery', () => {
    expect(attackSample(1000, a, b, 'ab', false)).toMatchObject({ variant: 'b', frame: 1, active: false });
  });
  it('scrubs independent clips and the combined original order', () => {
    expect(attackFrameStart(1, a, b, 'a')).toBe(50);
    expect(attackFrameStart(1, a, b, 'b')).toBe(40);
    expect(attackFrameStart(3, a, b, 'ab')).toBe(150);
  });
  it('preview attack-speed scaling retains frames, order and time ratios', () => {
    expect(previewDurations([40, 60], 1200)).toEqual([480, 720]);
    expect(previewDurations([40, 60])).toEqual([40, 60]);
    expect(() => previewDurations([0], 1200)).toThrow();
    expect(() => previewDurations([40], 0)).toThrow();
  });
  it('every actual final frame appears in the A→B timeline in its original order', () => {
    const actualA = previewDurations(study.clips.a.durations_ms, 1200);
    const actualB = previewDurations(study.clips.b.durations_ms, 1200);
    expect(actualA).toHaveLength(study.clips.a.frame_count);
    expect(actualB).toHaveLength(study.clips.b.frame_count);
    expect(actualA.reduce((sum, duration) => sum + duration, 0)).toBeCloseTo(1200);
    expect(actualB.reduce((sum, duration) => sum + duration, 0)).toBeCloseTo(1200);
    let time = 0;
    for (const [index, duration] of [...actualA, ...actualB].entries()) {
      const sample = attackSample(time + duration / 2, actualA, actualB, 'ab', false);
      expect(sample).toMatchObject({ index, active: true, variant: index < actualA.length ? 'a' : 'b',
        frame: index < actualA.length ? index : index - actualA.length });
      time += duration;
    }
    expect(attackSample(time + 1, actualA, actualB, 'ab', false)).toMatchObject({ variant: 'b', frame: actualB.length - 1, active: false });
  });
});
