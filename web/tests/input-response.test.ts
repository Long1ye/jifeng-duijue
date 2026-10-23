import {it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {grantStorm} from '../src/game/YasuoStorm';
import {distance} from '../src/game/geometry';

function setup(){
 const m=new Match({ai:false,waves:false,random:()=>1});m.start();m.setHitStunEnabled(false);
 const h=m.hero('blue');Object.assign(h,{x:400,y:350});Object.assign(m.hero('red'),{x:900,y:500});
 return {m,h};
}
function advance(m:Match,t:number){for(let i=0;i<Math.round(t*120);i++)m.step(1/120);}
function dummy(m:Match,x:number,y=350){const u=m.spawnMinion('red','melee',{x,y});u.speed=u.damage=0;u.hp=u.maxHp=1000;return u;}

it('queues Q shortly before cooldown ends without paying or releasing early',()=>{
 const {m,h}=setup();h.abilities.q=.1;const target=dummy(m,450);
 expect(m.cast('blue','q',target)).toBe(true);expect(h.qCast).toBeNull();expect(h.abilities.q).toBe(.1);
 advance(m,.09);expect(h.qCast).toBeNull();advance(m,.03);expect(h.qCast).not.toBeNull();
 expect(m.drainEvents().filter(e=>e.type==='cast'&&e.ability==='q')).toHaveLength(1);
});

it('lets Q hit once, then resumes movement before the remaining animation ends',()=>{
 const {m,h}=setup(),target=dummy(m,450);m.cast('blue','q',target);m.orderMove('blue',{x:350,y:400});
 advance(m,.3);expect(h.x).toBe(400);expect(target.hp).toBe(1000);
 advance(m,.25);expect(h.x).toBeLessThan(400);expect(target.hp).toBeLessThan(1000);
 advance(m,.5);expect(m.drainEvents().filter(e=>e.type==='hit'&&e.impact==='q')).toHaveLength(1);
});

it.each(['w','q3'] as const)('moves after %s release without waiting for the complete animation',ability=>{
 const {m,h}=setup();if(ability==='q3'){grantStorm(h,0);grantStorm(h,0);}
 m.cast('blue',ability==='w'?'w':'q',{x:600,y:350});m.orderMove('blue',{x:350,y:400});
 advance(m,.3);expect(h.x).toBe(400);advance(m,.1);expect(h.x).toBeLessThan(400);
 expect(ability==='w'?m.windWalls.length:m.projectiles.filter(p=>p.kind==='q').length).toBe(1);
});

it('buffers the next E by target ID and preserves a later right click as the exit order',()=>{
 const {m,h}=setup(),first=dummy(m,440),next=dummy(m,520,365);
 m.cast('blue','e',first);advance(m,.42);
 expect(m.cast('blue','e',next)).toBe(true);expect(m.bufferedOrder('blue')).toMatchObject({kind:'cast',targetId:next.id});
 m.orderMove('blue',{x:350,y:450});next.y+=15;
 advance(m,.14);expect(h.eCast?.targetId).toBe(next.id);
 expect(m.drainEvents().filter(e=>e.type==='cast'&&e.ability==='e')).toHaveLength(2);
 advance(m,.8);expect(h.destination).toEqual({x:350,y:450});expect(m.bufferedOrder('blue')).toBeUndefined();
});

it('keeps EQ damage and unlocks its movement recovery',()=>{
 const {m,h}=setup(),target=dummy(m,440);m.cast('blue','e',target);const end={...h.eCast!.end};
 m.cast('blue','q',target);m.orderMove('blue',{x:350,y:450});advance(m,.7);
 expect(distance(h,end)).toBeGreaterThan(3);
 expect(m.drainEvents().filter(e=>e.type==='hit'&&e.impact==='eq')).toHaveLength(1);
});

it('revalidates a buffered E target without spending cooldown when the target dies',()=>{
 const {m,h}=setup(),first=dummy(m,440),next=dummy(m,520);m.cast('blue','e',first);advance(m,.42);
 m.cast('blue','e',next);const cooldown=h.abilities.e;next.hp=0;advance(m,.3);
 expect(h.abilities.e).toBe(cooldown);expect(m.bufferedOrder('blue')).toBeUndefined();
});

it('lets stop cancel a queued combo and its navigation follow-up',()=>{
 const {m,h}=setup(),first=dummy(m,440),next=dummy(m,520);m.cast('blue','e',first);advance(m,.42);
 m.cast('blue','e',next);m.orderMove('blue',{x:350,y:450});m.stop('blue');advance(m,1);
 expect(m.bufferedOrder('blue')).toBeUndefined();expect(h.destination).toBeNull();
 expect(m.drainEvents().filter(e=>e.type==='cast'&&e.ability==='e')).toHaveLength(1);
});

it('keeps a queued skill when an invalid R or E is pressed',()=>{
 const {m}=setup(),target=dummy(m,450);m.cast('blue','q',target);advance(m,.32);
 expect(m.cast('blue','w',target)).toBe(true);
 expect(m.cast('blue','r',target)).toBe(false);
 expect(m.cast('blue','e',{x:700,y:200})).toBe(false);
 expect(m.bufferedOrder('blue')).toMatchObject({kind:'cast',ability:'w'});
 advance(m,.3);expect(m.windWalls).toHaveLength(1);
});
