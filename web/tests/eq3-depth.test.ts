import { describe, it, expect } from 'vitest';
import { isFrontArc } from '../assets/hero-skills/2026-10-12/yasuo/eq3-v1-layered-ring/depth';
describe('EQ3 ring depth',()=>{
  it('places the front arc of all three rings in front of the body',()=>{
    for(const y of [48,79,114])expect(isFrontArc(88,y)).toBe(true);
  });
  it('keeps all three rear arcs behind the body',()=>{
    for(const y of [0,30,57])expect(isFrontArc(88,y)).toBe(false);
  });
});
