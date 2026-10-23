import { describe, it, expect } from 'vitest';
import { Match } from '../src/game/Match';
import { wallHit, circleHit,wallEnds,WIND_WALL } from '../src/game/WindWall';
function setup() {
  const m=new Match({ai:false,waves:false}); m.start();
  Object.assign(m.hero('blue'),{x:300,y:300}); Object.assign(m.hero('red'),{x:400,y:300});
  m.cast('blue','w',{x:500,y:300}); return m;
}
describe('in-game wind wall',()=>{
  it('spans 128 units and blocks the enlarged ends without extending beyond them',()=>{
    const w={id:1,team:'blue' as const,x:0,y:0,angle:0,startsAt:0};
    const [a,b]=wallEnds(w);expect(Math.hypot(a.x-b.x,a.y-b.y)).toBe(128);
    expect(WIND_WALL.height).toBe(64);
    expect(wallHit(w,{x:-100,y:58},{x:100,y:58},2)).not.toBeNull();
    expect(wallHit(w,{x:-100,y:68},{x:100,y:68},2)).toBeNull();
    expect(wallHit(w,{x:5,y:-90},{x:5,y:90},2)).not.toBeNull();
    expect(wallHit(w,{x:7,y:-90},{x:7,y:90},2)).toBeNull();
  });
  it('intercepts a tornado near the new edge but lets one beyond the edge pass',()=>{
    for(const offset of [58,70]){
      const m=setup();m.step(.4);
      m.projectiles.push({id:900,sourceId:m.hero('red').id,team:'red',kind:'q',empowered:true,hitIds:[],x:360,y:300+offset,targetId:null,damage:85,speed:250,vx:-1,vy:0,remaining:290,radius:3});
      m.step(.3);expect(m.projectiles).toHaveLength(offset===58?0:1);
    }
  });
  it('locks cast, places once, pauses and expires on simulation time',()=>{
    const m=setup(), h=m.hero('blue'); m.orderMove('blue',{x:500,y:400}); m.step(.2);
    expect(h.x).toBe(300); expect(m.cast('blue','q',{x:500,y:300})).toBe(true);
    expect(h.qCast).toBeNull();expect(m.bufferedOrder('blue')).toMatchObject({kind:'cast',ability:'q'});
    const wall={...m.windWalls[0]}; m.togglePause(); m.step(5); expect(m.time).toBe(.2);
    m.togglePause(); m.step(.7); expect(m.windWalls[0]).toEqual(wall);
    m.step(4); expect(m.windWalls).toHaveLength(0);
  });
  for(const kind of ['q','attack'] as const) it(`blocks hostile ${kind==='q'?'Q3':'ranged attack'} across a swept path`,()=>{
    const m=setup(); m.step(.4); const hp=m.hero('blue').hp;
    m.projectiles.push({id:900,sourceId:m.hero('red').id,team:'red',kind,...(kind==='q'?{empowered:true,hitIds:[]}:{}),x:360,y:300,targetId:m.hero('blue').id,damage:100,speed:200,vx:-1,vy:0,remaining:200,radius:2});
    m.step(.3); expect(m.projectiles).toHaveLength(0); expect(m.hero('blue').hp).toBe(hp);
  });
  it('lets actual Q1 and Q2 thrusts hit through an active enemy wall',()=>{
    const m=setup(),attacker=m.hero('red'),victim=m.hero('blue');m.step(.4);
    expect(m.cast('red','q',victim)).toBe(true);m.step(.8);
    expect(attacker.qStacks).toBe(1);m.step(2);
    expect(m.cast('red','q',victim)).toBe(true);m.step(.5);
    expect(m.windWalls).toHaveLength(1);expect(attacker.qStacks).toBe(2);
    expect(m.drainEvents().filter(e=>e.type==='hit'&&e.sourceId===attacker.id&&e.targetId===victim.id&&e.impact==='q')).toHaveLength(2);
  });
  it('does not intercept non-empowered legacy Q records',()=>{
    const m=setup(),victim=m.hero('blue');m.step(.4);const hp=victim.hp;
    m.projectiles.push({id:900,sourceId:m.hero('red').id,team:'red',kind:'q',x:360,y:300,targetId:null,damage:85,speed:200,vx:-1,vy:0,remaining:200,radius:2});
    m.step(.3);expect(victim.hp).toBe(hp-85);
  });
  it('lets allied projectiles pass',()=>{
    const m=setup(); m.step(.4);
    m.projectiles.push({id:900,sourceId:m.hero('blue').id,team:'blue',kind:'q',empowered:true,hitIds:[],x:300,y:300,targetId:null,damage:85,speed:250,vx:1,vy:0,remaining:290,radius:8});
    m.step(.2); expect(m.projectiles).toHaveLength(1);expect(m.projectiles[0].x).toBe(350);
  });
  it('does not block tower shots',()=>{
    const m=setup(); m.step(.4); const hp=m.hero('blue').hp;
    m.projectiles.push({id:900,sourceId:m.tower('red').id,team:'red',kind:'attack',x:360,y:300,targetId:m.hero('blue').id,damage:100,speed:200,vx:-1,vy:0,remaining:4,radius:2});
    m.step(.3); expect(m.hero('blue').hp).toBe(hp-100);
  });
  it('uses continuous angles and rejects paths beyond the wall ends',()=>{
    for(let angle=0;angle<Math.PI*2;angle+=.17){
      const w={id:1,team:'blue' as const,x:0,y:0,angle,startsAt:0};
      const p={x:Math.cos(angle)*80,y:Math.sin(angle)*80};
      expect(wallHit(w,p,{x:-p.x,y:-p.y},1)).not.toBeNull();
    }
    expect(wallHit({id:1,team:'blue',x:0,y:0,angle:0,startsAt:0},{x:-50,y:90},{x:50,y:90},1)).toBeNull();
    expect(circleHit({x:0,y:0},{x:100,y:0},{x:20,y:0},5)).toBeCloseTo(.15);
  });
});
