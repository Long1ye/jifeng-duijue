import Phaser from 'phaser';
import {BRIDGE,bridgePoint,onPlayableBridge} from '../game/Bridge';
import {halfWidth} from '../../assets/map-studies/howling-abyss-v1/geometry';
import {environmentWind} from './EnvironmentWind';
import {CachedPolygon} from './CachedPolygon';
import {abyssFall} from './AbyssMotion';
/** Falling bridge-edge snow shrinks and fades into the ravine, below the playable deck. */
export class AbyssLife {
 private falling:Phaser.GameObjects.Graphics;
  private nearFalling:Phaser.GameObjects.Graphics;
  private mist:Phaser.GameObjects.Graphics;
  private bands=[0,1,2].map(i=>new CachedPolygon(new Phaser.Geom.Ellipse(0,0,280+i*130,38+i*24).getPoints(24)));
 private sites=Array.from({length:34},(_,i)=>{
  const u=-650+Math.floor(i/2)*80,side=i%2?1:-1;
  return {...bridgePoint(u,side*(halfWidth(BRIDGE,u)+9)),side,phase:i*1.79,period:17+i%5};
 });
 constructor(private scene:Phaser.Scene){
  this.falling=scene.add.graphics().setDepth(.24);
    this.nearFalling=scene.add.graphics().setDepth(.58);
    this.mist=scene.add.graphics().setDepth(.21);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.falling.destroy();this.nearFalling.destroy();this.mist.destroy();});
 }
 update(time:number,enabled:boolean){
  this.falling.clear().setVisible(enabled);this.nearFalling.clear().setVisible(enabled);this.mist.clear().setVisible(enabled);if(!enabled)return;
  const view=this.scene.cameras.main.worldView;
  // World-anchored ribbons, at different distances below the deck. The floor masks them.
  for(let layer=2;layer>=0;layer--)for(const side of [-1,1])for(let u=-600;u<=600;u+=200){
   const p=bridgePoint(u,side*(halfWidth(BRIDGE,u)+95+layer*70));
   if(p.x<view.left-400||p.x>view.right+400||p.y<view.top-150||p.y>view.bottom+150)continue;
   const phase=u*.013+side*2+layer;
   const x=p.x+Math.sin(time*(.11-layer*.025)+phase)*(22+layer*9),y=p.y+Math.sin(time*.09+phase)*10;
   this.mist.fillStyle(layer===0?0x95b8ca:0x6e93ad,.026-layer*.005);
   this.bands[layer].fill(this.mist,x,y);
  }
  for(const [i,site] of this.sites.entries()){
   const g=site.side>0?this.nearFalling:this.falling;
   if(site.x<view.left-100||site.x>view.right+100||site.y<view.top-400||site.y>view.bottom+30)continue;
   const age=((time+site.phase)%site.period+site.period)%site.period;
   if(age>3.2)continue;
   const wind=environmentWind(time-age,site.x,site.y);
   for(let j=0;j<7;j++){
    const a=age-j*.045;if(a<0)continue;
    const pose=abyssFall(a,j+i),x=Math.round(site.x+pose.x+wind.x*a*.13+j*2),y=Math.round(site.y+pose.y-j);
    // Near-edge flakes fall in front of the fascia, but never cross onto walkable ground.
    if(site.side>0&&onPlayableBridge({x,y}))continue;
    const size=Math.max(1,Math.round((j%3+3)*pose.scale));
    g.fillStyle(j%2?0xa3c6db:0xe0eff5,pose.alpha).fillRect(x,y,size,Math.max(1,size-1));
    if(j===0&&a<.7)g.fillStyle(0xd8eaf2,(1-a/.7)*.2).fillRect(x-7,y,18,2);
   }
  }
 }
}
