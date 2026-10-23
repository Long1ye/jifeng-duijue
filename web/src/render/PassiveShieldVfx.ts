import Phaser from 'phaser';
import type {Entity} from '../game/types';
import {shieldRemaining} from '../game/YasuoPassive';
import {passiveShieldPose} from './PassiveShieldPose';
import {airborneLift} from './SkillPresentation';
import {actorDepth} from './RenderDepth';
import layout from '../../assets/effects/yasuo-passive-shield-2026-10-15/runtime/layout.json';

interface ShieldView {startedAt:number;brokenAt?:number;images:Phaser.GameObjects.Image[]}
export class PassiveShieldVfx {
 private views=new Map<number,ShieldView>();
 constructor(private scene:Phaser.Scene){scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.reset());}
 update(entities:readonly Entity[],now:number){
  const alive=new Set(entities.filter(e=>e.hp>0).map(e=>e.id));
  for(const [id,view] of this.views)if(!alive.has(id)){view.images.forEach(i=>i.destroy());this.views.delete(id);}
  for(const entity of entities){
   if(entity.kind!=='hero'||entity.hp<=0||entity.passiveShieldAt===undefined)continue;
   let view=this.views.get(entity.id);
   if(!view){
    if(now>=entity.passiveShieldAt+1)continue;
    const images=[0,1].map(i=>this.scene.add.image(0,0,'yasuo-passive-shield').setOrigin(.5,1)
     .setCrop(i*layout.width/2,0,layout.width/2,layout.height).setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
    view={startedAt:entity.passiveShieldAt,images};this.views.set(entity.id,view);
   }
   if(view.startedAt!==entity.passiveShieldAt){view.startedAt=entity.passiveShieldAt;view.brokenAt=undefined;}
   const until=entity.passiveShieldUntil??view.startedAt+1;
   if(view.brokenAt===undefined&&now<until&&shieldRemaining(entity,now)<=0)view.brokenAt=now;
   const pose=passiveShieldPose(now,view.startedAt,until,view.brokenAt);
   const scale=94/layout.height*pose.scale;
   view.images.forEach((image,i)=>image.setVisible(pose.active).setFrame(pose.frame).setScale(scale)
    .setPosition(entity.x,entity.y+3-airborneLift(entity,now)).setAlpha(pose.alpha*(i?1:.9))
    .setDepth(actorDepth(entity.y,i?.2:-.2)));
  }
 }
 reset(){for(const v of this.views.values())v.images.forEach(i=>i.destroy());this.views.clear();}
}
