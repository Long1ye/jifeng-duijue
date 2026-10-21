import {afterEach,expect,it,vi} from 'vitest';

afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});

it.each(['forest','howling'])('adapts normal %s waves to the actual lane and keeps the pace after upgrades',async map=>{
 vi.stubGlobal('location',{search:map==='howling'?'?map=howling':''});vi.resetModules();
 const {Match}=await import('../src/game/Match');
 const {MINION_PACING:pacing}=await import('../src/game/MinionPacing');
 const {minionStats}=await import('../src/game/LaneStats');
 expect(pacing.speed).toBeGreaterThanOrEqual(24);expect(pacing.speed).toBeLessThanOrEqual(44);
 expect(pacing.waveInterval).toBe(map==='howling'?36:24);
 expect(pacing.marchSeconds).toBeCloseTo(map==='howling'?55:12.68,0);
 for(const time of [0,600,900,1200,1500,10000])for(const kind of ['melee','ranged'] as const)
  expect(minionStats(kind,time).speed).toBe(pacing.speed);

 for(const hz of [30,60,120]){
  const walking=new Match({league:true,ai:false,waves:false});walking.start();
  Object.assign(walking.hero('blue'),{x:100,y:100});Object.assign(walking.hero('red'),{x:900,y:600});
  const unit=walking.spawnMinion('blue','melee',map==='howling'?{x:3100,y:1700}:{x:400,y:350});
  const start={x:unit.x,y:unit.y};unit.formation={wave:99,slot:0,goal:{x:start.x+100,y:start.y}};
  for(let i=0;i<hz;i++)walking.step(1/hz);
  expect(Math.hypot(unit.x-start.x,unit.y-start.y)).toBeCloseTo(pacing.speed,1);
 }

 const m=new Match({league:true,ai:false});m.start();
 // Isolate the natural first clash from champion attacks and tower victory conditions.
 for(const e of m.entities){e.damage=0;e.hp=e.maxHp=1e9;if(e.kind==='hero')Object.assign(e,{x:0,y:0});}
 let clash:number|undefined;const waves:number[]=[];let previousWave=0;
 for(let i=0;i<100*60;i++){
  m.step(1/60);
  if(m.wave!==previousWave){waves.push(m.time);previousWave=m.wave;}
  if(clash===undefined&&m.entities.some(e=>e.formation&&e.attacksReleased>0))clash=m.time;
 }
 expect(clash).toBeDefined();
 expect(clash!).toBeGreaterThan(map==='howling'?40:4);
 expect(clash!).toBeLessThan(map==='howling'?65:20);
 expect(waves[0]).toBeCloseTo(2,1);expect(waves.length).toBeGreaterThanOrEqual(3);
 for(let i=1;i<waves.length;i++)expect(waves[i]-waves[i-1]).toBeCloseTo(pacing.waveInterval,1);
 m.togglePause();m.step(100);expect(m.wave).toBe(previousWave);
 const fresh=new Match({league:true,ai:false});fresh.start();fresh.step(2);expect(fresh.wave).toBe(1);
});
