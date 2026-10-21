import Phaser from 'phaser';
import {bridgePoint} from '../game/Bridge';
import {CAMP_URLS,drawCampActors} from './CampLayout';
export class BridgeCamp{
 static preload(scene:Phaser.Scene){for(const [path,url] of Object.entries(CAMP_URLS))scene.load.image(`camp-${path.split('/').pop()!.replace('.png','')}`,url);}
 private layers:{texture:Phaser.Textures.CanvasTexture;image:Phaser.GameObjects.Image;sign:number;x:number;y:number}[]=[];
 private sources:Record<string,HTMLImageElement>={};
 private last=-1;
 constructor(scene:Phaser.Scene){
  for(const path of Object.keys(CAMP_URLS)){const name=path.split('/').pop()!.replace('.png','');this.sources[name]=scene.textures.get(`camp-${name}`).getSourceImage() as HTMLImageElement;}
  for(const sign of [-1,1]){const p=bridgePoint(sign*775,0),x=p.x-450,y=p.y-400,texture=scene.textures.createCanvas(`camp-layer-${sign}`,900,800)!;
   this.layers.push({texture,image:scene.add.image(x,y,texture.key).setOrigin(0).setDepth(.65),sign,x,y});}
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{for(const l of this.layers){l.image.destroy();scene.textures.remove(l.texture.key);}this.layers=[];});
 }
 update(time:number,visible:boolean){
  for(const l of this.layers)l.image.setVisible(visible);if(!visible||Math.floor(time*12)===this.last)return;this.last=Math.floor(time*12);
  for(const l of this.layers){const c=l.texture.context;c.clearRect(0,0,900,800);c.save();c.translate(-l.x,-l.y);drawCampActors(c,l.sign,time,this.sources);c.restore();l.texture.refresh();}
 }
}
