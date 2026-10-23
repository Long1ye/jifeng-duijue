import {Group, type InterleavedBufferAttribute} from 'three';
import {LineSegments2} from 'three/addons/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import type {PrototypeFrame} from '../presentation/PrototypeHost';
import type {Entity} from '../game/types';
import {towerRangeHint} from '../render/TowerRangeHint';
import {toThree, type ThreeCamera} from './Coordinates';

/** A thin ground boundary, visible above painted terrain without covering the lane. */
export class TowerRangeIndicator {
 readonly group=new Group();
 private readonly material=new LineMaterial({linewidth:2,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,fog:false});
 private readonly line=new LineSegments2(new LineSegmentsGeometry(),this.material);
 private readonly segments=new Float32Array(128*6);
 constructor(){
  this.group.name='enemy-tower-range';this.group.visible=false;
  this.line.geometry.setPositions(this.segments);this.line.frustumCulled=false;this.line.renderOrder=890;
  this.group.add(this.line);
 }
 update(frame:PrototypeFrame,camera:ThreeCamera,canSee:(entity:Entity)=>boolean=()=>true):void {
  const {match,positions,alpha}=frame,team=frame.localTeam??'blue';
  const player=positions.sample(match.hero(team),alpha),tower=match.tower(team==='blue'?'red':'blue');
  const hint=towerRangeHint(tower,player,canSee(tower)&&match.phase!=='ready'&&match.phase!=='ended');
  this.group.visible=!!hint;if(!hint)return;
  const center=positions.sample(tower,alpha);
  for(let i=0;i<128;i++)for(let end=0;end<2;end++){
   const angle=(i+end)*Math.PI*2/128;
   const p=toThree({x:center.x+Math.cos(angle)*hint.radius,y:center.y+Math.sin(angle)*hint.radius},3);
   this.segments.set([p.x,p.y,p.z],i*6+end*3);
  }
  const attribute=this.line.geometry.getAttribute('instanceStart') as InterleavedBufferAttribute;
  attribute.data.array.set(this.segments);attribute.data.needsUpdate=true;
  this.material.resolution.set(camera.size.width,camera.size.height);
  this.material.opacity=hint.alpha;this.material.color.setHex(hint.color);this.material.linewidth=hint.danger?2.5:2;
 }
 dispose():void {this.line.geometry.dispose();this.material.dispose();this.group.removeFromParent();}
}
