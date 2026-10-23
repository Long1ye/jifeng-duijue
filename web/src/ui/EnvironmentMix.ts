import type {Point} from '../game/types';
export function positionalSound(source:Point,listener:Point,width:number,radius=500){
 const distance=Math.hypot(source.x-listener.x,source.y-listener.y);
 return {gain:Math.pow(Math.max(0,1-distance/radius),2),pan:Math.max(-1,Math.min(1,(source.x-listener.x)/Math.max(1,width*.5)))};
}
/** Fold the end of a loop into its start, avoiding a discontinuity at the wrap. */
export function loopCrossfade(source:Float32Array,overlap:number){
 const fade=Math.min(Math.max(0,Math.floor(overlap)),Math.floor(source.length/4));
 const result=source.slice(0,source.length-fade);
 for(let i=0;i<fade;i++){
  const t=i/fade,w=t*t*(3-2*t);
  result[i]=source[source.length-fade+i]*(1-w)+source[i]*w;
 }
 return result;
}
