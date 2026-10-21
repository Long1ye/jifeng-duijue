import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {ABILITIES} from '../src/game/config';
import {grantStorm} from '../src/game/YasuoStorm';

function advance(m:Match,seconds:number){for(let i=0;i<Math.ceil(seconds*120);i++)m.step(1/120);}
function setup(ai=false){
 const m=new Match({ai,waves:false});m.start();
 Object.assign(m.hero('blue'),{x:480,y:350,hp:10000,maxHp:10000});
 Object.assign(m.hero('red'),{x:550,y:350,speed:0,damage:0,hp:10000,maxHp:10000});
 return m;
}
describe('damage and airborne source isolation',()=>{
 it('does not damage or launch idle units with AI and waves disabled',()=>{
  const m=setup();advance(m,30);
  expect(m.entities.every(e=>e.hp===e.maxHp&&(e.airborneUntil??0)===0)).toBe(true);
  expect(m.drainEvents().filter(e=>e.type==='hit')).toHaveLength(0);
 });
 it('normal Q damages only the forward corridor and never launches any unit',()=>{
  const m=setup(),h=m.hero('blue');
  const outside=[{x:440,y:350},{x:550,y:390},{x:660,y:350}].map(p=>{
   const v=m.spawnMinion('red','melee',p);v.speed=0;v.damage=0;return v;
  });
  const ally=m.spawnMinion('blue','melee',{x:590,y:350});ally.speed=0;ally.damage=0;
  m.cast('blue','q',m.hero('red'));advance(m,.8);
  expect(m.hero('red').hp).toBe(10000-ABILITIES.q.damage);
  for(const v of [...outside,ally])expect(v.hp).toBe(v.maxHp);
  expect(m.entities.every(e=>(e.airborneUntil??0)===0)).toBe(true);
  expect(m.drainEvents().filter(e=>e.type==='hit').map(e=>e.sourceId)).toEqual([h.id]);
 });
 it('Q3 leaves side, rear, distant and allied units untouched',()=>{
  const m=setup(),h=m.hero('blue');
  const outside=[{x:440,y:350},{x:550,y:395},{x:820,y:350}].map(p=>{
   const v=m.spawnMinion('red','melee',p);v.speed=0;v.damage=0;return v;
  });
  const ally=m.spawnMinion('blue','melee',{x:610,y:350});ally.speed=0;ally.damage=0;
  grantStorm(h,0);grantStorm(h,0);m.cast('blue','q',m.hero('red'));advance(m,1.6);
  for(const v of [...outside,ally]){expect(v.hp).toBe(v.maxHp);expect(v.airborneUntil??0).toBe(0);}
  expect(m.hero('red').hp).toBe(10000-ABILITIES.q.damage);
  expect(m.drainEvents().filter(e=>e.type==='hit').map(e=>[e.sourceId,e.impact])).toEqual([[h.id,'q3']]);
 });
 it('AI can damage and knock up a player who never submits an input',()=>{
  const m=setup(true),player=m.hero('blue'),enemy=m.hero('red');
  const impacts:string[]=[];let launched=false;
  for(let i=0;i<120*25;i++){
   m.step(1/120);launched ||= (player.airborneUntil??0)>m.time;
   for(const event of m.drainEvents())if(event.type==='hit'){
    expect(event.sourceId).toBe(enemy.id);expect(event.targetId).toBe(player.id);
    impacts.push(event.impact??'attack');
   }
  }
  expect(impacts).toContain('q');expect(impacts.some(k=>k==='eq3'||k==='q3')).toBe(true);
  expect(launched).toBe(true);
 });
});
