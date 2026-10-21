import Phaser from 'phaser';
import type {Entity,GameEvent} from '../game/types';
import {CombatFeel,impactDirection,impactProfile} from './CombatFeel';
import {actorDepth,RENDER_DEPTH} from './RenderDepth';
import {contactPosition} from './SkillPresentation';

/** Original procedural artwork: tight contact cuts, directional shards and death echoes. */
export class CombatFeedback {
 readonly feel=new CombatFeel();
 private ink:Phaser.GameObjects.Graphics;
 private bursts:{event:GameEvent;at:number}[]=[];
 private echoes:{image:Phaser.GameObjects.Image;at:number;x:number;y:number;dx:number;dy:number;sx:number;sy:number}[]=[];
 private clock=-1;
 enabled=true;
 constructor(private scene:Phaser.Scene,private targetFor?:(id:number)=>Entity|undefined){
  this.ink=scene.add.graphics().setDepth(RENDER_DEPTH.feedback);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.reset();this.ink.destroy();});
 }
 reset(){this.feel.reset();this.bursts=[];this.clock=-1;for(const e of this.echoes)e.image.destroy();this.echoes=[];this.ink.clear();}
 event(event:GameEvent,time:number,victim?:Phaser.GameObjects.Image){
  if(!this.enabled||event.impact==='ignite')return;
  this.feel.event(event,time);
  const foreground=event.sourceKind==='hero'||event.targetKind==='hero';
  const at=event.at??time;
  if(foreground&&(event.type==='hit'||event.type==='last-hit')){
   if(this.bursts.length>=32)this.bursts.shift();
   this.bursts.push({event,at});
  }
  if(event.type==='kill'&&victim&&(event.targetKind==='melee'||event.targetKind==='ranged')){
   if(this.echoes.length>=12)this.echoes.shift()!.image.destroy();
   const d=impactDirection(event);
   const image=this.scene.add.image(victim.x,victim.y,victim.texture.key,victim.frame.name)
    .setOrigin(victim.originX,victim.originY).setScale(victim.scaleX,victim.scaleY)
    .setFlip(victim.flipX,victim.flipY).setTint(0xa7bdc4).setDepth(actorDepth(event.y,-.3));
   this.echoes.push({image,at,x:victim.x,y:victim.y,dx:d.x,dy:d.y,sx:victim.scaleX,sy:victim.scaleY});
  }
 }
 update(time:number){
  if(time<this.clock)this.reset();this.clock=time;this.feel.update(time);this.ink.clear();
  if(!this.enabled){this.reset();return;}
  const view=this.scene.cameras.main.worldView,g=this.ink;
  this.bursts=this.bursts.filter(b=>time-b.at<.45);
  for(const {event:e,at} of this.bursts){
   const age=time-at;if(age<0||e.x<view.left-80||e.x>view.right+80||e.y<view.top-40||e.y>view.bottom+130)continue;
   const p=impactProfile(e.impact),d=impactDirection(e),side={x:-d.y,y:d.x};
   const target=e.targetId===undefined?undefined:this.targetFor?.(e.targetId);
   const {x,y,groundX,groundY}=contactPosition(e,time,target);
   if(e.type==='last-hit'){
    const t=age/.4,alpha=Math.max(0,1-t);
    for(let i=0;i<5;i++){
     const a=i*Math.PI*2/5-.6,r=6+t*20;
     g.fillStyle(0xffdf8e,alpha).fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r-t*9),2,2);
    }
    continue;
   }
   if(age>p.duration)continue;
   const color=e.team==='blue'?0xa5ffe9:0xffb699;
   const t=age/p.duration,fade=(1-t)**2;
   // A dark edge makes a small bright contact readable over snow and white sprites.
   if(age<.085){
    const flash=1-age/.085,length=p.length*(.65+.35*Math.min(1,age/.02));
    // Crossing the attack direction gives the cut a distinct silhouette.
    const circular=e.impact==='eq'||e.impact==='eq3';
    const sx=circular?side.x:d.x*.8+side.x*.6,sy=circular?side.y:d.y*.8+side.y*.6;
    g.lineStyle(p.heavy?6:4,0x102c3b,flash*.85).lineBetween(x-sx*length*.45,y-sy*length*.45,x+sx*length,y+sy*length);
    g.lineStyle(p.heavy?3:2,0xf0fff6,flash).lineBetween(x-sx*length*.45,y-sy*length*.45,x+sx*length,y+sy*length);
    g.lineStyle(1,color,flash).lineBetween(x-side.x*9,y-side.y*9,x+side.x*9,y+side.y*9);
    g.fillStyle(0xffffff,flash).fillRect(Math.round(x-2),Math.round(y-2),4,4);
   }
   const count=p.heavy?9:5;
   for(let i=0;i<count;i++){
    const spread=(i-(count-1)/2)*.3,angle=(e.impact==='eq3'?-Math.PI/2:Math.atan2(d.y,d.x))+spread;
    const travel=(p.heavy?43:27)*Math.sqrt(t)*(1+(i%3)*.13);
    const px=x+Math.cos(angle)*travel,py=y+Math.sin(angle)*travel+t*t*7;
    const tail=(1-t)*(i%2?5:8);
    g.lineStyle(i%3?1:2,i%2?color:0xeafff7,fade)
     .lineBetween(Math.round(px),Math.round(py),Math.round(px-Math.cos(angle)*tail),Math.round(py-Math.sin(angle)*tail));
   }
   if(p.heavy&&age<.18)g.lineStyle(1,color,(1-age/.18)*.65).strokeEllipse(groundX,groundY+2,12+age*210,5+age*75);
   // EQ3 climbs with each victim; EQ retains a short, tangential contact cut.
   if(e.impact==='eq3'){
    const width=9+Math.sin(t*Math.PI)*7;
    for(let i=0;i<2;i++){
     const cy=y+8-i*11-t*9;
     g.lineStyle(1,i?0xeafff7:color,fade*.75).beginPath();
     for(let j=0;j<=12;j++){
      const a=j/12*Math.PI*1.5+t*5+i*Math.PI,px=x+Math.cos(a)*width,py=cy+Math.sin(a)*width*.35;
      if(j===0)g.moveTo(px,py);else g.lineTo(px,py);
     }
     g.strokePath();
    }
   }
  }
  this.echoes=this.echoes.filter(e=>{
   const age=time-e.at;if(age>=.55){e.image.destroy();return false;}
   const fall=Math.min(1,Math.max(0,age/.22)),fade=Math.max(0,(age-.18)/.37);
   e.image.setPosition(e.x+e.dx*fall*5,e.y+e.dy*fall*3)
    .setScale(e.sx*(1-fall*.12),e.sy*(1-fall*.6)).setRotation(e.dx*.45*fall).setAlpha(.85*(1-fade));
   return true;
  });
 }
}
