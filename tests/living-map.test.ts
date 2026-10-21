import {describe,it,expect} from 'vitest';
import {stepBrush,brushStripPose,brushInfluence} from '../src/render/BrushMotion';
import {BattleTraces,BATTLE_TRACE_CAPACITY} from '../src/render/BattleTraces';
import type {GameEvent} from '../src/game/types';
const hit=(x=100,y=100,amount=43):GameEvent=>({type:'hit',team:'blue',x,y,amount});
describe('living brush response',()=>{
 it('keeps the rooted strip fixed throughout the continuous bend',()=>{
  for(const h of [248,414])for(const bend of [-.5,0,.5]){
   const root=brushStripPose(bend,-bend,2,3,h,1);
   expect(Math.abs(root.x)).toBe(0);expect(root.y).toBeCloseTo(h*.03);
   for(let i=0;i<=12;i++){
    const pose=brushStripPose(bend,-bend,2,3,h,i/12);
    expect(Number.isFinite(pose.x)&&Number.isFinite(pose.y)).toBe(true);
   }
  }
 });
 it('recovers after a passing actor and stays stable across frame cadences',()=>{
  const simulate=(dt:number)=>{
   let pose={bend:0,velocity:0};
   for(let i=0;i<Math.round(1/dt);i++)pose=stepBrush(pose.bend,pose.velocity,.4,dt);
   expect(pose.bend).toBeGreaterThan(.38);
   const held=pose;
   for(let i=0;i<Math.round(2/dt);i++)pose=stepBrush(pose.bend,pose.velocity,0,dt);
   expect(Math.abs(pose.bend)).toBeLessThan(.001);return held.bend;
  };
  expect(simulate(.1)).toBeCloseTo(simulate(1/60),2);
 });
 it('freezes the response while paused and bounds strong disturbances',()=>{
  expect(stepBrush(.2,.3,-.4,0)).toEqual({bend:.2,velocity:.3});
  expect(Math.abs(stepBrush(.4,10,2,.1).bend)).toBeLessThanOrEqual(.5);
 });
 it('changes continuously across the former frame thresholds and actor crossing',()=>{
  const a=brushStripPose(.06249,.1,2,3,414,0),b=brushStripPose(.06251,.1,2,3,414,0);
  expect(Math.abs(a.x-b.x)).toBeLessThan(.01);
  expect(Math.abs(brushInfluence(-.001,0).push-brushInfluence(.001,0).push)).toBeLessThan(.001);
  expect(brushInfluence(80,0)).toEqual({nearby:0,push:0});
 });
 it('lets the tip lag behind the stem and then settle without persistent oscillation',()=>{
  let stem={bend:0,velocity:0},tip={bend:0,velocity:0};
  for(let i=0;i<15;i++){stem=stepBrush(stem.bend,stem.velocity,.3,1/60);tip=stepBrush(tip.bend,tip.velocity,stem.bend,1/60,true);}
  expect(tip.bend).toBeLessThan(stem.bend);
  for(let i=0;i<240;i++){stem=stepBrush(stem.bend,stem.velocity,0,1/60);tip=stepBrush(tip.bend,tip.velocity,stem.bend,1/60,true);}
  expect(Math.abs(tip.bend)).toBeLessThan(.001);
 });
});
describe('battlefield floor memory',()=>{
 it('deduplicates hits and finishing blows, and ignores non-combat events',()=>{
  const store=new BattleTraces();store.event(hit(),0);store.event(hit(104,101),.1);
  store.event({...hit(),type:'kill'},.2);store.event({...hit(),type:'last-hit'},.2);
  store.event({...hit(),type:'cast'},.3);
  expect(store.marks).toHaveLength(1);expect(store.marks[0].heavy).toBe(true);
 });
 it('expires light and heavy marks, caps storage, and clears on clock rewind',()=>{
  const store=new BattleTraces();store.event(hit(),0);store.event(hit(200,200,100),0);
  store.advance(8);expect(store.marks).toHaveLength(1);
  store.advance(13);expect(store.marks).toHaveLength(0);
  for(let i=0;i<300;i++)store.event(hit(i*40,0),14);
  expect(store.marks).toHaveLength(BATTLE_TRACE_CAPACITY);
  store.advance(0);expect(store.marks).toHaveLength(0);
 });
 it('does not mutate the combat event or accumulate marks during paused renders',()=>{
  const store=new BattleTraces(),event=Object.freeze(hit());store.event(event,0);
  const mark={...store.marks[0]};for(let i=0;i<60;i++)store.advance(0);
  expect(store.marks).toEqual([mark]);expect(event).toEqual(hit());
 });
});
