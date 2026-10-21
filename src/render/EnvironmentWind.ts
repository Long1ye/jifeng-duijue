/** World-space wind shared by vegetation, weather and embers. Simulation seconds. */
export function environmentWind(time:number,x:number,y:number){
 const phase=time*.38-x*.00065-y*.0003;
 const gust=Math.pow((1+Math.sin(phase))*.5,6);
 return {x:-18-88*gust+Math.sin(time*.71)*4,y:5+19*gust,gust};
}
