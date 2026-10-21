import Phaser from 'phaser';
import type {Match} from '../game/Match';
import {SnowTrailTracker} from './SnowTrails';
import {snowSurface} from './SnowSurface';
import {environmentWind} from './EnvironmentWind';
/** Bounded footfalls and analytic short-lived snow puffs; no transient GameObjects. */
export class SnowContact {
 private tracker=new SnowTrailTracker();
 private prints:Phaser.GameObjects.Graphics;
 private powder:Phaser.GameObjects.Graphics;
 constructor(private scene:Phaser.Scene){
  this.prints=scene.add.graphics().setDepth(.79);
  this.powder=scene.add.graphics().setDepth(9);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.reset();this.prints.destroy();this.powder.destroy();});
 }
 reset(){this.tracker.reset();this.prints.clear();this.powder.clear();}
 update(match:Match,enabled:boolean){
  this.prints.clear();this.powder.clear();
  if(!enabled){this.tracker.reset();return;}
  this.tracker.update(match.time,match.entities.filter(e=>e.kind==='hero'&&e.hp>0&&!(e.airborneUntil&&e.airborneUntil>match.time)),snowSurface);
  const view=this.scene.cameras.main.worldView;
  for(const step of this.tracker.steps){
   if(!view.contains(step.x,step.y))continue;
   const age=match.time-step.at,alpha=.52*Math.min(1,(7-age)/3);
   const g=this.prints;
   g.save();g.translateCanvas(Math.round(step.x),Math.round(step.y));g.rotateCanvas(step.angle);
   g.fillStyle(0x294555,alpha).fillRect(-5,-2,9,4).fillRect(-6,-1,2,2);
   g.fillStyle(0xe1f1f4,alpha*.65).fillRect(-4,2,7,1);g.restore();
   if(age<.85){
    const wind=environmentWind(step.at,step.x,step.y);
    for(let i=0;i<8;i++){
     const spread=(i-3.5)*.8;
     const x=step.x+wind.x*age*.6+Math.cos(step.angle+spread)*age*28;
     const y=step.y+Math.sin(step.angle+spread)*age*15-27*age+30*age*age;
     this.powder.fillStyle(i%2?0xc1dce8:0xe0f0f5,(1-age/.85)*.67).fillRect(Math.round(x),Math.round(y),i%2?3:4,2);
    }
   }
  }
 }
}
