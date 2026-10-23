import {Match} from './Match';
import {bridgePoint} from './Bridge';

/** Opt-in visual QA: ?review=nailong on the ordinary Three match route. */
export function createNailongPractice(){
 const match=new Match({ai:false,waves:false,league:true,enemyChampion:'nailong'});
 const point=bridgePoint(-10,0),player=match.hero('blue'),enemy=match.hero('red');
 Object.assign(player,point,{hp:100000,maxHp:100000});
 Object.assign(enemy,{x:point.x+75,y:point.y+20});
 match.start();match.orderAttack('red',player.id);
 return match;
}
