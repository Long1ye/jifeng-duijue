import { describe, expect, it } from 'vitest';
import { frameAt, sequenceAt, type Segment, type Timing } from '../assets/hero-attacks/2026-10-10/yasuo/v11-walk-six/timing';
const clip: Timing = {durations_ms:Array(8).fill(100),duration_ms:800};
const timings: Record<Segment,Timing> = {walk:clip,entry:clip,second:clip,repeat:clip};
describe('walk then one entry then two distinct attacks',()=>{
  it('plays walk and entry only once',()=>{
    expect(sequenceAt(0,timings)).toEqual({segment:'walk',frame:0,cycle:0});
    expect(sequenceAt(799,timings)).toEqual({segment:'walk',frame:7,cycle:0});
    expect(sequenceAt(800,timings)).toEqual({segment:'entry',frame:0,cycle:0});
    expect(sequenceAt(1599,timings)).toEqual({segment:'entry',frame:7,cycle:0});
  });
  it('repeats only second and first attacks without reversing frames',()=>{
    expect(sequenceAt(1600,timings)).toEqual({segment:'second',frame:0,cycle:1});
    expect(sequenceAt(2399,timings)).toEqual({segment:'second',frame:7,cycle:1});
    expect(sequenceAt(2400,timings)).toEqual({segment:'repeat',frame:0,cycle:1});
    expect(sequenceAt(3199,timings)).toEqual({segment:'repeat',frame:7,cycle:1});
    expect(sequenceAt(3200,timings)).toEqual({segment:'second',frame:0,cycle:2});
  });
  it('honors actual frame durations',()=>{
    expect(frameAt(110,{durations_ms:[50,150,100],duration_ms:300})).toBe(1);
    expect(frameAt(300,{durations_ms:[50,150,100],duration_ms:300})).toBe(0);
  });
});
