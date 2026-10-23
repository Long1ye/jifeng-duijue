import { describe, expect, it } from 'vitest';
import planA from '../assets/hero-attacks/2026-10-10/yasuo/v13-impact-no-fx-user/animation-A.plan.json';
import planB from '../assets/hero-attacks/2026-10-10/yasuo/v13-impact-no-fx-user/animation-B.plan.json';
import contract from '../assets/hero-attacks/2026-10-10/yasuo/v13-impact-no-fx-user/contract.json';

describe('new user-keyframe impact attack study', () => {
  it('submits exact user prompts with backend optimization, not a manual rewrite', () => {
    const prompts = [
      '亚索从高位挥砍到低位，动作自然流畅，要有打击感，不要有刀光',
      '亚索从低位挥砍到高位，动作自然流畅，要有打击感，不要有刀光',
    ];
    [planA, planB].forEach((plan, i) => {
      expect(plan.args[plan.args.indexOf('--prompt') + 1]).toBe(prompts[i]);
      expect(plan.args).toContain('--optimize-prompt');
      expect(plan.args).not.toContain('--no-optimize-prompt');
      expect(plan.args[plan.args.indexOf('--animation-model') + 1]).toBe('pixel-engine-v1.1');
      expect(plan.args[plan.args.indexOf('--total-frames') + 1]).toBe('8');
    });
  });

  it('plans exactly two independent clips with opposite endpoint references', () => {
    expect(contract.requested_clip_count).toBe(2);
    expect(contract.attack_loop_sequence).toEqual(['A', 'B']);
    expect(contract.runtime_integration_requested).toBe(false);
    [planA, planB].forEach((plan, i) => {
      const keys = plan.args.flatMap((arg, n) => arg === '--keyframe' ? [plan.args[n + 1]] : []);
      expect(keys).toHaveLength(2);
      expect(keys[0]).toMatch(new RegExp(`^0=.*pose-${i === 0 ? 1 : 2}\\.png$`));
      expect(keys[1]).toMatch(new RegExp(`^7=.*pose-${i === 0 ? 2 : 1}\\.png$`));
      expect(plan.recovery_command).toBe('animate-poll');
    });
    expect(planA.output_dir).not.toBe(planB.output_dir);
    expect(contract.inputs.map(input => input.source_size)).toEqual([[200, 128], [200, 128]]);
    expect(contract.inputs.every(input => input.pixels_preserved)).toBe(true);
  });
});
