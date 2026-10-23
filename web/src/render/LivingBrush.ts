import Phaser from 'phaser';
import {BRIDGE,bridgePoint} from '../game/Bridge';
import type {Point} from '../game/types';
import {actorDepth} from './RenderDepth';
import {environmentWind} from './EnvironmentWind';
import {structureOcclusionAlpha} from './StructureOcclusion';
import {stepBrush,brushStripPose,brushInfluence} from './BrushMotion';
const URLS=import.meta.glob('../../assets/map-modules/living-brush-v1/components/component_*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const hash=(a:number,b:number)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
interface Tuft extends Point {image:Phaser.GameObjects.Image|Phaser.GameObjects.Rope;sourceHeight:number;height:number;phase:number;layer:number;bend:number;velocity:number;tip:number;tipVelocity:number;nearby:number;gust:number;shedAt:number}
export class LivingBrush {
 static preload(scene:Phaser.Scene){
  for(let i=1;i<=6;i++){
   const url=Object.entries(URLS).find(([path])=>path.endsWith(`component_${String(i).padStart(3,'0')}.png`))?.[1];
   if(!url)throw new Error(`Missing living brush ${i}`);
   scene.load.image(`living-brush-source-${i}`,url);
  }
 }
 private tufts:Tuft[]=[];
 private snow:{x:number;y:number;at:number;vx:number;seed:number}[]=[];
 private flakes:Phaser.GameObjects.Graphics;
 private clock=-1;
 constructor(private scene:Phaser.Scene){
  const deformable=scene.game.renderer.type===Phaser.WEBGL;
  for(let i=1;i<=6;i++)scene.textures.get(`living-brush-source-${i}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
  for(const [b,brush] of BRIDGE.brush.entries()){
   const count=Math.ceil(brush.length/15);
   for(let layer=0;layer<3;layer++)for(let i=0;i<count;i++){
    const n=hash(i+b*11,layer+4);
    const u=brush.u+(i-(count-1)/2)*brush.length/count+(layer-1)*3;
    const v=brush.v+(layer-1)*brush.width*.3+(n-.5)*5;
    const p=bridgePoint(u,v),variant=1+(i+layer*2+b)%6;
    const key=`living-brush-source-${variant}`,sourceHeight=scene.textures.get(key).getSourceImage().height;
    const image=deformable
     ?scene.add.rope(p.x,p.y,key,undefined,Array.from({length:13},(_,j)=>({x:0,y:(j/12-.97)*sourceHeight})),false)
     :scene.add.image(p.x,p.y,key).setOrigin(.5,.97);
    image.setFlipX((i+b+layer)%2===0).setDepth(actorDepth(p.y,layer===2?6:-5));
    // Scale by height to keep reeds tall and shorter varieties wide, without stretching art.
    const height=(layer===0?78:layer===1?64:48)+n*18;
    image.setScale(height/sourceHeight).setAlpha(layer===0?.87:.96);
    const color=layer===0?0xadc2ce:0xe0e8ed;
    if(image instanceof Phaser.GameObjects.Rope)image.setColors(color);else image.setTint(color);
    this.tufts.push({...p,image,sourceHeight,height,phase:b*1.7+i*.9+layer*2.1,layer,bend:0,velocity:0,tip:0,tipVelocity:0,nearby:0,gust:0,shedAt:-10});
   }
  }
  this.flakes=scene.add.graphics().setDepth(9000);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
   for(const t of this.tufts)t.image.destroy();this.tufts=[];this.snow=[];this.flakes.destroy();
  });
 }
 reset(){
  this.clock=-1;this.snow=[];this.flakes.clear();
  for(const t of this.tufts){t.bend=0;t.velocity=0;t.tip=0;t.tipVelocity=0;t.nearby=0;t.gust=0;t.shedAt=-10;}
 }
 update(time:number,visible:boolean,animated:boolean,actors:readonly Point[],disturbances:readonly (Point&{strength:number})[]=[]){
  if(time<this.clock)this.reset();
  const dt=this.clock<0?0:Math.min(.1,time-this.clock);this.clock=time;
  const view=this.scene.cameras.main.worldView;
  this.flakes.clear().setVisible(visible&&animated);
  if(!animated||!visible)this.snow=[];
  for(const t of this.tufts){
   const inView=t.x>view.left-120&&t.x<view.right+120&&t.y>view.top-30&&t.y<view.bottom+140;
   t.image.setVisible(visible&&inView);if(!visible||!inView)continue;
   let nearby=0,push=0;
   if(animated)for(const actor of actors){
    const influence=brushInfluence(t.x-actor.x,t.y-actor.y);
    nearby=Math.max(nearby,influence.nearby);push+=influence.push;
   }
   if(animated)for(const disturbance of disturbances){
    const influence=brushInfluence(t.x-disturbance.x,t.y-disturbance.y);
    nearby=Math.max(nearby,influence.nearby*disturbance.strength);push+=influence.push*disturbance.strength;
   }
   const wind=environmentWind(time,t.x,t.y);
   const lean=Math.tanh(push),sensitivity=.75+hash(t.phase,8)*.4;
   const target=animated?(wind.x*.0011+Math.sin(time*.73+t.phase)*.012)*sensitivity+lean*.34:0;
   if(animated){
    const pose=stepBrush(t.bend,t.velocity,target,dt);t.bend=pose.bend;t.velocity=pose.velocity;
    const tip=stepBrush(t.tip,t.tipVelocity,t.bend,dt,true);t.tip=tip.bend;t.tipVelocity=tip.velocity;
   }else{t.bend=0;t.velocity=0;t.tip=0;t.tipVelocity=0;}
   if(t.image instanceof Phaser.GameObjects.Rope){
    for(let j=0;j<t.image.points.length;j++){
     const tNorm=j/(t.image.points.length-1);
     const pose=animated?brushStripPose(t.bend,t.tip,time,t.phase,t.sourceHeight,tNorm):{x:0,y:(tNorm-.97)*t.sourceHeight};
     t.image.points[j].x=pose.x;t.image.points[j].y=pose.y;
    }
    t.image.setDirty();
   }else t.image.setRotation(t.bend*.22);
   t.image.setAlpha((t.layer===0?.87:.96)*structureOcclusionAlpha('brush',t,actors));
   if(animated&&dt>0&&time-t.shedAt>1.3&&((nearby>.25&&nearby-t.nearby>.08)||(wind.gust>.6&&t.gust<=.6))){
    t.shedAt=time;
    for(let j=0;j<4;j++){
     if(this.snow.length>=180)this.snow.shift();
     this.snow.push({x:t.x+t.bend*t.height*.4+(j-1.5)*8,y:t.y-t.height*(.55+j*.09),at:time,vx:wind.x*.3+lean*18,seed:j+t.phase});
    }
   }
   t.nearby=nearby;t.gust=wind.gust;
  }
  this.snow=this.snow.filter(f=>time-f.at<1.1);
  for(const f of this.snow){
   const age=time-f.at,x=f.x+f.vx*age+Math.sin(f.seed+age*5)*3,y=f.y+8*age+40*age*age;
   this.flakes.fillStyle(0xe1f1f7,(1-age/1.1)*.8).fillRect(Math.round(x),Math.round(y),3,2);
  }
 }
}
