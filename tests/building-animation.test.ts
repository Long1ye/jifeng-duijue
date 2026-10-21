import {describe,it,expect} from 'vitest';
import {BUILDING_CORES,buildingMotion,type AnimatedBuildingKind} from '../src/render/BuildingAnimation';
describe('building energy animation',()=>{
 it('keeps source masks above the masonry footprint',()=>{
  const dimensions={tower:[340,714],nexus:[1024,1024],inhibitor:[836,920]};
  for(const kind of Object.keys(BUILDING_CORES) as AnimatedBuildingKind[]){
   const shape=BUILDING_CORES[kind],[width,height]=dimensions[kind];
   expect(shape.polygon.length).toBeGreaterThan(5);
   for(const [x,y] of shape.polygon){expect(x).toBeGreaterThanOrEqual(0);expect(x).toBeLessThan(width);expect(y).toBeGreaterThanOrEqual(0);expect(y).toBeLessThan(height*.65);}
  }
 });
 it('uses repeatable paused-time poses with bounded lift and visible motion',()=>{
  for(const kind of ['tower','nexus','inhibitor'] as const){
   let low=Infinity,high=-Infinity;
   for(let i=0;i<500;i++){
    const t=i*.02,pose=buildingMotion(t,1,kind);
    expect(pose).toEqual(buildingMotion(t,1,kind));
    expect(pose.scan).toBeGreaterThanOrEqual(0);expect(pose.scan).toBeLessThan(1);
    expect(pose.lift).toBeGreaterThan(0);expect(pose.lift).toBeLessThan(14);
    expect(Math.abs(pose.lift-buildingMotion(t+.001,1,kind).lift)).toBeLessThan(.01);
    low=Math.min(low,pose.lift);high=Math.max(high,pose.lift);
   }
   expect(high-low).toBeGreaterThan(kind==='tower'?4:9);
  }
 });
 it('gives buildings different phases and resets exactly when the match clock resets',()=>{
  expect(buildingMotion(2,0,'nexus')).not.toEqual(buildingMotion(2,2,'nexus'));
  const start=buildingMotion(0,1,'nexus');buildingMotion(300,1,'nexus');
  expect(buildingMotion(0,1,'nexus')).toEqual(start);
 });
});
