import {DoubleSide,Group,LinearFilter,LinearMipmapLinearFilter,Mesh,MeshBasicMaterial,SRGBColorSpace,TextureLoader} from 'three';
import shopUrl from '../../assets/map-modules/sanctuary-shop-2026-10-20/runtime/shop.png?url';
import {bridgePoint} from '../game/Bridge';
import type {Team} from '../game/types';
import {toThree} from './Coordinates';
import {landmarkRelief} from './PaintedMapLandmarks';
import {disposeSceneResources} from './SceneResources';
import {SANCTUARY_SHOPS} from '../game/SanctuaryLayout';

export {SANCTUARY_SHOPS} from '../game/SanctuaryLayout';
export class SanctuaryShop {
 readonly group=new Group();
 readonly targets:Mesh[]=[];
 private disposed=false;
 private ready=false;
 hovered=false;
 constructor(){
  this.group.name='sanctuary-merchant-stalls';
  const map=new TextureLoader().load(shopUrl,()=>{if(!this.disposed)this.ready=true;});
  map.colorSpace=SRGBColorSpace;map.magFilter=LinearFilter;map.minFilter=LinearMipmapLinearFilter;map.anisotropy=4;
  const geometry=landmarkRelief({size:[1024,1024],anchor:[512,850],scale:.1,baseline:[[0,780],[240,850],[512,925],[800,850],[1024,780]]});
  for(const site of SANCTUARY_SHOPS){
   const material=new MeshBasicMaterial({map,alphaTest:.48,side:DoubleSide,toneMapped:false,fog:false});
   const mesh=new Mesh(geometry,material);mesh.position.copy(toThree(bridgePoint(site.u,site.v),1));
   mesh.name=`sanctuary-merchant-${site.team}`;mesh.userData.team=site.team;this.targets.push(mesh);this.group.add(mesh);
  }
 }
 update(team:Team,visible:boolean,time:number):void {
  this.group.visible=visible&&this.ready;
  for(const mesh of this.targets){const material=mesh.material as MeshBasicMaterial;material.color.setScalar(mesh.userData.team===team&&this.hovered?1.12:1+.015*Math.sin(time*2));}
 }
 dispose():void{this.disposed=true;disposeSceneResources(this.group);}
}
