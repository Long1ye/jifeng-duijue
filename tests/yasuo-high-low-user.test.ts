import { describe, expect, it } from 'vitest';
import planA from '../assets/hero-attacks/2026-10-10/yasuo/v12-high-low-user/animation-A.plan.json';
import planB from '../assets/hero-attacks/2026-10-10/yasuo/v12-high-low-user/animation-B.plan.json';
import { sampleAt, type ClipTiming } from '../assets/hero-attacks/2026-10-10/yasuo/v8-user-ab/timing';

describe('user high-low attack cycle', () => {
  it('preserves both exact prompts and enables automatic optimization', () => {
    const prompts = ['亚索从高位挥砍到低位，动作自然流畅', '亚索从低位向上挥砍到高位，动作自然流畅'];
    [planA, planB].forEach((plan, index) => {
      expect(plan.command).toBe('keyframes-run');
      expect(plan.args[plan.args.indexOf('--prompt') + 1]).toBe(prompts[index]);
      expect(plan.args).toContain('--optimize-prompt'); expect(plan.args).not.toContain('--no-optimize-prompt');
      expect(plan.args[plan.args.indexOf('--total-frames') + 1]).toBe('8');
      const poses = plan.args.flatMap((arg, i) => arg === '--keyframe' ? [plan.args[i + 1]] : []);
      expect(poses[0]).toMatch(new RegExp(`^0=.*pose-${index === 0 ? 1 : 2}\\.png$`));
      expect(poses[1]).toMatch(new RegExp(`^7=.*pose-${index === 0 ? 2 : 1}\\.png$`));
    });
    expect(planA.output_dir).not.toBe(planB.output_dir);
  });
  it('plays every frame in A then B order without reversing or dropping endpoints', () => {
    const clips: ClipTiming[] = ['A', 'B'].map(id => ({ id: id as 'A' | 'B', durations_ms: Array(8).fill(100) }));
    const samples = Array.from({ length: 16 }, (_, frame) => sampleAt(frame * 100, clips, 'loop'));
    expect(samples.map(sample => `${sample.clip}${sample.frame}`)).toEqual([
      'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7']);
    expect(sampleAt(1600, clips, 'loop')).toEqual({ clip: 'A', frame: 0, active: true, cycle: 2 });
    expect(sampleAt(1600, clips, 'once')).toEqual({ clip: 'B', frame: 7, active: false, cycle: 0 });
  });
});
