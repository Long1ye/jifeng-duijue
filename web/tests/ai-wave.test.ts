import {afterEach,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});

it.each(['forest','howling'])('escorts the first %s wave without running ahead or going home at low health',async map=>{
  vi.stubGlobal('location',{search:map==='howling'?'?map=howling':''});
  const [{Match},{WORLD,BASES},{distance,direction}]=await Promise.all([import('../src/game/Match'),import('../src/game/config'),import('../src/game/geometry')]);
  const match=new Match({random:()=>.5});match.start();
  const hero=match.hero('red'),lane=direction(BASES.red,BASES.blue);
  const progress=(point:{x:number;y:number})=>(point.x-BASES.red.x)*lane.x+(point.y-BASES.red.y)*lane.y;
  for(let i=0;i<Math.ceil(18/WORLD.step);i++)match.step(WORLD.step);
  const front=match.entities.filter(e=>e.team==='red'&&e.hp>0&&(e.kind==='melee'||e.kind==='ranged')).sort((a,b)=>progress(b)-progress(a))[0];
  expect(front).toBeDefined();
  expect(distance(hero,front)).toBeLessThan(90);
  expect(progress(hero)).toBeLessThan(progress(front)+8);
  hero.hp=hero.maxHp*.15;
  for(let i=0;i<Math.ceil(.4/WORLD.step);i++)match.step(WORLD.step);
  expect(hero.destination).not.toEqual(BASES.red);
  // A wiped wave must not send the surviving bot back across the map.
  for(const unit of match.entities)if(unit.team==='red'&&(unit.kind==='melee'||unit.kind==='ranged'))unit.hp=0;
  const previous={x:hero.x,y:hero.y};
  for(let i=0;i<Math.ceil(.4/WORLD.step);i++)match.step(WORLD.step);
  expect(distance(hero,previous)).toBeLessThan(20);
});
