import Phaser from 'phaser';
import type {Match} from '../game/Match';
import type {GameEvent} from '../game/types';
import {onPlayableBridge,BRIDGE} from '../game/Bridge';
import {BattleTraces} from './BattleTraces';
import {SnowTrailTracker} from './SnowTrails';
import {snowSurface} from './SnowSurface';
import {environmentWind} from './EnvironmentWind';
/** Floor-level combat debris and sparse marching dust, always behind actors. */
export class BattlefieldMotion {
 private traces=new BattleTraces();
 private march=new SnowTrailTracker();
 private floor:Phaser.GameObjects.Graphics;
 private dust:Phaser.GameObjects.Graphics;
 constructor(private scene:Phaser.Scene){
  this.floor=scene.add.graphics().setDepth(.81);this.dust=scene.add.graphics().setDepth(9);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.reset();this.floor.destroy();this.dust.destroy();});
 }
 reset(){this.traces.clear();this.march.reset();this.floor.clear();this.dust.clear();}
 event(event:GameEvent,time:number,enabled:boolean){if(enabled&&onPlayableBridge(event))this.traces.event(event,time);}
 update(match:Match,enabled:boolean){
  this.floor.clear();this.dust.clear();if(!enabled){this.reset();return;}
  const time=match.time,view=this.scene.cameras.main.worldView;
  this.traces.advance(time);
  const actors=match.entities.filter(e=>(e.kind==='melee'||e.kind==='ranged')&&e.hp>0&&e.id%3===0&&!(e.airborneUntil&&e.airborneUntil>time));
  this.march.update(time,actors,(x,y)=>onPlayableBridge({x,y}));
  for(const step of this.march.steps){
   const age=time-step.at;if(age>.65||!view.contains(step.x,step.y))continue;
   const snowy=snowSurface(step.x,step.y),wind=environmentWind(step.at,step.x,step.y);
   for(let i=0;i<4;i++){
    const x=step.x+wind.x*age*.4+(i-1.5)*age*14,y=step.y-age*(10+i*2)+age*age*18;
    this.dust.fillStyle(snowy?0xd7edf3:0x90a6b3,(1-age/.65)*(snowy?.5:.25)).fillRect(Math.round(x),Math.round(y),3,2);
   }
  }
  const heading=Math.atan2(BRIDGE.projection.along[1],BRIDGE.projection.along[0]);
  for(const mark of this.traces.marks){
   if(!view.contains(mark.x,mark.y))continue;
   const age=time-mark.at,life=mark.heavy?12:7,fade=Math.pow(Math.max(0,1-age/life),.8);
   const snowy=snowSurface(mark.x,mark.y),g=this.floor,radius=mark.heavy?24:12;
   g.save();g.translateCanvas(Math.round(mark.x),Math.round(mark.y));g.rotateCanvas(heading+(mark.seed%5-2)*.2);
   for(let i=0;i<(mark.heavy?3:1);i++){
    const y=(i-1)*5,length=radius-(i%2)*5;
    g.lineStyle(mark.heavy?2:1,snowy?0x294555:0x253b49,fade*(mark.heavy?.47:.3)).lineBetween(-length,y,length*.7,y+2);
    g.lineStyle(1,0xb2cbd6,fade*.35).lineBetween(-length+2,y+2,length*.6,y+4);
   }
   for(let i=0;i<(mark.heavy?7:3);i++){
    const angle=mark.seed+i*2.4,distance=6+(i*7+mark.seed)%radius;
    const x=Math.round(Math.cos(angle)*distance),y=Math.round(Math.sin(angle)*distance*.55);
    g.fillStyle(i%2?0xc0d6e0:0x526b7b,fade*.6).fillRect(x,y,mark.heavy?4:3,2);
   }
   g.restore();
   if(age<.65)for(let i=0;i<(mark.heavy?9:5);i++){
    const angle=mark.seed+i*2.4,travel=(mark.heavy?46:26)*age;
    const x=mark.x+Math.cos(angle)*travel,y=mark.y+Math.sin(angle)*travel*.4-30*age+46*age*age;
    this.dust.fillStyle(i%2?0xd5e8ee:0x7895a8,(1-age/.65)*.65).fillRect(Math.round(x),Math.round(y),3,2);
   }
  }
 }
}
