import type { MapLayerKind } from './MapLayerLayout';
export const MAP_FRAME_COUNT=12;
export const MAP_LAYER_PADDING=2;
/** Original pixel colors are retained on leaves; roots remain fixed. */
export function mapLayerFrame(source:Uint8ClampedArray,width:number,height:number,kind:MapLayerKind,frame:number):Uint8ClampedArray {
 const p=MAP_LAYER_PADDING,w=width+p*2,out=new Uint8ClampedArray(w*(height+p*2)*4),phase=frame/MAP_FRAME_COUNT*Math.PI*2;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;if(!source[i+3])continue;
  const shift=kind==='grass'||kind==='canopy'?Math.round(Math.sin(phase+y*.025)*(1-y/height)):0;
  const j=((y+p)*w+x+p+shift)*4;
  const brightness=kind==='water'?1+Math.sin(x*.10+y*.20-phase)*.065:1;
  out[j]=Math.min(255,source[i]*brightness);out[j+1]=Math.min(255,source[i+1]*brightness);out[j+2]=Math.min(255,source[i+2]*brightness);out[j+3]=source[i+3];
 }
 return out;
}
export function mapFrameAt(kind:MapLayerKind,time:number,index:number):number {
 const fps=kind==='water'?5:kind==='canopy'?2:4;
 return ((Math.floor(time*fps)+index*3)%MAP_FRAME_COUNT+MAP_FRAME_COUNT)%MAP_FRAME_COUNT;
}
