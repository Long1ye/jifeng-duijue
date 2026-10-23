import {it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {basicAttackReach} from '../src/game/UnitMetrics';

function setup(){
 const m=new Match({ai:false,waves:false});m.start();const h=m.hero('blue');Object.assign(h,{x:400,y:350});
 Object.assign(m.hero('red'),{x:900,y:500,speed:0,damage:0});
 const t=m.spawnMinion('red','melee',{x:475,y:350});t.speed=t.damage=0;t.hp=t.maxHp=1000;
 return {m,h,t};
}
function advance(m:Match){for(let i=0;i<30;i++)m.step(1/120);}
it('can attack a minion 75 units away without walking closer',()=>{
 const {m,h,t}=setup();expect(basicAttackReach(h,t)).toBe(75);
 m.orderAttack('blue',t.id);advance(m);expect(h.x).toBe(400);expect(h.attacksReleased).toBe(1);expect(t.hp).toBeLessThan(1000);
});
it('can attack an enemy hero 80 units away',()=>{
 const {m,h,t}=setup();t.hp=0;const enemy=m.hero('red');Object.assign(enemy,{x:480,y:350});
 expect(basicAttackReach(h,enemy)).toBe(80);m.orderAttack('blue',enemy.id);advance(m);expect(h.x).toBe(400);expect(enemy.hp).toBeLessThan(enemy.maxHp);
});
it('still approaches a target outside the starting range',()=>{
 const {m,h,t}=setup();t.x=480;m.orderAttack('blue',t.id);m.step(.01);
 expect(h.x).toBeGreaterThan(400);expect(h.windup).toBe(0);expect(h.attacksReleased).toBe(0);
});
it.each([7,9])('applies bounded release tolerance when a target steps %i units away',offset=>{
 const {m,h,t}=setup();m.orderAttack('blue',t.id);m.step(.01);expect(h.windup).toBeGreaterThan(0);
 t.x=400+75+offset;m.step(.01);
 if(offset===7){advance(m);expect(h.attacksReleased).toBe(1);expect(t.hp).toBeLessThan(1000);}
 else{expect(h.windup).toBe(0);expect(h.attacksReleased).toBe(0);expect(t.hp).toBe(1000);}
});
