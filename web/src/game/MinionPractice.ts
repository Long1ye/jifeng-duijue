import {Match} from './Match';
import {BASES,HOWLING_MAP} from './config';
import {bridgePoint} from './Bridge';
import {direction} from './geometry';

/** Real lane logic with an opposing hero behind the enemy E anchors. */
export function createMinionPractice(){
 const match=new Match({ai:false,waves:false});
 const center=HOWLING_MAP?bridgePoint(0):{x:500,y:350};
 const d=direction(BASES.blue,BASES.red),side={x:-d.y,y:d.x};
 Object.assign(match.hero('blue'),{x:center.x+side.x*80,y:center.y+side.y*80});
 Object.assign(match.hero('red'),{x:center.x+d.x*115+side.x*20,y:center.y+d.y*115+side.y*20,speed:0,damage:0,hp:2000,maxHp:2000});
 for(const team of ['blue','red'] as const){
  const sign=team==='blue'?1:-1;
  const front={x:center.x-d.x*sign*48,y:center.y-d.y*sign*48};
  match.spawnMinionLane(team,front);
 }
 return match;
}
