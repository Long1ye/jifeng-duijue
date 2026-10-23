import type Phaser from 'phaser';
import type {Entity} from '../game/types';
import {actorDepth} from './RenderDepth';
import {dashTargetTimer} from './DashTargetTimerState';

/** The source uses an animated mesh, not a flat ring sprite. Front/back arcs wrap the body. */
export class DashTargetTimer {
 private views=new Map<number,{back:Phaser.GameObjects.Graphics;front:Phaser.GameObjects.Graphics}>();
 constructor(private scene:Phaser.Scene){}
 update(units:readonly Entity[],locks:ReadonlyMap<number,number>,now:number){
  const retained=new Set<number>();
  for(const unit of units){
   const state=dashTargetTimer(unit,locks.get(unit.id)??0,now);if(!state)continue;
   retained.add(unit.id);
   let view=this.views.get(unit.id);
   if(!view){view={back:this.scene.add.graphics(),front:this.scene.add.graphics()};this.views.set(unit.id,view);}
   view.back.clear().setDepth(actorDepth(state.depthY,-.2));view.front.clear().setDepth(actorDepth(state.depthY,.2));
   const trace=(start:number,end:number,width:number,color:number,alpha:number)=>{
    const segments=Math.max(1,Math.ceil((end-start)*12));
    for(let i=0;i<segments;i++){
     const a=start+(end-start)*i/segments,b=start+(end-start)*(i+1)/segments;
     const g=Math.sin((a+b)/2)<0?view!.back:view!.front;
     g.lineStyle(width,color,alpha).lineBetween(state.x+Math.cos(a)*state.radiusX,state.y+Math.sin(a)*state.radiusY,
      state.x+Math.cos(b)*state.radiusX,state.y+Math.sin(b)*state.radiusY);
    }
   };
   // A low-contrast track keeps the missing wedge legible on the snowy arena.
   trace(-Math.PI/2,Math.PI*1.5,3.5,0x102331,.75);
   trace(-Math.PI/2,Math.PI*1.5,1,0xc0d5df,.22);
   trace(state.start,state.end,4.5,0xa9d9ed,.14*state.alpha);
   trace(state.start,state.end,2,0xf2fbff,state.alpha);
   // The bright moving tip is the countdown hand; no separate tiny progress bar.
   const x=state.x+Math.cos(state.start)*state.radiusX,y=state.y+Math.sin(state.start)*state.radiusY;
   const tip=Math.sin(state.start)<0?view.back:view.front;
   tip.fillStyle(0xffffff,state.alpha).fillCircle(x,y,1.6);
  }
  for(const [id,view] of this.views)if(!retained.has(id)){view.back.destroy();view.front.destroy();this.views.delete(id);}
 }
 reset(){for(const view of this.views.values()){view.back.destroy();view.front.destroy();}this.views.clear();}
}
