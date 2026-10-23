import {it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {MinionAnimator} from '../src/render/MinionAnimation';

function marcher(){
 const m=new Match({ai:false,waves:false});m.start();
 Object.assign(m.hero('blue'),{x:100,y:100});Object.assign(m.hero('red'),{x:900,y:600});
 const a=m.spawnMinion('blue','melee',{x:400,y:350});
 a.formation={wave:99,slot:0,goal:{x:650,y:350}};
 return {m,a};
}

it.each([30,60,120])('marches at 44 units/sec at %i simulation steps per second',hz=>{
 const {m,a}=marcher();const start=a.x;
 for(let i=0;i<hz;i++)m.step(1/hz);
 expect(a.x-start).toBeCloseTo(44,1);
});

it('keeps combat approach at 28 and respects slows while marching',()=>{
 const {m,a}=marcher();const target=m.spawnMinion('red','melee',{x:500,y:350});target.speed=0;
 a.formation!.goal={x:500,y:350};
 m.step(.01);const start={x:a.x,y:a.y};m.step(.1);
 expect(Math.hypot(a.x-start.x,a.y-start.y)).toBeCloseTo(2.8,3);
 target.hp=0;a.slowUntil=m.time+2;const slowed={x:a.x,y:a.y};m.step(.1);
 expect(Math.hypot(a.x-slowed.x,a.y-slowed.y)).toBeCloseTo(3.08,3);
});

it('keeps the same walking cadence when switching from march to combat',()=>{
 const {a}=marcher(),anim=new MinionAnimator();anim.sample(a,0);
 a.x+=44*.12;const march=anim.sample(a,.12);
 expect(march.frame).toBe((a.id+1)%8);
 a.targetId=99;a.x+=28*.12;const combat=anim.sample(a,.24);
 expect(combat.frame).toBe((a.id+2)%8);
 expect(anim.sample(a,.24)).toEqual(combat);
 expect(anim.sample(a,.3).frame).toBe(0);
});
