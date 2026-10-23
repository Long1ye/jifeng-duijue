import {BRIDGE,BRIDGE_SLOTS,bridgePoint} from '../game/Bridge';

export const PAVING_BANDS=[-610,-460,-265,-115,115,265,460,610] as const;
/** Decorative placements only. Do not feed these to collision or pathfinding. */
export function pavingPatches(){
 return Array.from({length:31},(_,i)=>({u:-630+i*42,v:Math.sin(i*2.1)*6,variant:i%5===2?3:0}));
}

/** The top-down atlas is projected once into the same coordinate basis as the bridge. */
export function drawBridgePaving(ctx:CanvasRenderingContext2D,image:HTMLImageElement){
 // Measured opaque component bounds in the approved 1024px sheet.
 const cells=[[55,65,407,404],[548,204,431,122],[59,548,402,406],[561,548,408,413]] as const;
 const stamp=(index:number,u:number,v:number,width:number,height:number,alpha:number,across=false)=>{
  const p=bridgePoint(u,v),a=BRIDGE.projection.along,b=BRIDGE.projection.across;
  ctx.save();ctx.globalAlpha=alpha;
  ctx.transform(...(across?[b[0],b[1],a[0],a[1],p.x,p.y]:[a[0],a[1],b[0],b[1],p.x,p.y]) as [number,number,number,number,number,number]);
  const [sx,sy,sw,sh]=cells[index];
  ctx.drawImage(image,sx,sy,sw,sh,-width/2,-height/2,width,height);
  ctx.restore();
 };
 for(const patch of pavingPatches())stamp(patch.variant,patch.u,patch.v,66,114,1);
 for(const u of PAVING_BANDS)stamp(1,u,0,220,19,.9,true);
 for(const slot of BRIDGE_SLOTS.filter(s=>s.id.includes('tower')||s.id.endsWith('inner')||s.id.endsWith('outer'))){
  stamp(2,slot.u,slot.v,55,105,.94);
 }
}
