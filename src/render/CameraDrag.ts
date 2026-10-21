import type {Point} from '../game/types';
import {RENDER_SCALE} from './Presentation';

export const CAMERA_DRAG_THRESHOLD = 10;

export interface CameraDragState {
  start:Point;
  previous:Point;
  active:boolean;
}

export function startCameraDrag(point:Point,active=false):CameraDragState {
  return {start:{...point},previous:{...point},active};
}

/** Pointer coordinates are render pixels; CameraRig.pan expects world units. */
export function cameraDragStep(state:CameraDragState,point:Point,zoom:number):{state:CameraDragState;pan:Point|null} {
  const active=state.active||Math.hypot(point.x-state.start.x,point.y-state.start.y)>=CAMERA_DRAG_THRESHOLD;
  if(!active)return {state,pan:null};
  return {
    state:{...state,previous:{...point},active:true},
    pan:{x:(state.previous.x-point.x)/(zoom*RENDER_SCALE),y:(state.previous.y-point.y)/(zoom*RENDER_SCALE)},
  };
}
