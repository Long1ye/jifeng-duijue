import Phaser from 'phaser';
import inhibitorUrl from '../../assets/map-modules/howling-brush-crystal-v2/inhibitor.png?url';
import redInhibitorUrl from '../../assets/map-modules/howling-red-team-v1/inhibitor.png?url';
import {BRIDGE,BRIDGE_SLOTS,bridgePoint} from '../game/Bridge';
import {actorDepth} from './RenderDepth';
import {BRIDGE_LIGHTS,brazierShear,bridgeLightPoint,lightKey} from './BridgeLights';
import {BRIDGE_SITE_ART,NEXUS_FOOT_ORIGIN_Y,SITE_ART_URLS,siteArtKey,siteArtPoint,type SiteArtKind} from './BridgeSiteArt';
import {bridgeRails,drawBridgeRail,railKey} from './BridgeRails';
import {halfWidth} from '../../assets/map-studies/howling-abyss-v1/geometry';
import {structureOcclusionAlpha} from './StructureOcclusion';
import type {Point} from '../game/types';
import {LivingBrush} from './LivingBrush';
import type {BuildingMotion} from './BuildingMotion';

const INHIBITOR_CROP={x:94,y:40,width:836,height:920};
// The solid stone base ends at source y=948, not at the crop's full height.
const INHIBITOR_FOOT_ORIGIN_Y=(948-INHIBITOR_CROP.y)/INHIBITOR_CROP.height;

/** Environmental interaction art. Gameplay brush concealment and inhibitor health remain separate. */
export class BridgeDecor {
 static preload(scene:Phaser.Scene){
  LivingBrush.preload(scene);
  scene.load.image('bridge-inhibitor-source',inhibitorUrl);
  scene.load.image('bridge-inhibitor-red-source',redInhibitorUrl);
  for(const [kind,url] of Object.entries(SITE_ART_URLS))scene.load.image(siteArtKey(kind as SiteArtKind),url);
 }

 private brush:LivingBrush;
 private crystals:{image:Phaser.GameObjects.Image;x:number;y:number}[]=[];
 private foregroundFires:{image:Phaser.GameObjects.Image;key:string}[]=[];
 private foregroundRails:{image:Phaser.GameObjects.Image;key:string;x:number;y:number}[]=[];
 private siteViews:{image:Phaser.GameObjects.Image;kind:SiteArtKind;phase:number;x:number;y:number}[]=[];
 private foundationSeams:Phaser.GameObjects.Ellipse[]=[];

 constructor(private scene:Phaser.Scene,buildingMotion?:BuildingMotion){
  this.brush=new LivingBrush(scene);
  this.crop('bridge-inhibitor-source','bridge-inhibitor',INHIBITOR_CROP);
  this.crop('bridge-inhibitor-red-source','bridge-inhibitor-red',INHIBITOR_CROP);
  for(const slot of BRIDGE_SLOTS.filter(s=>s.id.endsWith('inhibitor'))){
   const p=bridgePoint(slot.u,slot.v);
   // The crystal's isometric stone footprint sits *behind* its frontmost toe.
   // Keep the ground seam under the masonry instead of casting it forward.
   const seam=scene.add.ellipse(p.x,p.y-20,97,43,0x07131e,.24).setDepth(.8);
   const image=scene.add.image(p.x,p.y,slot.team==='red'?'bridge-inhibitor-red':'bridge-inhibitor')
    .setOrigin(.5,INHIBITOR_FOOT_ORIGIN_Y).setScale(.115).setDepth(actorDepth(p.y));
   this.foundationSeams.push(seam);
   this.crystals.push({image,x:p.x,y:p.y});
   buildingMotion?.register(image,'inhibitor',slot.team==='red');
  }
  for(const [index,site] of BRIDGE_SITE_ART.entries()){
   const p=siteArtPoint(site);
   const seam=scene.add.ellipse(p.x,p.y-site.size*.2,site.size*.96,site.size*.4,0x07131e,.22).setDepth(.8);
   const image=scene.add.image(p.x,p.y,siteArtKey(site.kind))
    .setOrigin(.5,NEXUS_FOOT_ORIGIN_Y).setScale(site.size/1024).setFlipX(site.flipX)
    .setDepth(actorDepth(p.y));
   image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
   this.foundationSeams.push(seam);
   this.siteViews.push({image,kind:site.kind,phase:index*1.31,x:p.x,y:p.y});
   buildingMotion?.register(image,'nexus',site.kind==='nexusRed');
  }
  // Exact local copies of the baked near rail can cover actors behind it.
  for(const [index,rail] of bridgeRails().filter(r=>r.side===1&&Math.abs(r.u)<=360).entries()){
   const p=bridgePoint(rail.u,rail.side*(halfWidth(BRIDGE,rail.u)-2));
   const key=`bridge-front-rail-${index}`,size=256;
   const texture=scene.textures.createCanvas(key,size,size)!;
   drawBridgeRail(texture.getContext(),rail,scene.textures.get(railKey(rail.variant)).getSourceImage() as HTMLImageElement,{x:size/2-p.x,y:size/2-p.y});
   texture.refresh();texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
   const image=scene.add.image(p.x,p.y,key).setDepth(actorDepth(p.y,4));
   this.foregroundRails.push({image,key,x:p.x,y:p.y});
  }
  // The central reeds project over the floor composite. Raise only the
  // fire/bowl, not its masonry rail bay, so the rail still joins cleanly.
  const source=scene.textures.get(lightKey('brazier')).getSourceImage() as HTMLImageElement;
  for(const [index,light] of BRIDGE_LIGHTS.filter(l=>l.kind==='brazier' && l.station<=70).entries()){
   const key=`bridge-foreground-fire-${index}`;
   const texture=scene.textures.createCanvas(key,192,192)!;
   const ctx=texture.getContext();
   const scale=light.width/source.naturalWidth;
   ctx.imageSmoothingEnabled=false;
   ctx.translate(96,96);
   ctx.transform(-scale,brazierShear(light)*scale,0,scale,0,0);
   // Source-space silhouette excludes both stone posts and rail arches.
   const outline=[
    [470,245],[525,260],[575,298],[610,350],[625,415],
    [625,470],[590,490],[580,540],[575,650],[545,686],
    [455,686],[415,650],[405,535],[385,475],[385,405],
    [405,355],[435,315],
   ];
   ctx.beginPath();
   outline.forEach(([x,y],i)=>i?ctx.lineTo(x-source.naturalWidth/2,y-source.naturalHeight*.78):ctx.moveTo(x-source.naturalWidth/2,y-source.naturalHeight*.78));
   ctx.closePath();ctx.clip();
   ctx.drawImage(source,-source.naturalWidth/2,-source.naturalHeight*.78);
   texture.refresh();texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
   const p=bridgeLightPoint(light);
   const image=scene.add.image(p.x,p.y,key).setOrigin(.5).setDepth(actorDepth(p.y,70));
   this.foregroundFires.push({image,key});
  }
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
   for(const {image} of this.crystals)image.destroy();
   for(const {image} of this.siteViews)image.destroy();
   for(const seam of this.foundationSeams)seam.destroy();
   for(const {image,key} of this.foregroundRails){image.destroy();scene.textures.remove(key);}
   for(const {image,key} of this.foregroundFires){image.destroy();scene.textures.remove(key);}
   scene.textures.remove('bridge-inhibitor');scene.textures.remove('bridge-inhibitor-red');
  });
 }

 private crop(sourceKey:string,targetKey:string,crop:{x:number;y:number;width:number;height:number}){
  const source=this.scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
  const texture=this.scene.textures.createCanvas(targetKey,crop.width,crop.height)!;
  texture.getContext().drawImage(source,crop.x,crop.y,crop.width,crop.height,0,0,crop.width,crop.height);
  texture.refresh();texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
 }


 reset(){this.brush.reset();}

 update(time:number,visible:boolean,animated:boolean,actors:readonly Point[]=[],lively=true,disturbances:readonly (Point&{strength:number})[]=[]){
  const bounds=this.scene.cameras.main.worldView;
  this.brush.update(time,visible,animated&&lively,actors,disturbances);
  for(const [i,{image,x,y}] of this.crystals.entries()){
   image.setVisible(visible);
   if(visible)image.setAlpha((animated?.93+.035*Math.sin(time*1.45+i*1.8):.96)*structureOcclusionAlpha('inhibitor',{x,y},actors));
  }
  for(const {image,phase,x,y} of this.siteViews){
   image.setVisible(visible);
   if(visible)image.setAlpha((animated?.95+.025*Math.sin(time*1.2+phase):1)*structureOcclusionAlpha('nexus',{x,y},actors));
  }
  for(const seam of this.foundationSeams)seam.setVisible(visible);
  for(const rail of this.foregroundRails)rail.image.setVisible(visible&&rail.x>=bounds.left-200&&rail.x<=bounds.right+200&&rail.y>=bounds.top-200&&rail.y<=bounds.bottom+200);
  for(const {image} of this.foregroundFires)image.setVisible(visible);
 }
}
