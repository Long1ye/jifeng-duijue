import {BRIDGE,onPlayableBridge} from '../game/Bridge';
import {unproject} from '../../assets/map-studies/howling-abyss-v1/geometry';
import {STONE_GRID,stoneCells,snowStoneTier} from './BridgeTiles';
import {edgeTile} from './BridgeEdge';
const cells=new Map(stoneCells().map(cell=>[`${cell.col},${cell.row}`,cell]));
/** Query the same replacement cells used by IceFloor; chipped cells stay bare. */
export function snowSurface(x:number,y:number):boolean {
 if(!onPlayableBridge({x,y}))return false;
 const [u,v]=unproject(BRIDGE,x,y);
 const cell=cells.get(`${Math.round(u/STONE_GRID.along)},${Math.round(v/STONE_GRID.across)}`);
 return !!cell&&edgeTile(cell.col,cell.row,cell.u)===undefined&&(snowStoneTier(cell)??-1)>=1;
}
