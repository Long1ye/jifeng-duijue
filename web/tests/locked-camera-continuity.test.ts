import {describe,it,expect} from 'vitest';
import {RenderPositions} from '../src/render/RenderPositions';
import {CameraRig} from '../src/render/CameraRig';
import {snapCameraCoordinate,RENDER_SCALE} from '../src/render/Presentation';
import {WORLD} from '../src/game/config';

describe('locked camera at high refresh rates',()=>{
 for(const rate of [60,120,144,165,240])for(const zoom of [.6,1,1.5] as const){
  it(`keeps constant screen position and continuous follow at ${rate} Hz, zoom ${zoom}`,()=>{
   const hero={id:1,x:430,y:300},positions=new RenderPositions(),camera=new CameraRig();camera.setZoom(zoom);
   let accumulator=0,elapsed=0,lastCenter:number|undefined;
   for(let frame=0;frame<rate;frame++){
    const dt=1/rate;elapsed+=dt;accumulator+=dt;
    while(accumulator>=WORLD.step){positions.capture([hero]);hero.x+=80*WORLD.step;accumulator-=WORLD.step;}
    const point=positions.sample(hero,accumulator/WORLD.step);camera.lookAt(point);
    expect(point.x).toBeCloseTo(430+Math.max(0,elapsed-WORLD.step)*80,8);
    if(lastCenter!==undefined&&elapsed>WORLD.step*2)expect(camera.center.x-lastCenter).toBeCloseTo(80/rate,8);
    const pixel=(snapCameraCoordinate(point.x,camera.bounds.x,zoom)-camera.bounds.x)*zoom*RENDER_SCALE;
    expect(pixel).toBeCloseTo(camera.viewport.width*RENDER_SCALE/2,8);
    lastCenter=camera.center.x;
   }
  });
 }
 it('does not interpolate instant teleports or leak previous positions into a new match',()=>{
  const positions=new RenderPositions(),hero={id:1,x:400,y:300};positions.capture([hero]);hero.x=540;
  expect(positions.sample(hero,.2).x).toBe(540);
  positions.reset();hero.x=430;expect(positions.sample(hero,.2).x).toBe(430);
 });
 it('does not mutate simulation positions and resumes safely after an idle tick',()=>{
  const positions=new RenderPositions(),hero={id:1,x:400,y:300};positions.capture([hero]);hero.x=402;
  expect(positions.sample(hero,.5).x).toBe(401);expect(hero.x).toBe(402);
  positions.capture([hero]);expect(positions.sample(hero,.5).x).toBe(402);
 });
});
