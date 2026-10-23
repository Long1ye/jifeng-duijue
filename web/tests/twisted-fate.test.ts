import { describe,it,expect } from 'vitest';
import { tfDirection,tfPose,TF_URLS,tfTextureKey } from '../src/render/TwistedFate';
import { Match } from '../src/game/Match';
describe('Twisted Fate supplied art',()=>{
 it('maps all eight headings and wraps angles',()=>{
  expect(Array.from({length:8},(_,i)=>tfDirection(i*Math.PI/4))).toEqual(['e','se','s','sw','w','nw','n','ne']);
  expect(tfDirection(-Math.PI/4)).toBe('ne');expect(tfDirection(Math.PI*2)).toBe('e');
 });
 it('loads all 16 poses and switches idle/move/attack',()=>{
  const h=new Match({ai:false,waves:false}).hero('red');h.facing=Math.PI*.75;
  const keys=Object.keys(TF_URLS).map(tfTextureKey);expect(keys).toHaveLength(16);
  expect(tfPose(h,0).key).toBe('tf-卡牌站立-sw');
  h.destination={x:h.x+100,y:h.y};expect(tfPose(h,0).key).toBe('tf-卡牌-sw');
  h.destination=null;h.windup=.2;expect(tfPose(h,0).key).toBe('tf-卡牌-sw');
  for(const angle of Array.from({length:8},(_,i)=>i*Math.PI/4)){
   h.facing=angle;expect(keys).toContain(tfPose(h,0).key);
   h.windup=0;expect(keys).toContain(tfPose(h,0).key);h.windup=.2;
  }
 });
});
