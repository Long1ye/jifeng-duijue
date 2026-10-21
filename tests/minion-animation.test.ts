import {describe,it,expect} from 'vitest';
import {MINION_CLIPS,minionPose} from '../src/render/MinionAnimation';
import type {Entity} from '../src/game/types';
const unit={id:3,team:'blue',kind:'melee',hp:100,windup:0,attackStartedAt:null,attackReleasedAt:null} as Entity;
describe('minion animation',()=>{
 it('has eight complete anchored clips',()=>{
  expect(Object.keys(MINION_CLIPS)).toHaveLength(8);
  for(const clip of Object.values(MINION_CLIPS)){
   expect(clip.frames).toBe(8);expect(clip.anchors).toHaveLength(8);
   for(const [x,y] of clip.anchors){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(clip.width);expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(clip.height);}
  }
 });
 it('walks only when moving and holds when stopped',()=>{
  expect(minionPose(unit,.2,true).frame).toBe(5);
  expect(minionPose(unit,.2,false).frame).toBe(0);
 });
 it('plays windup and recovery without changing gameplay',()=>{
  expect(minionPose({...unit,windup:.1,attackStartedAt:1},1.1,false).key).toBe('minion-blue-melee-attack');
  expect(minionPose({...unit,attackStartedAt:1,attackReleasedAt:1.2},1.3,false).frame).toBe(5);
  expect(minionPose({...unit,attackStartedAt:1,attackReleasedAt:1.2},2,false).key).toBe('minion-blue-melee-walk');
 });
 it('does not show the missing blue caster crystal frame',()=>{
  expect(minionPose({...unit,kind:'ranged',attackStartedAt:1,attackReleasedAt:1.2},1.2,false).frame).toBe(3);
 });
 it('keeps red team artwork and freezes dead units',()=>{
  expect(minionPose({...unit,team:'red'},1,true).key).toBe('minion-red-melee-walk');
  expect(minionPose({...unit,hp:0},1,true).frame).toBe(0);
 });
});
