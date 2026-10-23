import {describe,expect,it} from 'vitest';
import {Match} from '../src/game/Match';
import {ABILITIES} from '../src/game/config';
import {grantStorm,STORM} from '../src/game/YasuoStorm';
import {YASUO_Q_HIT_SECONDS} from '../src/game/YasuoQ';

function setup(){
 const m=new Match({ai:false,waves:false});m.start();
 Object.assign(m.hero('blue'),{x:400,y:350});
 Object.assign(m.hero('red'),{x:850,y:500,speed:0,damage:0});
 return m;
}
function advance(m:Match,seconds:number,dt:number){for(let i=0;i<Math.ceil(seconds/dt);i++)m.step(dt);}
function minion(m:Match,x:number,y:number){
 const v=m.spawnMinion('red','melee',{x,y});v.speed=0;v.damage=0;return v;
}

describe('Q damage lifetime',()=>{
 for(const dt of [1/60,1/120])for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI,3.7]){
  it(`Q3 expires before later minions enter its endpoint (${angle}, ${dt})`,()=>{
   const m=setup(),h=m.hero('blue'),dir={x:Math.cos(angle),y:Math.sin(angle)};
   const end={x:h.x+dir.x*STORM.range,y:h.y+dir.y*STORM.range};
   grantStorm(h,0);grantStorm(h,0);
   expect(m.cast('blue','q',end)).toBe(true);
   advance(m,STORM.releaseDelay+STORM.range/STORM.speed+.2,dt);
   const remaining=m.projectiles.filter(p=>p.sourceId===h.id);
   const v=minion(m,end.x,end.y);
   advance(m,2,dt);
   expect(v.hp).toBe(v.maxHp);
   expect(v.airborneUntil??0).toBe(0);
   expect(remaining).toHaveLength(0);
  });
 }
 it.each([0,1])('Q stage %s only hits at contact and ignores later arrivals',stacks=>{
  const m=setup(),h=m.hero('blue'),initial=minion(m,h.x+60,h.y);
  if(stacks)grantStorm(h,0);
  expect(m.cast('blue','q',initial)).toBe(true);
  advance(m,YASUO_Q_HIT_SECONDS+.02,1/120);
  expect(initial.hp).toBe(initial.maxHp-ABILITIES.q.damage);
  const late=minion(m,h.x+110,h.y);
  advance(m,2,1/120);
  const later=minion(m,h.x+30,h.y);
  advance(m,2,1/120);
  expect(initial.hp).toBe(initial.maxHp-ABILITIES.q.damage);
  for(const v of [late,later]){expect(v.hp).toBe(v.maxHp);expect(v.airborneUntil??0).toBe(0);}
  expect(h.qCast).toBeNull();expect(m.projectiles).toHaveLength(0);
 });
});
