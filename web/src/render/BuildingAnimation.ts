export type AnimatedBuildingKind='tower'|'nexus'|'inhibitor';
/** Source-space silhouettes, excluding foreground masonry and snow caps. */
export const BUILDING_CORES:Record<AnimatedBuildingKind,{polygon:number[][];cx:number;cy:number}>={
 tower:{polygon:[[224,0],[257,38],[242,63],[225,96],[211,72],[190,42]],cx:224,cy:48},
 nexus:{polygon:[[512,253],[594,364],[594,424],[570,426],[570,482],[535,489],[485,489],[485,475],[460,475],[460,426],[428,404],[428,365]],cx:512,cy:370},
 inhibitor:{polygon:[[418,12],[573,229],[551,313],[524,410],[479,463],[418,532],[356,461],[309,402],[273,287],[265,230]],cx:418,cy:272},
};
export function buildingMotion(time:number,phase:number,kind:AnimatedBuildingKind){
 const cycle=time*1.7+phase;
 return {
  lift:(kind==='tower'?4:8)+(kind==='tower'?2.5:5)*Math.sin(cycle),
  rotation:Math.sin(cycle*.73)*(kind==='tower'?.025:.045),
  pulse:.5+.5*Math.sin(time*2.5+phase),
  orbit:time*1.25+phase,
  scan:((time*.38+phase)%1+1)%1,
 };
}
