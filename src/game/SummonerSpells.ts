import type {Point,Team} from './types';

export type SummonerKey='d'|'f';
export const SUMMONERS={
 d:{name:'闪现',cooldown:300,range:140},
 f:{name:'点燃',cooldown:180,range:160,duration:5,ticks:5,damage:100},
} as const;
export interface SummonerEffect {
 kind:'flash'|'ignite';team:Team;startedAt:number;endsAt:number;
 from:Point;to:Point;sourceId:number;targetId?:number;ticks?:number;
}
