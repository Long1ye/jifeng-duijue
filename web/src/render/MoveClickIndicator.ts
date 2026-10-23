import type Phaser from 'phaser';
import type {Point} from '../game/types';
import {RENDER_DEPTH} from './RenderDepth';
import atlasUrl from '../../assets/ui/move-click-2026-10-15/official/move-click-atlas.png?url';
import redAtlasUrl from '../../assets/ui/move-click-2026-10-15/official/move-click-atlas-red.png?url';

/** Client mesh + scrolling texture, baked at 60 Hz; no geometry deformation. */
export class MoveClickIndicator {
 static preload(scene:Phaser.Scene){
  scene.load.spritesheet('official-move-scroll',atlasUrl,{frameWidth:128,frameHeight:128,endFrame:23});
  scene.load.spritesheet('official-attack-scroll',redAtlasUrl,{frameWidth:128,frameHeight:128,endFrame:23});
 }
 private image:Phaser.GameObjects.Image;
 private click:{point:Point;at:number}|null=null;
 constructor(scene:Phaser.Scene){
  this.image=scene.add.image(0,0,'official-move-scroll',0).setScale(.45).setDepth(RENDER_DEPTH.feedback).setVisible(false);
 }
 show(point:Point,at:number,attack=false){
  this.image.setTexture(attack?'official-attack-scroll':'official-move-scroll',0);
  this.click={point:{...point},at};this.update(at);
 }
 reset(){this.click=null;this.image.setVisible(false);}
 update(now:number){
  if(!this.click)return;
  const age=(now-this.click.at)/1000;
  if(age>=.4||age<0){this.reset();return;}
  const {x,y}=this.click.point;
  this.image.setVisible(true).setFrame(Math.min(23,Math.floor(age*60))).setPosition(x,y);
 }
}
