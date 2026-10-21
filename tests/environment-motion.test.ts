import {describe,it,expect} from 'vitest';
import {environmentWind} from '../src/render/EnvironmentWind';
import {SnowTrailTracker,SNOW_TRAIL_CAPACITY} from '../src/render/SnowTrails';
import {snowSurface} from '../src/render/SnowSurface';
import {bridgePoint,onPlayableBridge} from '../src/game/Bridge';
import {stoneCells,snowStoneTier} from '../src/render/BridgeTiles';
import {edgeTile} from '../src/render/BridgeEdge';

describe('environment motion',()=>{
 it('keeps wind continuous, spatially delayed and bounded through many gusts',()=>{
  let min=1,max=0;
  for(let t=0;t<100;t+=.02){
   const wind=environmentWind(t,3100,1700),next=environmentWind(t+.001,3100,1700);
   min=Math.min(min,wind.gust);max=Math.max(max,wind.gust);
   expect(Math.abs(next.x-wind.x)).toBeLessThan(.1);
   expect(wind.x).toBeLessThan(0);expect(wind.x).toBeGreaterThan(-111);
  }
  expect(min).toBeLessThan(.01);expect(max).toBeGreaterThan(.99);
  expect(environmentWind(4,100,100)).not.toEqual(environmentWind(4,1700,100));
 });
 it('matches snow-bearing floor cells and excludes bare, damaged and off-bridge areas',()=>{
  let snowy=0;
  for(const cell of stoneCells()){
   const p=bridgePoint(cell.u,cell.v);
   const expected=onPlayableBridge(p)&&edgeTile(cell.col,cell.row,cell.u)===undefined&&(snowStoneTier(cell)??-1)>=1;
   expect(snowSurface(p.x,p.y)).toBe(expected);
   if(expected)snowy++;
  }
  expect(snowy).toBeGreaterThan(0);
  const center=bridgePoint(0);
  expect(snowSurface(0,0)).toBe(false);expect(snowSurface(center.x,center.y)).toBe(false);
 });
 it('spaces footfalls by distance regardless of frame rate and alternates feet',()=>{
  const run=(dt:number)=>{
   const tracker=new SnowTrailTracker();
   for(let i=0;i<=Math.round(2/dt);i++)tracker.update(i*dt,[{id:1,x:i*dt*100,y:0}],()=>true);
   return tracker.steps;
  };
  const slow=run(.1),fast=run(.02);
  expect(slow.length).toBe(8);expect(fast.length).toBe(8);
  slow.forEach((step,i)=>{expect(step.x).toBeCloseTo(fast[i].x);expect(step.y).toBe(fast[i].y);});
  expect(slow.map(s=>s.side)).toEqual([1,-1,1,-1,1,-1,1,-1]);
 });
 it('does not stamp on bare ground, while paused, or across teleports and dashes',()=>{
  const tracker=new SnowTrailTracker();
  tracker.update(0,[{id:1,x:0,y:0}],()=>true);
  tracker.update(.1,[{id:1,x:30,y:0}],()=>false);
  tracker.update(.1,[{id:1,x:30,y:0}],()=>true);
  tracker.update(.2,[{id:1,x:2000,y:0}],()=>true);
  tracker.update(.3,[{id:1,x:2090,y:0}],()=>true);
  expect(tracker.steps).toHaveLength(0);
 });
 it('caps retained steps, expires old marks and clears on restart',()=>{
  const tracker=new SnowTrailTracker();
  for(let i=0;i<100;i++)tracker.update(i*.05,Array.from({length:10},(_,id)=>({id,x:i*20,y:id*10})),()=>true);
  expect(tracker.steps.length).toBe(SNOW_TRAIL_CAPACITY);
  tracker.update(13,[],()=>true);expect(tracker.steps).toHaveLength(0);
  tracker.update(0,[{id:1,x:0,y:0}],()=>true);
  tracker.update(.1,[{id:1,x:40,y:0}],()=>true);expect(tracker.steps.length).toBeGreaterThan(0);
  tracker.update(0,[{id:1,x:0,y:0}],()=>true);expect(tracker.steps).toHaveLength(0);
 });
});
