import type {WallSpec,Projection} from '../../assets/hero-skills/2026-10-12/yasuo/w-v4-free-angle/wall';
import {windWallPose,windWallAxes} from './WindWallAnimation';

export const WIND_WALL_CANVAS={size:256,originX:128,originY:176} as const;
export interface WindWallFrames {image:CanvasImageSource;width:number;height:number;columns:number;}

/** Draw generated animation as an upright plane with real ground-space orientation. */
export function drawWindWall(ctx:CanvasRenderingContext2D,wall:WallSpec,camera:Projection,ageMs:number,_windTime:number,art:WindWallFrames){
 const age=ageMs/1000,pose=windWallPose(age);
 if(!pose.active||pose.alpha<=0)return;
 const axis=windWallAxes(wall.angle*Math.PI/180),width=wall.width*(.35+.65*pose.grow),height=wall.height*pose.grow;
 const ox=camera.origin.x+wall.center.x,oy=camera.origin.y+wall.center.y*camera.groundScale;
 const sx=pose.frame%art.columns*art.width,sy=Math.floor(pose.frame/art.columns)*art.height;
 ctx.save();ctx.imageSmoothingEnabled=false;
 // Two shallow wind sheets retain thickness when viewed almost edge-on.
 for(const side of [-1,1]){
  ctx.save();ctx.globalAlpha=pose.alpha*(side<0?.28:.85);
  ctx.transform(axis.x*width/art.width,axis.y*camera.groundScale*width/art.width,
   0,height/art.height,ox-axis.x*width/2+axis.normalX*wall.thickness*side*.35,
   oy-axis.y*camera.groundScale*width/2-height+axis.normalY*wall.thickness*side*.35*camera.groundScale);
  ctx.drawImage(art.image,sx,sy,art.width,art.height,0,0,art.width,art.height);
  ctx.restore();
 }
 // A narrow foot ribbon anchors the moving curtain to its blocking line.
 ctx.globalAlpha=pose.alpha*.55;ctx.strokeStyle='#b5f6fa';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(ox+Math.sin(wall.angle*Math.PI/180)*wall.width/2,oy-axis.y*camera.groundScale*wall.width/2);
 ctx.lineTo(ox-Math.sin(wall.angle*Math.PI/180)*wall.width/2,oy+axis.y*camera.groundScale*wall.width/2);ctx.stroke();
 ctx.restore();
}
