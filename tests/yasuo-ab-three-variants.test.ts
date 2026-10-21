import { describe, expect, it } from 'vitest';
import batch from '../assets/hero-attacks/2026-10-10/yasuo/v9-three-variants/batch.json';
import contract from '../assets/hero-attacks/2026-10-10/yasuo/v9-three-variants/contract.json';
import a1 from '../assets/hero-attacks/2026-10-10/yasuo/v9-three-variants/variant-1/animation-A.plan.json';
import b1 from '../assets/hero-attacks/2026-10-10/yasuo/v9-three-variants/variant-1/animation-B.plan.json';
import a2 from '../assets/hero-attacks/2026-10-10/yasuo/v9-three-variants/variant-2/animation-A.plan.json';
import b2 from '../assets/hero-attacks/2026-10-10/yasuo/v9-three-variants/variant-2/animation-B.plan.json';
import a3 from '../assets/hero-attacks/2026-10-10/yasuo/v9-three-variants/variant-3/animation-A.plan.json';
import b3 from '../assets/hero-attacks/2026-10-10/yasuo/v9-three-variants/variant-3/animation-B.plan.json';

const pairs = [[a1, b1], [a2, b2], [a3, b3]];
describe('three additional pairs, not three duplicate batches', () => {
  it('creates exactly six finite jobs in distinct output directories', () => {
    expect(contract.variant_count).toBe(3); expect(contract.animation_count).toBe(6);
    expect(batch).toHaveLength(6); expect(new Set(batch).size).toBe(6);
    expect(new Set(pairs.flat().map(plan => plan.output_dir)).size).toBe(6);
  });
  it('keeps user prompts and all generation parameters identical across variants', () => {
    for (const [a, b] of pairs) {
      expect(a.args).toEqual(a1.args); expect(b.args).toEqual(b1.args);
      for (const [id, plan] of [['A', a], ['B', b]] as const) {
        expect(plan.command).toBe('keyframes-run');
        expect(plan.args[plan.args.indexOf('--prompt') + 1]).toBe(contract.prompts[id]);
        expect(plan.args).toContain('--optimize-prompt');
        expect(plan.args).not.toContain('--no-optimize-prompt');
        expect(plan.args[plan.args.indexOf('--total-frames') + 1]).toBe('8');
      }
    }
  });
});
