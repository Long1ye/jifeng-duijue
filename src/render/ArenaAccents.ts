import Phaser from 'phaser';
import type { Match } from '../game/Match';
import type { GameEvent } from '../game/types';
import { BASES, HOWLING_MAP } from '../game/config';
import { BRIDGE_SLOTS, bridgePoint } from '../game/Bridge';
import { impactMotion } from './ImpactMotion';

/** Procedural accents only; never alter combat timing or generate new art files. */
export class ArenaAccents {
  private floor:Phaser.GameObjects.Graphics;
  private sparks:Phaser.GameObjects.Graphics;
  private bursts:{x:number;y:number;time:number;color:number;heavy:boolean;lastHit:boolean;quiet:boolean}[]=[];
  private clock=-1;
  enabled=true;
  constructor(scene:Phaser.Scene){
    this.floor=scene.add.graphics().setDepth(1.1);
    this.sparks=scene.add.graphics().setDepth(10002);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.floor.destroy();this.sparks.destroy();this.clear();});
  }
  clear(){this.bursts=[];this.clock=-1;}
  event(event:GameEvent,time:number){
    if(!this.enabled||!(event.type==='hit'||event.type==='last-hit'))return;
    if(this.bursts.length>=48)this.bursts.shift();
    this.bursts.push({x:event.x,y:event.y,time,color:event.type==='last-hit'?0xffdc8a:event.team==='blue'?0xc5f4ff:0xffba98,
      heavy:(event.amount??0)>=80,lastHit:event.type==='last-hit',quiet:event.sourceKind!=='hero'&&event.targetKind!=='hero'});
  }
  update(match:Match){
    const time=match.time;
    if(time<this.clock)this.clear();this.clock=time;
    this.floor.clear();this.sparks.clear();
    this.bursts=this.bursts.filter(b=>time-b.time<.55);
    if(!this.enabled){this.bursts=[];return;}
    for(const team of ['blue','red'] as const){
      const p=BASES[team],color=team==='blue'?0x9edfff:0xffb2bd;
      for(let i=0;i<2;i++){
        const phase=(time*.36+i*.5)%1;
        this.floor.lineStyle(1,color,(1-phase)*.19).strokeEllipse(p.x,p.y,38+phase*62,20+phase*30);
      }
      for(let i=0;i<5;i++){
        const phase=(time*.28+i*.2)%1,angle=i*2.4;
        this.sparks.fillStyle(color,Math.sin(phase*Math.PI)*.38).fillRect(Math.round(p.x+Math.cos(angle)*24),Math.round(p.y+Math.sin(angle)*12-phase*22),1,2);
      }
    }
    const towers=match.entities.filter(e=>e.kind==='tower'&&e.hp>0).map(e=>({x:e.x,y:e.y,team:e.team}));
    if(HOWLING_MAP)for(const slot of BRIDGE_SLOTS.filter(s=>s.id.includes('nexus-tower')||s.id.endsWith('inner')))towers.push({...bridgePoint(slot.u,slot.v),team:slot.team as 'blue'|'red'});
    for(const p of towers){
      const cycle=(time*.6+p.x*.013)%1,alpha=Math.pow(Math.sin(cycle*Math.PI),8)*.65;
      const x=p.x,y=p.y-139;
      this.sparks.lineStyle(1,p.team==='blue'?0xc7f7ff:0xffd0d0,alpha)
        .lineBetween(x-4,y,x+4,y).lineBetween(x,y-6,x,y+6);
    }
    for(const b of this.bursts){
      const age=time-b.time,count=b.quiet?2:b.heavy?10:6;
      if(b.quiet&&age>.18)continue;
      for(let i=0;i<count;i++){
        const p=impactMotion(age,i,b.heavy);
        this.sparks.fillStyle(b.color,p.alpha*(b.quiet?.35:.85)).fillRect(Math.round(b.x+p.x*(b.quiet?.4:1)),Math.round(b.y-14+p.y*(b.quiet?.4:1)),p.size,p.size);
      }
      if(age<.08&&!b.lastHit&&!b.quiet)this.sparks.lineStyle(b.heavy?2:1,0xf1fcff,(1-age/.08)*.8)
        .lineBetween(b.x-5,b.y-14,b.x+5,b.y-24);
      // Ground chips stay below units and cannot obscure their silhouettes.
      if(b.heavy)for(let i=0;i<4;i++){
        const p=impactMotion(age,i,true);
        this.floor.fillStyle(0x98b7c9,p.alpha*.45).fillRect(Math.round(b.x+p.x),Math.round(b.y+2+p.y*.4),2,1);
      }
    }
  }
}
