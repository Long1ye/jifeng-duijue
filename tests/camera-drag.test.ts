import {describe,expect,it} from 'vitest';
import {cameraDragStep,startCameraDrag,CAMERA_DRAG_THRESHOLD} from '../src/render/CameraDrag';

describe('map drag',()=>{
  it('keeps a short left-button movement as a click',()=>{
    const start=startCameraDrag({x:100,y:100});
    const step=cameraDragStep(start,{x:100+CAMERA_DRAG_THRESHOLD-1,y:100},.6);
    expect(step.pan).toBeNull();
    expect(step.state.active).toBe(false);
  });

  it('unlocks on the threshold and pans in world units without a jump',()=>{
    const start=startCameraDrag({x:100,y:100});
    const first=cameraDragStep(start,{x:112,y:106},.6);
    expect(first.state.active).toBe(true);
    expect(first.pan!.x).toBeCloseTo(-12/(.6*3));
    expect(first.pan!.y).toBeCloseTo(-6/(.6*3));
    const next=cameraDragStep(first.state,{x:118,y:108},.6);
    expect(next.pan!.x).toBeCloseTo(-6/(.6*3));
    expect(next.pan!.y).toBeCloseTo(-2/(.6*3));
  });

  it('preserves immediate middle-button dragging',()=>{
    const start=startCameraDrag({x:200,y:150},true);
    expect(cameraDragStep(start,{x:204,y:150},1).pan!.x).toBeCloseTo(-4/3);
  });
});
