/** Damped response at fixed substeps: leaf tips bend while roots stay planted. */
export function stepBrush(bend:number,velocity:number,target:number,dt:number,tip=false){
 const steps=Math.ceil(Math.min(.1,Math.max(0,dt))*120),h=steps?Math.min(.1,dt)/steps:0;
 for(let i=0;i<steps;i++){velocity+=((target-bend)*(tip?30:26)-velocity*(tip?6:9))*h;bend+=velocity*h;}
 return {bend:Math.max(-.5,Math.min(.5,bend)),velocity};
}
/** Continuous strip deformation. UVs keep the art intact; the lowest strip stays planted. */
export function brushStripPose(bend:number,tip:number,time:number,phase:number,height:number,t:number){
 const flex=1-t,rate=.74+.22*Math.sin(phase*1.3);
 const flutter=Math.sin(time*rate+phase-t*1.4)*.009+Math.sin(time*rate*1.73+phase*1.9-t*2.2)*.004;
 return {x:height*.45*(bend*flex*flex+(tip-bend)*Math.pow(flex,4)+flutter*Math.pow(flex,3)),
  y:(t-.97)*height+height*tip*tip*.12*flex*flex};
}
export function brushInfluence(dx:number,dy:number){
 const t=Math.max(0,1-Math.hypot(dx,dy)/80),nearby=t*t*(3-2*t);
 return {nearby,push:Math.tanh(dx/26)*nearby};
}
