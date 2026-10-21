/** Source-pixel coordinates. These are visual regions, never collision geometry. */
export type MapLayerKind = 'water' | 'grass' | 'canopy' | 'fire';
export interface MapRegion { id:string; kind:MapLayerKind; polygon:readonly (readonly [number,number])[] }
export const MAP_REGIONS: readonly MapRegion[] = [
 {id:'water-nw',kind:'water',polygon:[[0,0],[68,0],[76,34],[158,43],[196,90],[225,112],[207,157],[157,167],[83,126],[22,83],[0,78]]},
 {id:'water-se',kind:'water',polygon:[[304,212],[370,204],[444,258],[511,282],[511,327],[362,327],[349,281],[308,260]]},
 {id:'reeds-west',kind:'grass',polygon:[[18,72],[61,62],[72,81],[67,108],[29,108],[17,94]]},
 {id:'reeds-nw',kind:'grass',polygon:[[109,130],[132,116],[160,110],[191,84],[210,89],[214,105],[187,129],[158,145],[132,155],[115,148]]},
 {id:'reeds-se',kind:'grass',polygon:[[352,268],[371,252],[390,228],[408,214],[425,222],[418,247],[397,275],[374,293],[355,287]]},
 {id:'canopy-north',kind:'canopy',polygon:[[163,0],[288,0],[289,12],[275,24],[251,23],[237,36],[216,28],[205,17],[187,24],[173,14]]},
 {id:'canopy-west',kind:'canopy',polygon:[[0,104],[12,110],[17,127],[28,137],[28,157],[13,163],[0,158]]},
 {id:'canopy-east',kind:'canopy',polygon:[[505,174],[511,172],[511,225],[498,222],[492,208],[482,203],[484,190],[495,190]]},
 ...([[117,182],[258,109],[339,49],[377,176],[270,241],[180,286]] as const).map(([x,y],i):MapRegion=>({id:`fire-${i}`,kind:'fire',polygon:[[x-7,y-13],[x+7,y-13],[x+7,y+6],[x-7,y+6]]})),
];
export function insidePolygon(x:number,y:number,points:MapRegion['polygon']):boolean {
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
export function layerPixel(kind:MapLayerKind,r:number,g:number,b:number):boolean {
 if(kind==='water')return g>r*1.22&&b>r*1.18&&b>g*.78;
 if(kind==='fire')return (r>145&&g>65&&r>g*1.08&&b<r*.65)||(r>210&&g>175&&r>=g*.9);
 if(kind==='grass')return g>r*.82&&g>b*1.08;
 return g>r*1.08&&r<93&&g<127;
}
export function layerMotion(kind:MapLayerKind,time:number,phase:number){
 if(kind==='fire')return {x:0,y:0,scaleY:1+Math.sin(time*8+phase)*.12,alpha:.88+.12*Math.sin(time*11+phase)};
 return {x:kind==='water'?0:Math.sin(time*(kind==='grass'?1.7:.85)+phase),y:0,scaleY:1,alpha:1};
}
