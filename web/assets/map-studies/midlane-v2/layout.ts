import initial from './map.json';
export type MapConfig = typeof initial;
export function segmentDistance(x:number,y:number,a:number[],b:number[]) {
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
}
export function terrainAt(c:MapConfig,x:number,y:number):'lane'|'river'|'shoulder'|'border' {
  const lane=segmentDistance(x,y,c.lane.start,c.lane.end);
  if(lane<c.lane.width/2)return 'lane';
  if(segmentDistance(x,y,c.river.start,c.river.end)<c.river.width/2)return 'river';
  return lane<c.lane.width/2+c.lane.shoulder?'shoulder':'border';
}
export function walkable(c:MapConfig,x:number,y:number) {
  return x>=16&&y>=16&&x<c.width-16&&y<c.height-16&&terrainAt(c,x,y)!=='border'&&c.towers.every(t=>Math.hypot(x-t.x,y-t.y)>25);
}
// Meowa 64px dual-grid: NW=1, SW=2, NE=4, SE=8.
export const atlasCells=[[0,3],[3,3],[0,0],[3,2],[0,2],[1,2],[2,3],[3,1],[1,3],[0,1],[3,0],[2,0],[1,0],[2,2],[1,1],[2,1]];
export function tileKey(c:MapConfig,column:number,row:number) {
  const filled=(x:number,y:number)=>terrainAt(c,x*64,y*64)==='lane';
  return Number(filled(column,row))+2*Number(filled(column,row+1))+4*Number(filled(column+1,row))+8*Number(filled(column+1,row+1));
}
