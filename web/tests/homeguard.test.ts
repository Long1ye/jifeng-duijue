import { describe, it, expect } from 'vitest';
import { Match } from '../src/game/Match';
import { BASES, TOWERS, BALANCE } from '../src/game/config';
import { HOMEGUARD, homeguardActive, updateHomeguard } from '../src/game/Homeguard';
import { distance } from '../src/game/geometry';

describe('homeguard',()=>{
  for(const team of ['blue','red'] as const) it(`${team}: fountain grants, outer tower removes`,()=>{
    const m=new Match({ai:false,waves:false}), h=m.hero(team);
    Object.assign(h,BASES[team]); updateHomeguard(h,1);
    expect(homeguardActive(h,1)).toBe(true);
    expect(homeguardActive(h,1+HOMEGUARD.duration)).toBe(false);
    Object.assign(h,TOWERS[team]); updateHomeguard(h,2);
    expect(homeguardActive(h,2)).toBe(false);
  });
  it('combat cancels and prevents immediate fountain rearm',()=>{
    const m=new Match({ai:false,waves:false}), h=m.hero('blue');
    Object.assign(h,BASES.blue); updateHomeguard(h,1);
    h.targetId=m.hero('red').id; updateHomeguard(h,2);
    expect(homeguardActive(h,2)).toBe(false);
    h.targetId=null; updateHomeguard(h,3);
    expect(homeguardActive(h,3)).toBe(false);
    updateHomeguard(h,11); expect(homeguardActive(h,11)).toBe(true);
    h.hitAt=11; updateHomeguard(h,11);
    expect(homeguardActive(h,11)).toBe(false);
  });
  it('boosts walking without changing base speed',()=>{
    const m=new Match({ai:false,waves:false}), h=m.hero('blue');
    Object.assign(h,BASES.blue); m.start(); m.orderMove('blue',TOWERS.blue);
    m.step(.1);
    expect(distance(h,BASES.blue)).toBeCloseTo(BALANCE.hero.speed*.1*HOMEGUARD.multiplier);
    expect(h.speed).toBe(BALANCE.hero.speed);
  });
});
