import {describe,it,expect} from 'vitest';
import {RENDER_SCALE,toLogicalPointer,HERO_VISUAL_SCALE,HERO_EFFECT_SCALE,HERO_ATTACHMENT_SCALE} from '../src/render/Presentation';
import {CameraRig} from '../src/render/CameraRig';
import {VIEWPORT,MAP_LAYOUT,WORLD} from '../src/game/config';

describe('high resolution rendering preserves world coordinates',()=>{
 it('coordinates hero bodies and attachments without shrinking the playable map',()=>{
  expect(HERO_VISUAL_SCALE).toBe(2.975);
  expect(HERO_EFFECT_SCALE).toBe(.25*HERO_VISUAL_SCALE);
  expect(HERO_ATTACHMENT_SCALE).toBeCloseTo(2.975/1.5);
  expect(MAP_LAYOUT.scale).toBe(2);
  expect([WORLD.width,WORLD.height]).toEqual([1022,654]);
  expect(VIEWPORT).toEqual({width:480,height:270});
 });
 it('keeps the same view and pointer aim at both camera zooms',()=>{
  const rig=new CameraRig();rig.reset({x:500,y:300});
  for(const zoom of [0.6,1,1.5] as const){
   rig.setZoom(zoom);
   expect(VIEWPORT.width*RENDER_SCALE/(zoom*RENDER_SCALE)).toBeCloseTo(rig.bounds.width);
   for(const point of [{x:0,y:0},{x:240,y:135},{x:480,y:270}]){
    expect(rig.screenToWorld(toLogicalPointer({x:point.x*RENDER_SCALE,y:point.y*RENDER_SCALE}))).toEqual(rig.screenToWorld(point));
   }
  }
 });
});
