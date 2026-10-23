import {bridgePoint,BRIDGE} from './Bridge';
import type {Team} from './types';

/** Side courts flank the Nexus, clear of the spawn point and the central exit. */
export const SANCTUARY_SHOPS=([
 {team:'blue',u:BRIDGE.blue.spawn[0]-2,v:-60},
 {team:'red',u:-BRIDGE.blue.spawn[0]+2,v:60},
] as const);
export const SANCTUARY_SHOP_RADIUS=90;
export function sanctuaryShopPoint(team:Team){
 const site=SANCTUARY_SHOPS.find(site=>site.team===team)!;
 return bridgePoint(site.u,site.v);
}
