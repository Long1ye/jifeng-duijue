import {BRIDGE_SLOTS,bridgePoint} from '../game/Bridge';

/** Readable reserved sites; only the two outer towers are combat entities today. */
export function drawBridgeSites(ctx:CanvasRenderingContext2D){
 const pad=(u:number,v:number,w:number,h:number,color:string)=>{
  const corners=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
  ctx.beginPath();corners.forEach(([du,dv],i)=>{const p=bridgePoint(u+du,v+dv);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});
  ctx.closePath();ctx.fillStyle=color+'44';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
 };
 const label=(text:string,u:number,v:number,color:string)=>{
  const p=bridgePoint(u,v);ctx.font='12px sans-serif';ctx.textAlign='center';
  const w=ctx.measureText(text).width;ctx.fillStyle='#091521dd';ctx.fillRect(p.x-w/2-5,p.y-9,w+10,19);
  ctx.fillStyle=color;ctx.fillText(text,p.x,p.y+5);
 };
 ctx.save();
 for(const s of BRIDGE_SLOTS){
  if(s.id.endsWith('inhibitor')||s.id.endsWith('spawn')||s.id.endsWith('nexus'))continue;
  const color=s.team==='blue'?'#83cdeb':'#e9a8b7';
  pad(s.u,s.v,s.w,s.h,color);
  label(s.label,s.u,s.v+s.h/2+13,color);
 }
 ctx.restore();
}
