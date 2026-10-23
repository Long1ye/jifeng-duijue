import type Phaser from 'phaser';
import type {Entity} from '../game/types';
import {itemShieldRemaining} from '../game/EquipmentEffects';
import {shieldRemaining} from '../game/YasuoPassive';
import {RENDER_DEPTH} from './RenderDepth';
import {HealthBarTrail} from './HealthBarTrail';
import heroFrame from '../../assets/ui/riot-healthbars-2026-10-15/runtime/hero-frame.png?url';
import towerFrame from '../../assets/ui/riot-healthbars-2026-10-15/runtime/tower-frame.png?url';

/** Original client frames with live pixel fills; no level box or frozen numbers. */
export class HealthBars {
 static preload(scene:Phaser.Scene){scene.load.image('health-hero-frame',heroFrame);scene.load.image('health-tower-frame',towerFrame);}
 private frames=new Map<number,Phaser.GameObjects.Image>();
 private trail=new HealthBarTrail();
 constructor(private scene:Phaser.Scene){}
 begin(entities:readonly Entity[],time:number){
  const alive=entities.filter(e=>e.hp>0),ids=new Set(alive.map(e=>e.id));this.trail.retain(ids);
  for(const entity of alive)this.trail.sample(entity.id,entity.hp,entity.maxHp,time);
  for(const [id,frame] of this.frames){if(!ids.has(id)){frame.destroy();this.frames.delete(id);}else frame.setVisible(false);}
 }
 draw(g:Phaser.GameObjects.Graphics,e:Entity,time:number,x:number,y:number,width:number,alpha:number){
  const hero=e.kind==='hero',tower=e.kind==='tower',height=hero?7:tower?7:2;
  const health=Math.max(0,Math.min(1,e.hp/e.maxHp)),lag=this.trail.sample(e.id,e.hp,e.maxHp,time);
  const fill=e.team==='blue'?(tower?[0x388edb,0x8ddcff,0x20528c]:hero?[0x67be4c,0xa5dd72,0x367238]:[0x579bad,0x9ec8d2,0x355d70]):[0xcf4b4d,0xff9b8a,0x8c3039];
  if(hero||tower){
   let frame=this.frames.get(e.id);
   if(!frame){frame=this.scene.add.image(0,0,tower?'health-tower-frame':'health-hero-frame').setOrigin(0,0).setDepth(RENDER_DEPTH.bars-.01);this.frames.set(e.id,frame);}
   frame.setPosition(x-2,y-2).setDisplaySize(width+4,hero?15:14).setAlpha(alpha).setVisible(true);
  }else{
   g.fillStyle(0x02090e,alpha*.95).fillRect(x-1,y-1,width+2,height+2);
   g.fillStyle(0x66726c,alpha*.65).fillRect(x-1,y-2,width+2,1);
  }
  g.fillStyle(0x09141a,alpha).fillRect(x,y,width,height);
  if(lag>health)g.fillStyle(0xf0c48c,alpha*.9).fillRect(x,y,Math.ceil(width*lag),height);
  const amount=Math.max(1,Math.round(width*health));
  g.fillStyle(fill[0],alpha).fillRect(x,y,amount,height);
  g.fillStyle(fill[1],alpha).fillRect(x,y,amount,1);
  g.fillStyle(fill[2],alpha).fillRect(x,y+height-1,amount,1);
  const shield=shieldRemaining(e,time)+itemShieldRemaining(e,time);
  if(shield>0){const shieldWidth=Math.max(1,Math.min(width*.5,width*shield/e.maxHp)),left=x+Math.min(width-shieldWidth,amount);g.fillStyle(0xc2dce7,alpha).fillRect(left,y,shieldWidth,height);g.fillStyle(0xedf9ff,alpha).fillRect(left,y,shieldWidth,1);}
  if(hero||tower){
   if(tower&&e.towerHasPlates){
    for(const ratio of [.3,.55,.75,.9])g.fillStyle(0x081115,alpha*.8).fillRect(x+Math.round(width*ratio),y,1,height);
   }else{
    const step=hero?100:250;
    for(let hp=step;hp<e.maxHp;hp+=step){const dx=Math.round(width*hp/e.maxHp);g.fillStyle(0x081115,alpha*.8).fillRect(x+dx,y,1,height);}
   }
  }
  if(hero){
   g.fillStyle(0x07121b,alpha).fillRect(x,y+9,width,2);
   const resource=Math.round(width*Math.max(0,Math.min(1,(e.flow??0)/100))),ready=(e.flow??0)>=100;
   g.fillStyle(ready?0xf3f8fa:0x7c8c98,alpha).fillRect(x,y+9,resource,2);g.fillStyle(ready?0xffffff:0xb6c6cd,alpha).fillRect(x,y+9,resource,1);
  }
 }
 reset(){for(const frame of this.frames.values())frame.destroy();this.frames.clear();this.trail.reset();}
}
