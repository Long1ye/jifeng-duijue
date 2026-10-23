import { describe, expect, it } from 'vitest';
import { createEPractice } from '../src/game/EPractice';
import { sampleYasuoE } from '../src/render/YasuoEAnimation';
import { E } from '../src/game/YasuoE';
describe('dedicated E art and practice',()=>{
  for(const [i,d] of ['e','se','s','sw','w','nw','n','ne'].entries()) it(`casts ${d} using its dedicated eight frames`,()=>{
    const m=createEPractice();m.start();const h=m.hero('blue');
    const targets=m.entities.filter(e=>e.team==='red'&&e.kind==='melee');expect(targets).toHaveLength(8);
    expect(targets.every(t=>t.speed===0&&t.damage===0&&t.hp===2000)).toBe(true);
    expect(m.cast('blue','e',targets[i])).toBe(true);
    for(let f=0;f<8;f++){
      const s=sampleYasuoE(h,(f+.1)*E.duration/8)!;
      expect(s.clip.key).toBe(`yasuo-e-${d}`);expect(s.frame).toBe(f);expect(s.clip.anchor).toEqual([64,117]);
    }
    expect(sampleYasuoE(h,E.duration)).toBeNull();
    m.step(E.duration);expect(targets[i].hp).toBe(1945);
  });
});
