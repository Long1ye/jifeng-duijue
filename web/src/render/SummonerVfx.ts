import Phaser from 'phaser';
import type {Match} from '../game/Match';
import {actorDepth} from './RenderDepth';

/** Pooled, simulation-clock effects: pause freezes them and reset releases them. */
export class SummonerVfx {
 private images:Phaser.GameObjects.Image[]=[];
 private used=0;
 constructor(private scene:Phaser.Scene){
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.reset());
 }
 private sprite(frame:number,x:number,y:number,scale:number,anchor:number,alpha:number,depth:number){
  const image=this.images[this.used]??this.scene.add.image(0,0,'spell-vfx-atlas');
  this.images[this.used++]=image;
  return image.setVisible(true).setFrame(frame).setOrigin(.5,anchor/320).setScale(scale)
   .setPosition(x,y).setDepth(depth).setAlpha(alpha);
 }
 update(match:Match){
  this.used=0;
  for(const effect of match.summonerEffects){
   const age=match.time-effect.startedAt;
   if(age<0||match.time>=effect.endsAt)continue;
   if(effect.kind==='flash'){
    const frame=8+Math.min(3,Math.floor(age/.09)),fade=Math.min(1,(effect.endsAt-match.time)/.12);
    for(const [i,p] of [effect.from,effect.to].entries())
     this.sprite(frame,p.x,p.y-30,i?.62:.48,165,fade*(i?1:.7),actorDepth(p.y,2));
   }else{
    const target=match.entity(effect.targetId??null);
    if(!target||target.hp<=0)continue;
    const fade=Math.min(1,age/.12,(effect.endsAt-match.time)/.3);
    const scale=target.kind==='hero'?.37:.24;
    this.sprite(12+Math.floor(age*12)%4,target.x,target.y,scale,255,fade*.9,actorDepth(target.y,.3));
   }
  }
  for(let i=this.used;i<this.images.length;i++)this.images[i].setVisible(false);
 }
 reset(){for(const image of this.images)image.destroy();this.images=[];this.used=0;}
}
