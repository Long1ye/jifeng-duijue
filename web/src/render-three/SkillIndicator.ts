import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, ShapeUtils, Vector2, type InterleavedBufferAttribute } from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { SKILL_RANGE_COLOR, type SkillPreview } from '../presentation/SkillPreview';
import type { Point } from '../game/types';
import { toThree } from './Coordinates';

/** Screen-width outlines stay legible at all zoom levels and above painted terrain. */
export class SkillIndicator {
  readonly group = new Group();
  private readonly outline = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial({color:0x86f3ed,linewidth:2.5,transparent:true,opacity:.95,depthTest:false,depthWrite:false,toneMapped:false}));
  private readonly range = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial({color:0x86f3ed,linewidth:1.5,transparent:true,opacity:.6,depthTest:false,depthWrite:false,toneMapped:false}));
  private readonly fill = new Mesh(new BufferGeometry(), new MeshBasicMaterial({color:0x5ce5e1,side:DoubleSide,transparent:true,opacity:.12,depthTest:false,depthWrite:false,toneMapped:false,fog:false}));
  constructor() {
    this.range.geometry.setPositions(new Float32Array(1536));
    this.outline.geometry.setPositions(new Float32Array(1536));
    this.fill.geometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(3072),3));
    this.group.add(this.range,this.fill,this.outline);
    this.range.renderOrder=900; this.fill.renderOrder=901; this.outline.renderOrder=902;
    this.outline.frustumCulled=this.range.frustumCulled=this.fill.frustumCulled=false;
    this.group.visible=false;
  }
  update(preview: SkillPreview | null, width: number, height: number): void {
    this.group.visible=!!preview; if(!preview)return;
    const color=preview.valid?0x86f3ed:0xed947f;
    this.outline.material.color.setHex(color); this.range.material.color.setHex(SKILL_RANGE_COLOR); this.fill.material.color.setHex(color);
    this.outline.material.resolution.set(width,height);this.range.material.resolution.set(width,height);
    const segments=(paths:Point[][]) => paths.flatMap(path=>path.slice(1).flatMap((p,i)=>{
      const a=toThree(path[i],3),b=toThree(p,3);return [a.x,a.y,a.z,b.x,b.y,b.z];
    }));
    const updateLines=(line:LineSegments2,values:number[])=>{
      const attribute=line.geometry.getAttribute('instanceStart') as InterleavedBufferAttribute;
      attribute.data.array.set(values);attribute.data.needsUpdate=true;line.geometry.instanceCount=values.length/6;
    };
    updateLines(this.range,segments([preview.range]));
    this.outline.visible=preview.paths.length>0;
    if(this.outline.visible)updateLines(this.outline,segments(preview.paths));
    const triangles=preview.fills.flatMap(path=>ShapeUtils.triangulateShape(path.map(p=>new Vector2(p.x,p.y)),[]).flatMap(face=>face.flatMap(index=>{
      const v=path[index];
      const point=toThree(v,2.8);return [point.x,point.y,point.z];
    })));
    const attribute=this.fill.geometry.getAttribute('position');attribute.array.set(triangles);attribute.needsUpdate=true;
    this.fill.geometry.setDrawRange(0,triangles.length/3);
    this.fill.visible=triangles.length>0;
  }
}
