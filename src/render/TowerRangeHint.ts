import type {Entity} from '../game/types';
import {basicAttackReach} from '../game/UnitMetrics';

/** Player-centre boundary includes their collision radius, just like tower targeting. */
export function towerRangeHint(tower:Entity,player:Entity,visible=true){
 if(!visible||tower.kind!=='tower'||tower.hp<=0||player.hp<=0||tower.team===player.team)return null;
 const radius=basicAttackReach(tower,player),distance=Math.hypot(player.x-tower.x,player.y-tower.y);
 const alpha=Math.max(0,Math.min(1,(radius+85-distance)/65));
 if(alpha<=0)return null;
 const danger=distance<=radius;
 return {radius,alpha:alpha*(danger?.85:.6),danger,color:danger?0xff655f:0xf3ad70};
}
