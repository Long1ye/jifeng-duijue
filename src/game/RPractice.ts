import {Match} from './Match';
export function createRPractice():Match {
 const m=new Match({ai:false,waves:false});
 Object.assign(m.hero('blue'),{x:480,y:350});
 Object.assign(m.hero('red'),{x:550,y:350,speed:0,damage:0,hp:2000,maxHp:2000});
 return m;
}
