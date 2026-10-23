import Phaser from 'phaser';
import type {Point} from '../game/types';
import {actorDepth} from './RenderDepth';
import {SnowBeast,SNOW_BEAST_HABITAT} from './SnowBeast';
const URLS=import.meta.glob('../../assets/ambient/snow-ferret-v1/components/component_*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export class AmbientWildlife {
 static preload(scene:Phaser.Scene){
  for(let i=1;i<=6;i++){
   const url=Object.entries(URLS).find(([path])=>path.endsWith(`component_${String(i).padStart(3,'0')}.png`))?.[1];
   if(!url)throw new Error(`Missing snow beast pose ${i}`);scene.load.image(`snow-beast-${i}`,url);
  }
 }
 private model:SnowBeast;
 private image:Phaser.GameObjects.Image;
 private shadow:Phaser.GameObjects.Ellipse;
 private wasEnabled=true;
 readonly disturbances:{x:number;y:number;strength:number}[]=[];
 constructor(private scene:Phaser.Scene){
  this.model=new SnowBeast(SNOW_BEAST_HABITAT.home,SNOW_BEAST_HABITAT.peeks);
  this.image=scene.add.image(this.model.position.x,this.model.position.y,'snow-beast-1').setVisible(false);
  this.shadow=scene.add.ellipse(0,0,24,8,0x081824,.22).setDepth(.87).setVisible(false);
  for(let i=1;i<=6;i++)scene.textures.get(`snow-beast-${i}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.image.destroy();this.shadow.destroy();});
 }
 reset(){this.model.reset();this.disturbances.length=0;this.image.setVisible(false);this.shadow.setVisible(false);}
 update(time:number,enabled:boolean,actors:readonly Point[]){
  if(!enabled){this.image.setVisible(false);this.shadow.setVisible(false);this.disturbances.length=0;this.wasEnabled=false;return;}
  if(!this.wasEnabled){this.model.reset();this.wasEnabled=true;}
  this.model.update(time,actors);
  const {position:p,mode,facing,exposure}=this.model,view=this.scene.cameras.main.worldView;
  if(mode==='hidden')this.disturbances.length=0;
  else{
   const disturbance=this.disturbances[0]??{x:p.x,y:p.y,strength:0};
   disturbance.x=p.x;disturbance.y=p.y;disturbance.strength=mode==='sniff'?.16+.12*Math.sin(time*3)**2:.65;
   this.disturbances[0]=disturbance;
  }
  const inView=p.x>view.left-70&&p.x<view.right+70&&p.y>view.top-20&&p.y<view.bottom+70;
  const visible=inView&&exposure>0;
  this.image.setVisible(visible);this.shadow.setVisible(visible);if(!visible)return;
  const moving=Math.hypot(this.model.target.x-p.x,this.model.target.y-p.y)>2&&(mode==='emerge'||mode==='retreat');
  const pose=moving?(Math.floor(time*(mode==='retreat'?10:5))%2?3:4):mode==='sniff'?5:6;
  this.image.setTexture(`snow-beast-${pose}`).setOrigin(.5,(this.image.height-10)/this.image.height).setScale(.13)
   .setPosition(p.x,p.y+(1-exposure)*10+(moving?Math.sin(time*9)*.7:Math.sin(time*1.7)*.25))
   .setFlipX(facing<0).setDepth(actorDepth(p.y)).setAlpha(exposure);
  this.shadow.setPosition(p.x,p.y).setScale(moving?.9:1).setAlpha(exposure*.22);
 }
}
