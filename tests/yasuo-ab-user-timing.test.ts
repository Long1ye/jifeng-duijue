import { describe, expect, it } from 'vitest';
import { sampleAt, frameStart, type ClipTiming } from '../assets/hero-attacks/2026-10-10/yasuo/v8-user-ab/timing';
import planA from '../assets/hero-attacks/2026-10-10/yasuo/v8-user-ab/animation-A.plan.json';
import planB from '../assets/hero-attacks/2026-10-10/yasuo/v8-user-ab/animation-B.plan.json';

const clips: ClipTiming[] = ['A', 'B'].map(id => ({ id: id as 'A' | 'B', durations_ms: Array(8).fill(100) }));
describe('two independently generated user-authored Yasuo attacks', () => {
  it('loops A then B without reversing or dropping endpoint frames', () => {
    expect(sampleAt(0, clips, 'loop')).toEqual({ clip: 'A', frame: 0, active: true, cycle: 1 });
    expect(sampleAt(799, clips, 'loop').frame).toBe(7);
    expect(sampleAt(800, clips, 'loop')).toEqual({ clip: 'B', frame: 0, active: true, cycle: 1 });
    expect(sampleAt(1599, clips, 'loop').frame).toBe(7);
    expect(sampleAt(1600, clips, 'loop')).toEqual({ clip: 'A', frame: 0, active: true, cycle: 2 });
  });
  it('stops individual clips and a once-only sequence at the final frame', () => {
    for (const id of ['A', 'B'] as const) expect(sampleAt(800, clips, id)).toEqual({ clip: id, frame: 7, active: false, cycle: 0 });
    expect(sampleAt(1600, clips, 'once')).toEqual({ clip: 'B', frame: 7, active: false, cycle: 0 });
  });
  it('preserves per-frame timing and can seek every frame', () => {
    const varied: ClipTiming[] = [{ id: 'A', durations_ms: [40, 160, 80] }, clips[1]];
    expect(sampleAt(40, varied, 'A').frame).toBe(1);
    expect(sampleAt(200, varied, 'A').frame).toBe(2);
    for (const id of ['A', 'B'] as const) for (let frame = 0; frame < 8; frame++) {
      const sample = sampleAt(frameStart(id, frame, clips, 'loop'), clips, 'loop');
      expect([sample.clip, sample.frame]).toEqual([id, frame]);
    }
    expect(() => frameStart('B', 0, clips, 'A')).toThrow(RangeError);
    expect(() => frameStart('A', 8, clips, 'loop')).toThrow(RangeError);
    expect(() => sampleAt(Infinity, clips, 'loop')).toThrow(RangeError);
  });
  it('submits exact user prompts with optimization and opposite endpoint references', () => {
    const plans = { A: planA, B: planB };
    const prompts = { A: '绘制第二次挥刀动画，第一次挥刀结束自然过渡到第二次挥刀结束', B: '绘制第一次挥刀动画，第二次挥刀结束自然过渡到第一次挥刀结束' };
    for (const id of ['A', 'B'] as const) {
      const plan = plans[id];
      expect(plan.command).toBe('keyframes-run');
      expect(plan.args[plan.args.indexOf('--prompt') + 1]).toBe(prompts[id]);
      expect(plan.args).toContain('--optimize-prompt');
      expect(plan.args).not.toContain('--no-optimize-prompt');
      const keys = plan.args.flatMap((arg, index) => arg === '--keyframe' ? [plan.args[index + 1]] : []);
      expect(keys[0]).toMatch(new RegExp(`^0=.*pose-${id === 'A' ? 1 : 2}\\.png$`));
      expect(keys[1]).toMatch(new RegExp(`^7=.*pose-${id === 'A' ? 2 : 1}\\.png$`));
    }
  });
});
