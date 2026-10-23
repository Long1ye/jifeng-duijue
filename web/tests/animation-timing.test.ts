import { describe, expect, it } from 'vitest';
import { frameAt } from '../assets/hero-animations/2026-10-09/v1/timing';
import study from '../assets/hero-animations/2026-10-09/v1/study.json';

describe('animation preview timing', () => {
  const durations = Array<number>(8).fill(100);
  it('plays all eight frames and loops without showing the empty ninth cell', () => {
    for (let i = 0; i < 16; i++) expect(frameAt(i * 100, durations)).toBe(i % 8);
    expect(frameAt(799, durations)).toBe(7);
    expect(frameAt(800, durations)).toBe(0);
  });
  it('honours variable frame durations', () => {
    expect(frameAt(49, [50, 150, 100])).toBe(0);
    expect(frameAt(50, [50, 150, 100])).toBe(1);
    expect(frameAt(200, [50, 150, 100])).toBe(2);
    expect(frameAt(300, [50, 150, 100])).toBe(0);
  });
  it('supports half and double speed', () => {
    expect(frameAt(200, durations, 0.5)).toBe(1);
    expect(frameAt(200, durations, 2)).toBe(4);
  });
  it('rejects invalid input', () => {
    for (const t of [-1, NaN, Infinity]) expect(() => frameAt(t, durations)).toThrow(RangeError);
    for (const rate of [0, -1, NaN, Infinity]) expect(() => frameAt(0, durations, rate)).toThrow(RangeError);
    for (const frames of [[], [0], [-1], [Infinity], [NaN]]) expect(() => frameAt(0, frames)).toThrow(RangeError);
  });
  it('registers exactly six primary-direction clips, not a full eight-direction set', () => {
    expect(study.heroes).toHaveLength(3);
    expect(study.heroes.flatMap(hero => hero.clips)).toHaveLength(6);
    expect(study.direction_count).toBe(1);
    expect(study.runtime_integration).toBe(false);
    for (const hero of study.heroes) {
      expect(hero.clips.map(clip => clip.state)).toEqual(['idle', 'walk']);
      for (const clip of hero.clips) {
        expect(clip.frame_count).toBe(8);
        expect(clip.durations_ms.reduce((sum, duration) => sum + duration, 0)).toBe(clip.duration_ms);
        expect(clip.duration_ms).toBe(800);
      }
    }
  });
});
