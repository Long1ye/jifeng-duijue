import {BRIDGE,bridgePoint} from '../game/Bridge';
import {halfWidth} from '../../assets/map-studies/howling-abyss-v1/geometry';
import {edgeTile} from './BridgeEdge';
export const STONE_URLS=import.meta.glob('../../assets/map-modules/howling-stones-v2/stone-*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const stoneKey=(index:number)=>`bridge-stone-${index.toString().padStart(2,'0')}`;
export const SNOW_STONE_URLS=import.meta.glob('../../assets/map-modules/howling-snowstone-v2/snow-*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const snowStoneKey=(index:number)=>`bridge-snow-stone-${index}`;
export const SNOW_STONE_POOLS=[[0,3],[1,4,5],[2,6,7]] as const;
export const SNOW_STONE_COUNT=8;

export const STONE_GRID={along:13,across:26,outerTowerU:195} as const;
export interface StoneCell {col:number;row:number;u:number;v:number;tile:number;turn:number;zone:'lane'|'approach'}
const hash=(a:number,b:number)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
export function stoneCells():StoneCell[]{
 const result:StoneCell[]=[],chosen=new Map<string,number>();
 for(let col=-56;col<=56;col++)for(let row=-7;row<=7;row++){
  const u=col*STONE_GRID.along,v=row*STONE_GRID.across;
  if(Math.abs(v)>halfWidth(BRIDGE,u)+STONE_GRID.across/2)continue;
  const lane=Math.abs(u)<STONE_GRID.outerTowerU;
  const n=hash(col,row),edge=Math.abs(v)>halfWidth(BRIDGE,u)-STONE_GRID.across;
  const pool=edge?[0,2,3,7,8]:Math.abs(row)<=1?[4,5,6,0,1]:[0,1,2,3,4,5,6,7,8];
  let tile=pool[Math.floor(n*pool.length)],turn=0;
  // Avoid identical adjacent ordinary stones without random bright/dark tinting.
  for(let k=0;k<pool.length;k++){
   const candidate=pool[(Math.floor(n*pool.length)+k)%pool.length];
   if(candidate!==chosen.get(`${col-1},${row}`)&&candidate!==chosen.get(`${col},${row-1}`)){tile=candidate;break;}
  }
  chosen.set(`${col},${row}`,tile);
  result.push({col,row,u,v,tile,turn,zone:lane?'lane':'approach'});
 }
 return result;
}

/** Replace stone cells with snow-bearing stones; do not stack white decals. */
export function snowStoneTier(cell:StoneCell):number|undefined{
 const abs=Math.abs(cell.u);
 if(abs<118)return undefined;
 const edgeDistance=halfWidth(BRIDGE,cell.u)-Math.abs(cell.v);
 const drift=(hash(Math.floor(cell.col/5),Math.sign(cell.v)*11)-.5)*15;
 const distance=edgeDistance+drift;
 const variation=hash(cell.col+31,cell.row-9);
 if(distance<(abs>410?44:24))return abs>410?(variation>.42?2:1):variation>.6?2:1;
 if(distance<(abs>410?79:52))return abs>410?(variation>.45?1:0):variation>.66?1:0;
 if(abs>410&&distance<105&&hash(cell.col,cell.row)>.28)return 0;
 return undefined;
}

/** More visual variety within each snow tier, without changing where snow appears. */
export function snowStoneVariant(cell:StoneCell):number|undefined{
 const tier=snowStoneTier(cell);
 if(tier===undefined)return undefined;
 const pool=SNOW_STONE_POOLS[tier];
 return pool[Math.floor(hash(cell.col+73,cell.row-41)*pool.length)];
}

/** Individual cells replace the base pavement; never stamp a large decoration over it. */
export function drawStoneCells(ctx:CanvasRenderingContext2D,images:HTMLImageElement[],edgeImages?:HTMLImageElement[],snowImages?:HTMLImageElement[]){
 const a=BRIDGE.projection.along,b=BRIDGE.projection.across;
 for(const cell of stoneCells()){
  const p=bridgePoint(cell.u,cell.v);
  ctx.save();
  ctx.transform(a[0]*STONE_GRID.along,a[1]*STONE_GRID.along,b[0]*STONE_GRID.across,b[1]*STONE_GRID.across,p.x,p.y);
  const damaged=edgeImages?edgeTile(cell.col,cell.row,cell.u):undefined;
  const snowy=snowImages?snowStoneVariant(cell):undefined;
  const turn=damaged!==undefined&&cell.row<0?Math.PI:snowy!==undefined?Math.floor(hash(cell.col+59,cell.row+23)*4)*Math.PI/2:cell.turn*Math.PI/2;
  ctx.rotate(turn);
  // Tiny overlap prevents transparent raster seams between adjacent projected cells.
  // Exactly one texture per cell: never render ordinary stone under the damage.
  ctx.drawImage(damaged!==undefined?edgeImages![damaged]:snowy!==undefined?snowImages![snowy]:images[cell.tile],-.503,-.503,1.006,1.006);
  ctx.restore();
 }
}
