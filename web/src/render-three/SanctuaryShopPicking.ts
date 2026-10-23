import {Mesh,MeshBasicMaterial,Raycaster,Vector2,type Texture} from 'three';
import type {Point,Team} from '../game/types';
import type {ThreeCamera,ViewRect} from './Coordinates';

const alphaCache=new WeakMap<Texture,{width:number;height:number;pixels:Uint8ClampedArray}>();
function opaqueAt(map:Texture,u:number,v:number):boolean {
 let sample=alphaCache.get(map);
 if(!sample){
  const image=map.image as HTMLImageElement|undefined;
  if(!image?.complete||!image.naturalWidth)return false;
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return false;
  context.drawImage(image,0,0);sample={width:canvas.width,height:canvas.height,pixels:context.getImageData(0,0,canvas.width,canvas.height).data};alphaCache.set(map,sample);
 }
 const x=Math.max(0,Math.min(sample.width-1,Math.floor(u*sample.width)));
 const y=Math.max(0,Math.min(sample.height-1,Math.floor((1-v)*sample.height)));
 return sample.pixels[(y*sample.width+x)*4+3]>=122;
}
/** Test the visible artwork, so transparent sprite corners do not steal ground clicks. */
export function pickSanctuaryShop(view:ThreeCamera,rect:ViewRect,client:Point,meshes:readonly Mesh[],team:Team,raycaster=new Raycaster()):boolean {
 if(rect.width<=0||rect.height<=0)return false;
 const x=(client.x-rect.left)/rect.width,y=(client.y-rect.top)/rect.height;
 if(x<0||x>1||y<0||y>1)return false;
 const targets=meshes.filter(mesh=>mesh.visible&&mesh.userData.team===team);
 for(const mesh of targets)mesh.updateWorldMatrix(true,false);
 raycaster.setFromCamera(new Vector2(x*2-1,1-y*2),view.camera);
 return raycaster.intersectObjects(targets,false).some(hit=>{
  const material=(hit.object as Mesh).material;
  return material instanceof MeshBasicMaterial&&!!material.map&&!!hit.uv&&opaqueAt(material.map,hit.uv.x,hit.uv.y);
 });
}
