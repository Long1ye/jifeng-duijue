import { describe, expect, it } from 'vitest';
import contract from '../assets/hero-attacks/2026-10-10/yasuo/v11-walk-six/contract.json';
import batch from '../assets/hero-attacks/2026-10-10/yasuo/v11-walk-six/animations.batch.json';
import resume from '../assets/hero-attacks/2026-10-10/yasuo/v11-walk-six/resume.batch.json';
import entry from '../assets/hero-attacks/2026-10-10/yasuo/v11-walk-six/variant-2/entry.plan.json';
import second from '../assets/hero-attacks/2026-10-10/yasuo/v11-walk-six/variant-2/second.plan.json';
import repeat from '../assets/hero-attacks/2026-10-10/yasuo/v11-walk-six/variant-2/repeat.plan.json';
const input='assets/hero-attacks/2026-10-10/yasuo/v11-walk-six/inputs/';
describe('six independently generated walk-based attacks',()=>{
  it('uses three jobs per version and omits the unknown submission at the human request',()=>{
    expect(batch).toHaveLength(18);expect(new Set(batch).size).toBe(18);
    expect(resume).toHaveLength(17);
    expect(resume).not.toContain('assets/hero-attacks/2026-10-10/yasuo/v11-walk-six/variant-1/second.plan.json');
    expect(contract.requested_omission.variant).toBe(1);expect(contract.requested_omission.clip).toBe('second');
  });
  it('starts with the actual walk and joins the two distinct key poses in both directions',()=>{
    expect(entry.args).toContain(`0=${input}walk-8.png`);expect(entry.args).toContain(`7=${input}first-end.png`);
    expect(second.args).toContain(`0=${input}first-end.png`);expect(second.args).toContain(`7=${input}second-end.png`);
    expect(repeat.args).toContain(`0=${input}second-end.png`);expect(repeat.args).toContain(`7=${input}first-end.png`);
    for(const plan of [entry,second,repeat]) {
      expect(plan.command).toBe('keyframes-run');expect(plan.args).toContain('--optimize-prompt');
      expect(plan.args).toContain('pixel-engine-v1.1');expect(plan.args[plan.args.indexOf('--prompt')+1]).toContain('不要刀光');
    }
    expect(contract.input_pixels_resampled).toBe(false);expect(contract.poses_reviewed).toBe(true);
  });
});
