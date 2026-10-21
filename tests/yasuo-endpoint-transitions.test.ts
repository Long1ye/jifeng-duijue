import { describe, expect, it } from 'vitest';
import { attackFrameStart, attackSample, previewDurations } from '../assets/hero-attacks/2026-10-09/yasuo/v4-diagonal-ab/timing';
import study from '../assets/hero-attacks/2026-10-09/yasuo/v6-no-fx-transitions/study.json';
import upward from '../assets/hero-attacks/2026-10-09/yasuo/v6-no-fx-transitions/a-to-b.plan.json';
import downward from '../assets/hero-attacks/2026-10-09/yasuo/v6-no-fx-transitions/b-to-a.plan.json';

describe('approved Yasuo endpoint transitions', () => {
  const option = (args: string[], name: string) => args[args.indexOf(name) + 1];
  it('uses the same aligned endpoints in opposite orders', () => {
    expect(option(upward.args, '--image-file')).toEqual(option(downward.args, '--last-image-file'));
    expect(option(upward.args, '--last-image-file')).toEqual(option(downward.args, '--image-file'));
    expect(option(upward.args, '--image-file')).toMatch(/a-aligned\.png$/);
    expect(option(upward.args, '--last-image-file')).toMatch(/b-aligned\.png$/);
  });
  it('submits single-attack prompts without effect-adding enhancement', () => {
    for (const plan of [upward, downward]) {
      expect(plan.command).toBe('meowa-animation-run');
      expect(plan.args).toContain('--no-optimize-prompt');
      expect(plan.args).not.toContain('--optimize-prompt');
      expect(option(plan.args, '--prompt')).toContain('exactly one');
      expect(option(plan.args, '--prompt')).toContain('no sword glow, light trails, afterimages, motion blur, particles or magic effects');
      expect(option(plan.args, '--animation-mode')).toBe('non_loop');
      expect(option(plan.args, '--padding')).toBe('0');
    }
  });
  it('retains every final frame and inserts no neutral frames between attacks', () => {
    const a = previewDurations(study.clips.a.durations_ms, 1200);
    const b = previewDurations(study.clips.b.durations_ms, 1200);
    expect(a).toHaveLength(study.clips.a.frame_count);
    expect(b).toHaveLength(study.clips.b.frame_count);
    let elapsed = 0;
    for (const [index, duration] of [...a, ...b].entries()) {
      const sample = attackSample(elapsed + duration / 2, a, b, 'ab', false);
      expect(sample).toMatchObject({ index, active: true, variant: index < a.length ? 'a' : 'b',
        frame: index < a.length ? index : index - a.length });
      expect(attackFrameStart(index, a, b, 'ab')).toBeCloseTo(elapsed);
      elapsed += duration;
    }
  });
  it('single attacks and one-shot pair stop at their own final frame', () => {
    const a = study.clips.a.durations_ms, b = study.clips.b.durations_ms;
    expect(attackSample(study.clips.a.duration_ms + 1, a, b, 'a', false)).toMatchObject({ variant: 'a', frame: a.length - 1, active: false });
    expect(attackSample(study.clips.b.duration_ms + 1, a, b, 'b', false)).toMatchObject({ variant: 'b', frame: b.length - 1, active: false });
    expect(attackSample(study.clips.a.duration_ms + study.clips.b.duration_ms + 1, a, b, 'ab', false)).toMatchObject({ variant: 'b', frame: b.length - 1, active: false });
  });
});
