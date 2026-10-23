import { describe, expect, it } from 'vitest';
import { DIRECTIONS, sample } from '../assets/hero-skills/2026-10-12/yasuo/eq-v3-eight-dash/timeline';
describe('EQ eight-direction visual trial',()=>{
  it('uses eight normalized distinct headings',()=>{
    expect(new Set(DIRECTIONS.map(d=>d.id)).size).toBe(8);
    for(const d of DIRECTIONS)expect(Math.hypot(d.x,d.y)).toBeCloseTo(1);
  });
  it('keeps E timing and puts visible ring at the slide ending',()=>{
    expect(sample(80).progress).toBe(0);expect(sample(520).progress).toBe(1);
    expect(sample(400).ringFrame).toBe(2);expect(sample(798).ringFrame).toBe(5);
    expect(sample(1200).ringFrame).toBe(-1);expect(sample(1200).bodyFrame).toBe(7);
  });
  it('keeps every full sprite canvas inside each preview during the entire motion',()=>{
    for(const [width,height,travel] of [[480,360,160],[320,280,100]])for(const d of DIRECTIONS)for(let t=0;t<=1200;t+=10){
      const p=sample(t).progress,x=width/2+d.x*travel*(p-.5),y=height/2+45+d.y*travel*(p-.5);
      expect(x-88).toBeGreaterThanOrEqual(0);expect(x+88).toBeLessThanOrEqual(width);
      expect(y-125).toBeGreaterThanOrEqual(0);expect(y+19).toBeLessThanOrEqual(height);
    }
  });
});
