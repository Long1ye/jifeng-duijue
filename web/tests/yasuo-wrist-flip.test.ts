import { describe, expect, it } from 'vitest';
import plan from '../assets/hero-attacks/2026-10-10/yasuo/v10-wrist-flip/animation-B.plan.json';
import contract from '../assets/hero-attacks/2026-10-10/yasuo/v10-wrist-flip/contract.json';

describe('one Yasuo B wrist-flip study', () => {
  const option = (name: string) => plan.args[plan.args.indexOf(name) + 1];
  it('uses the reviewed prompt and automatic optimization', () => {
    expect(option('--prompt')).toBe(contract.approved_motion_prompt);
    expect(plan.args).toContain('--optimize-prompt');
    expect(plan.args).not.toContain('--no-optimize-prompt');
  });
  it('plans only B, with original low/high endpoint images and twelve frames', () => {
    expect(plan.command).toBe('keyframes-run');
    expect(plan.args.filter(arg => arg === '--keyframe')).toHaveLength(2);
    expect(plan.args).toContain('0=assets/hero-attacks/2026-10-10/yasuo/v10-wrist-flip/inputs/low.png');
    expect(plan.args).toContain('11=assets/hero-attacks/2026-10-10/yasuo/v10-wrist-flip/inputs/high.png');
    expect(option('--total-frames')).toBe('12');
    expect(plan.output_dir).toMatch(/v10-wrist-flip\/clips\/animation-B$/);
    expect(contract.pose_preparation_review.accepted).toBe(false);
  });
});
