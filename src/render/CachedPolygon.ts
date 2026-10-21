import Phaser from 'phaser';
import type {Point} from '../game/types';

/** Same Earcut triangles as Graphics.fillPoints, computed once instead of each render. */
export class CachedPolygon {
  private triangles:number[];
  constructor(points:readonly Point[]){
    const coordinates=points.flatMap(p=>[p.x,p.y]);
    // Graphics.fillPoints(points, true) repeats the first point before Earcut.
    coordinates.push(points[0].x,points[0].y);
    this.triangles=Phaser.Geom.Polygon.Earcut(coordinates).flatMap(i=>[coordinates[i*2],coordinates[i*2+1]]);
  }
  fill(graphics:Phaser.GameObjects.Graphics,x=0,y=0){
    const t=this.triangles;
    for(let i=0;i<t.length;i+=6)graphics.fillTriangle(x+t[i],y+t[i+1],x+t[i+2],y+t[i+3],x+t[i+4],y+t[i+5]);
    return graphics;
  }
}
