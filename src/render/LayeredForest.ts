import Phaser from 'phaser';
import layout from '../../assets/map-layers/forest-v1/layers.json';
import groundUrl from '../../assets/map-layers/forest-v1/ground.png?url';
import {MAP_LAYOUT} from '../game/config';
import type {Point} from '../game/types';
import {layerMotion,type MapLayerKind} from './MapLayerLayout';
import {mapLayerFrame,mapFrameAt,MAP_FRAME_COUNT,MAP_LAYER_PADDING} from './MapLayerFrames';
const urls=import.meta.glob('../../assets/map-layers/forest-v1/layers/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export class LayeredForest {
 static preload(scene:Phaser.Scene){
  scene.load.image('forest-ground',groundUrl);
  for(const layer of layout.layers)scene.load.image(`forest-part-${layer.id}`,urls[`../../assets/map-layers/forest-v1/${layer.file}`]);
 }
 private original:Phaser.GameObjects.Image;
 private ground:Phaser.GameObjects.Image;
 private parts:Phaser.GameObjects.Image[]=[];
 private generatedKeys:string[]=[];
 constructor(private scene:Phaser.Scene){
  this.original=scene.add.image(0,0,'forest-map').setOrigin(0).setScale(MAP_LAYOUT.scale).setDepth(0).setVisible(false);
  this.ground=scene.add.image(0,0,'forest-ground').setOrigin(0).setScale(MAP_LAYOUT.scale).setDepth(0);
  layout.layers.forEach(layer=>{
   const source=scene.textures.get(`forest-part-${layer.id}`).getSourceImage() as HTMLImageElement;
   const scratch=document.createElement('canvas');scratch.width=layer.width;scratch.height=layer.height;
   const context=scratch.getContext('2d')!;context.drawImage(source,0,0);
   const pixels=context.getImageData(0,0,layer.width,layer.height).data;
   const w=layer.width+MAP_LAYER_PADDING*2,h=layer.height+MAP_LAYER_PADDING*2,key=`forest-motion-${layer.id}`;
   const texture=scene.textures.createCanvas(key,w*MAP_FRAME_COUNT,h)!;
   for(let f=0;f<MAP_FRAME_COUNT;f++){
    texture.getContext().putImageData(new ImageData(mapLayerFrame(pixels,layer.width,layer.height,layer.kind as MapLayerKind,f) as Uint8ClampedArray<ArrayBuffer>,w,h),f*w,0);
    texture.add(f,0,f*w,0,w,h);
   }
   texture.refresh();texture.setFilter(Phaser.Textures.FilterMode.NEAREST);this.generatedKeys.push(key);
   const image=scene.add.image((layer.x-MAP_LAYER_PADDING)*MAP_LAYOUT.scale,(layer.y+layer.height+MAP_LAYER_PADDING)*MAP_LAYOUT.scale,key,0)
    .setOrigin(0,1).setScale(MAP_LAYOUT.scale).setDepth(layer.kind==='water'?.2:10+(layer.y+layer.height)*MAP_LAYOUT.scale);
   this.parts.push(image);
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.destroy());
 }
 update(time:number,hero:Point,enabled:boolean,visible=true){
  if(!visible){this.original.setVisible(false);this.ground.setVisible(false);this.parts.forEach(p=>p.setVisible(false));return;}
  this.original.setVisible(!enabled);this.ground.setVisible(enabled);
  layout.layers.forEach((layer,i)=>{
   const image=this.parts[i];image.setVisible(enabled);if(!enabled)return;
   const kind=layer.kind as MapLayerKind,motion=layerMotion(kind,time,i*1.7);
   image.setFrame(mapFrameAt(kind,time,i)).setScale(MAP_LAYOUT.scale,MAP_LAYOUT.scale*motion.scaleY);
   const behind=(kind==='canopy'||kind==='grass')&&hero.x>layer.x*2-8&&hero.x<(layer.x+layer.width)*2+8&&hero.y>layer.y*2&&hero.y<(layer.y+layer.height)*2;
   image.setAlpha(behind?.58:motion.alpha);
  });
 }
 private destroy(){
  this.parts.forEach(p=>p.destroy());this.parts=[];this.original.destroy();this.ground.destroy();
  this.generatedKeys.forEach(key=>this.scene.textures.remove(key));this.generatedKeys=[];
 }
}
