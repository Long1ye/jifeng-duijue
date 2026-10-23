import Phaser from 'phaser';
import {BRIDGE,bridgePoint} from '../game/Bridge';
import {halfWidth} from '../../assets/map-studies/howling-abyss-v1/geometry';
const URLS=import.meta.glob('../../assets/map-modules/howling-abyss-v2/abyss-*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const GATE_URLS=import.meta.glob('../../assets/map-modules/howling-gates-v1/gate-*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
/** Decorative bridgehead only: no changes to the playable footprint or spawn slots. */
export function gateLayout(){
 return [
  {u:-785,v:-180,variant:2,size:850,anchorX:.65,anchorY:.65,depth:.13,alpha:.42},
  {u:785,v:-180,variant:3,size:750,anchorX:.4,anchorY:.65,depth:.13,alpha:.42},
 ];
}
export function abyssLayout(){
 const parts:{u:number;v:number;variant:number;size:number;depth:number;alpha:number;parallax:number;anchor:number}[]=[];
 for(const side of [-1,1])for(let u=-780,i=0;u<=780;u+=120,i++){
  parts.push({u,v:side*(halfWidth(BRIDGE,u)+210+(i%3)*45),variant:i%3===1?1:0,
   size:640+(i%3)*90,depth:.12,alpha:.52,parallax:.035,anchor:.3});
 }
 for(let u=-600;u<=600;u+=200){
  parts.push({u,v:halfWidth(BRIDGE,u)-20,variant:Math.abs(u)<=200?3:2,
   size:520,depth:.2,alpha:.68,parallax:0,anchor:.17});
 }
 return parts;
}
export class AbyssScenery {
 static preload(scene:Phaser.Scene){
  for(let i=0;i<4;i++){
   const url=Object.entries(GATE_URLS).find(([path])=>path.endsWith(`/gate-${i}.png`))?.[1];
   if(!url)throw new Error(`Missing bridgehead gate ${i}`);
   scene.load.image(`bridgehead-gate-${i}`,url);
  }
  for(let i=0;i<4;i++){
   const url=Object.entries(URLS).find(([path])=>path.endsWith(`/abyss-${i}.png`))?.[1];
   if(!url)throw new Error(`Missing abyss scenery ${i}`);
   scene.load.image(`abyss-scenery-${i}`,url);
  }
 }
 private parts:{image:Phaser.GameObjects.Image;x:number;y:number;parallax:number}[]=[];
 constructor(scene:Phaser.Scene){
  for(const part of gateLayout()){
   const p=bridgePoint(part.u,part.v);
   const image=scene.add.image(p.x,p.y,`bridgehead-gate-${part.variant}`)
    .setOrigin(part.anchorX,part.anchorY).setDisplaySize(part.size,part.size)
    .setDepth(part.depth).setAlpha(part.alpha).setTint(part.variant<2?0xc3d4df:0x7897ae);
   this.parts.push({image,x:p.x,y:p.y,parallax:0});
  }
  for(const part of abyssLayout()){
   const p=bridgePoint(part.u,part.v);
   const image=scene.add.image(p.x,p.y,`abyss-scenery-${part.variant}`)
    .setOrigin(.5,part.anchor).setDisplaySize(part.size,part.size).setDepth(part.depth)
    .setAlpha(part.alpha).setTint(part.variant<2?0x7897ae:0x8fa7b8);
   this.parts.push({image,x:p.x,y:p.y,parallax:part.parallax});
  }
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{for(const p of this.parts)p.image.destroy();this.parts=[];});
 }
 update(camera:Phaser.Cameras.Scene2D.Camera,visible:boolean){
  const dx=camera.worldView.centerX-BRIDGE.projection.origin[0],dy=camera.worldView.centerY-BRIDGE.projection.origin[1];
  for(const p of this.parts){
   p.image.setVisible(visible);
   if(visible)p.image.setPosition(p.x+dx*p.parallax,p.y+dy*p.parallax);
  }
 }
}
