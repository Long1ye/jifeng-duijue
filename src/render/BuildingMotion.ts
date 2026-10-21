import Phaser from 'phaser';
import {BUILDING_CORES,buildingMotion,type AnimatedBuildingKind} from './BuildingAnimation';
import {environmentWind} from './EnvironmentWind';
import {BRIDGE_LIGHTS,bridgeLightPoint,lightKey,brazierShear} from './BridgeLights';
import {actorDepth} from './RenderDepth';
import {fireFlicker} from './EnvironmentalLight';

interface Building {
 image:Phaser.GameObjects.Image;source:string;kind:AnimatedBuildingKind;phase:number;red:boolean;
 core:Phaser.GameObjects.Image;glow:Phaser.GameObjects.Image;sheen:Phaser.GameObjects.Image;
 runes:Phaser.GameObjects.Image;particles:Phaser.GameObjects.Graphics;alive:()=>boolean;
}
/** Split only the energy-bearing art. Stone bases, hitboxes and sorting anchors stay fixed. */
export class BuildingMotion {
 private buildings=new Map<Phaser.GameObjects.Image,Building>();
 private textures=new Set<string>();
 private fires:{image:Phaser.GameObjects.Image;x:number;y:number;scale:number;phase:number}[]=[];
 constructor(private scene:Phaser.Scene){
  this.makeFires();
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
   for(const b of this.buildings.values())this.destroyParts(b);
   this.buildings.clear();for(const f of this.fires)f.image.destroy();this.fires=[];
   for(const key of this.textures)scene.textures.remove(key);this.textures.clear();
  });
 }
 register(image:Phaser.GameObjects.Image,kind:AnimatedBuildingKind,red:boolean,alive=()=>true){
  if(this.buildings.has(image))return;
  const source=image.texture.key;
  this.split(source,kind,red);
  const sprite=(suffix:string)=>this.scene.add.image(image.x,image.y,`${source}-motion-${suffix}`).setVisible(false);
  this.buildings.set(image,{image,source,kind,red,phase:image.x*.009+image.y*.003,alive,
   core:sprite('core'),glow:sprite('core').setBlendMode(Phaser.BlendModes.ADD),
   sheen:sprite('core').setBlendMode(Phaser.BlendModes.ADD),
   runes:sprite('runes').setBlendMode(Phaser.BlendModes.ADD),particles:this.scene.add.graphics()});
 }
 private split(sourceKey:string,kind:AnimatedBuildingKind,red:boolean){
  const baseKey=`${sourceKey}-motion-base`;
  if(this.textures.has(baseKey))return;
  const source=this.scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement|HTMLCanvasElement;
  const w=source.width,h=source.height,shape=BUILDING_CORES[kind];
  for(const part of ['base','core','runes']){
   const key=`${sourceKey}-motion-${part}`,texture=this.scene.textures.createCanvas(key,w,h)!;
   const ctx=texture.getContext();ctx.imageSmoothingEnabled=false;ctx.drawImage(source,0,0);
   if(part==='runes'){
    const pixels=ctx.getImageData(0,0,w,h);
    for(let i=0;i<pixels.data.length;i+=4){
     const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
     if(kind!=='tower'||!(red?r>g*1.35&&r>b*1.3:g>r*1.3&&b>r*1.45))pixels.data[i+3]=0;
    }
    ctx.putImageData(pixels,0,0);
   }
   ctx.beginPath();shape.polygon.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
   if(part==='base'){
    ctx.save();ctx.clip();ctx.clearRect(0,0,w,h);ctx.fillStyle=red?'#362431':'#203748';ctx.fillRect(0,0,w,h);ctx.restore();
   }else{
    ctx.globalCompositeOperation=part==='core'?'destination-in':'destination-out';ctx.fill();ctx.globalCompositeOperation='source-over';
   }
   texture.refresh();texture.setFilter(Phaser.Textures.FilterMode.NEAREST);this.textures.add(key);
  }
 }
 private makeFires(){
  const source=this.scene.textures.get(lightKey('brazier')).getSourceImage() as HTMLImageElement;
  const key='building-moving-flame',texture=this.scene.textures.createCanvas(key,235,215)!;
  const ctx=texture.getContext();ctx.drawImage(source,390,245,235,215,0,0,235,215);
  const pixels=ctx.getImageData(0,0,235,215);
  for(let i=0;i<pixels.data.length;i+=4){
   const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
   if(r<100||r<g*1.08||g<b*1.4)pixels.data[i+3]=0;
  }
  ctx.putImageData(pixels,0,0);texture.refresh();texture.setFilter(Phaser.Textures.FilterMode.NEAREST);this.textures.add(key);
  for(const light of BRIDGE_LIGHTS){
   if(light.kind!=='brazier')continue;
   const p=bridgeLightPoint(light),scale=light.width/source.width;
   const x=p.x-(507.5-source.width/2)*scale;
   const y=p.y+(460-source.height*.78)*scale+brazierShear(light)*(507.5-source.width/2)*scale;
   const image=this.scene.add.image(x,y,key).setOrigin(.5,1).setFlipX(true).setDepth(actorDepth(p.y,71));
   this.fires.push({image,x,y,scale,phase:light.station});
  }
 }
 private destroyParts(b:Building){b.core.destroy();b.glow.destroy();b.sheen.destroy();b.runes.destroy();b.particles.destroy();}
 update(time:number,visible:boolean,enabled:boolean,fireEnabled:boolean){
  const view=this.scene.cameras.main.worldView;
  for(const [image,b] of this.buildings){
   if(!image.scene){this.destroyParts(b);this.buildings.delete(image);continue;}
   const active=visible&&enabled&&b.alive()&&image.visible;
   image.setTexture(active?`${b.source}-motion-base`:b.source);
   const inView=image.x>view.left-250&&image.x<view.right+250&&image.y>view.top-50&&image.y<view.bottom+300;
   const show=active&&inView;
   for(const part of [b.core,b.glow,b.sheen,b.runes])part.setVisible(show);
   b.particles.clear().setVisible(show);if(!show)continue;
   const motion=buildingMotion(time,b.phase,b.kind),shape=BUILDING_CORES[b.kind];
   const sign=image.flipX?-1:1;
   const cx=image.x+(shape.cx-image.width*image.originX)*image.scaleX*sign;
   const cy=image.y+(shape.cy-image.height*image.originY)*image.scaleY-motion.lift;
   for(const part of [b.core,b.glow,b.sheen,b.runes])part.setOrigin(image.originX,image.originY)
    .setScale(image.scaleX,image.scaleY).setFlipX(image.flipX).setPosition(image.x,image.y-motion.lift).setDepth(image.depth+.1);
   // Rotate about the crystal centre, never the building's ground anchor.
   for(const part of [b.core,b.glow,b.sheen])part.setOrigin(image.flipX?1-shape.cx/image.width:shape.cx/image.width,shape.cy/image.height).setPosition(cx,cy).setRotation(motion.rotation);
   b.core.setAlpha(image.alpha);b.glow.setAlpha(image.alpha*(.1+motion.pulse*.32));
   b.runes.setPosition(image.x,image.y).setAlpha(image.alpha*(.2+motion.pulse*.65));
   const minY=Math.min(...shape.polygon.map(p=>p[1])),maxY=Math.max(...shape.polygon.map(p=>p[1]));
   b.sheen.setCrop(0,minY+motion.scan*(maxY-minY),image.width,Math.max(8,5/image.scaleY)).setAlpha(image.alpha*.65);
   const color=b.red?0xff8674:0x89e5ff,g=b.particles;
   g.setDepth(image.depth+.2);
   const radius=b.kind==='tower'?26:b.kind==='nexus'?55:38;
   g.lineStyle(2,color,image.alpha*(.2+.18*motion.pulse)).strokeEllipse(cx,cy,radius*2,radius*.6);
   // Clearly visible orbiting shards, with an elliptical orbit around the energy core.
   for(let i=0;i<5;i++){
    const angle=motion.orbit+i*Math.PI*2/5;
    const x=Math.round(cx+Math.cos(angle)*radius),y=Math.round(cy+Math.sin(angle)*radius*.3);
    g.fillStyle(color,image.alpha*(.65+.3*motion.pulse)).fillPoints([{x,y:y-6},{x:x+3,y},{x,y:y+6},{x:x-3,y}],true);
    g.fillStyle(0xf0faff,image.alpha*.9).fillRect(x-1,y-3,2,5);
    for(let j=1;j<=4;j++){
     const tail=angle-j*.12;
     g.fillStyle(color,image.alpha*(.45-j*.08)).fillRect(Math.round(cx+Math.cos(tail)*radius),Math.round(cy+Math.sin(tail)*radius*.3),3,2);
    }
   }
   for(let i=0;i<5;i++){
    const age=((time*.45+i*.21+b.phase)%1+1)%1;
    const x=Math.round(cx+Math.sin(i*2.4+b.phase)*radius*.7),y=Math.round(cy+20-age*65);
    g.fillStyle(color,image.alpha*(1-age)*.8).fillRect(x,y,3,5);
   }
  }
  for(const f of this.fires){
   const show=visible&&enabled&&fireEnabled&&f.x>view.left-100&&f.x<view.right+100&&f.y>view.top-100&&f.y<view.bottom+100;
   f.image.setVisible(show);if(!show)continue;
   const wind=environmentWind(time,f.x,f.y),pulse=fireFlicker(time,f.phase);
   f.image.setScale(f.scale*(1.15+Math.sin(time*7+f.phase)*.12),f.scale*(1.4+(pulse-1)*1.4))
    .setRotation(-.08-wind.gust*.22+Math.sin(time*5+f.phase)*.07).setAlpha(.95);
  }
 }
}
