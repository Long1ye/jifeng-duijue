import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {SUMMONERS} from '../src/game/SummonerSpells';
import {ABILITIES} from '../src/game/config';
function setup(){
 const m=new Match({ai:false,waves:false});m.start();
 Object.assign(m.hero('blue'),{x:400,y:350});Object.assign(m.hero('red'),{x:500,y:350,speed:0,damage:0});
 return {m,h:m.hero('blue'),t:m.hero('red')};
}
function advance(m:Match,t:number){for(let i=0;i<Math.ceil(t*120);i++)m.step(1/120);}
describe('summoner spell effects and gameplay',()=>{
 it('can ignite the current R victim without interrupting R or repeating either damage',()=>{
  const {m,h,t}=setup();t.hp=t.maxHp=2000;t.airborneUntil=2;
  expect(m.cast('blue','r',t)).toBe(true);const cast=h.rCast,position={x:h.x,y:h.y};advance(m,.2);
  expect(m.castSummoner('blue','f',{x:0,y:0})).toBe(true);
  expect(h.rCast).toBe(cast);expect({x:h.x,y:h.y}).toEqual(position);
  expect(m.summonerEffects.find(e=>e.kind==='ignite')?.targetId).toBe(t.id);
  expect(m.castSummoner('blue','f',t,t.id)).toBe(false);
  expect(m.castSummoner('blue','d',{x:600,y:350})).toBe(false);
  advance(m,5.2);expect(t.hp).toBe(2000-ABILITIES.r.damage-SUMMONERS.f.damage);
  const events=m.drainEvents();expect(events.filter(e=>e.type==='hit'&&e.impact==='r')).toHaveLength(1);
  expect(events.filter(e=>e.type==='hit'&&e.impact==='ignite')).toHaveLength(5);
 });
 it('keeps range and enemy validation for ignite during R',()=>{
  const {m,h,t}=setup();t.hp=t.maxHp=2000;t.airborneUntil=2;m.cast('blue','r',t);
  expect(m.castSummoner('blue','f',h,h.id)).toBe(false);
  t.x=h.x+SUMMONERS.f.range+t.radius+1;
  expect(m.castSummoner('blue','f',t,t.id)).toBe(false);expect(m.summonerCooldowns.blue.f).toBe(0);expect(h.rCast).not.toBeNull();
 });
 it('flashes toward the cursor within range, records both bursts, and starts cooldown',()=>{
  const {m,h}=setup();m.orderMove('blue',{x:400,y:500});
  expect(m.castSummoner('blue','d',{x:900,y:350})).toBe(true);
  expect(h.x).toBe(400+SUMMONERS.d.range);expect(h.destination).toBeNull();
  expect(m.summonerEffects[0].from).toEqual({x:400,y:350});expect(m.summonerEffects[0].to.x).toBe(h.x);
  expect(m.castSummoner('blue','d',{x:600,y:350})).toBe(false);
  expect(m.summonerCooldowns.blue.d).toBe(300);advance(m,.6);expect(m.summonerEffects).toHaveLength(0);
 });
 it('rejects blocked actions and invalid ignite targets without spending cooldown',()=>{
  const {m,h,t}=setup();expect(m.castSummoner('blue','f',h,h.id)).toBe(false);
  expect(m.castSummoner('blue','f',m.tower('red'),m.tower('red').id)).toBe(false);
  t.x=800;expect(m.castSummoner('blue','f',t,t.id)).toBe(false);t.x=500;
  h.airborneUntil=1;expect(m.castSummoner('blue','d',t)).toBe(false);
  expect(m.castSummoner('blue','f',t,t.id)).toBe(false);
  expect(m.summonerCooldowns.blue).toEqual({d:0,f:0});
 });
 it('applies five timed true-damage ticks only to the ignited target, even after it moves away',()=>{
  const {m,t}=setup(),other=m.spawnMinion('red','melee',{x:510,y:390});other.speed=other.damage=0;t.guardUntil=20;
  const hp=t.hp;expect(m.castSummoner('blue','f',t,t.id)).toBe(true);t.x=800;
  advance(m,.9);expect(t.hp).toBe(hp);advance(m,4.2);
  expect(t.hp).toBe(hp-SUMMONERS.f.damage);expect(other.hp).toBe(other.maxHp);
  expect(m.drainEvents().filter(e=>e.type==='hit'&&e.impact==='ignite')).toHaveLength(5);
  expect(m.summonerEffects).toHaveLength(0);expect(m.summonerCooldowns.blue.f).toBe(180);
 });
 it('freezes effects and damage during pause and clears burning after target death',()=>{
  const {m,h,t}=setup();m.castSummoner('blue','f',t,t.id);m.togglePause();advance(m,10);
  expect(m.time).toBe(0);expect(t.hp).toBe(t.maxHp);expect(m.summonerEffects).toHaveLength(1);
  m.togglePause();t.hp=1;advance(m,1.1);expect(t.hp).toBe(0);
  expect(m.summonerEffects).toHaveLength(0);expect(h.hp).toBe(h.maxHp);
 });
});
