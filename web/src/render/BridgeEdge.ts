import {BRIDGE} from '../game/Bridge';
import {halfWidth} from '../../assets/map-studies/howling-abyss-v1/geometry';
export const EDGE_URLS=import.meta.glob('../../assets/map-modules/howling-edge-v3/stone-*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const edgeKey=(i:number)=>`bridge-edge-floor-${i}`;
/** Replacement cells in short damaged stretches, with long intact gaps. */
export function edgeTile(col:number,row:number,u:number):number|undefined {
 const lastRow=Math.floor((halfWidth(BRIDGE,u)+13)/26);
 if(Math.abs(row)!==lastRow||Math.abs(u)>680)return undefined;
 const phase=((col+(row<0?7:0))%19+19)%19;
 if(phase>4)return undefined;
 const cluster=Math.floor((col+57)/19);
 // Lightly chipped transitions -> fracture -> weakened neck -> old failed repair.
 const family=[0,4,8,12,0][phase];
 return family+((cluster+(row<0?2:0))%4);
}
