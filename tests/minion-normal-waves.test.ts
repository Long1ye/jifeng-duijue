import {it,expect,vi,afterEach} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});

it('keeps normal Howling waves fighting and separated across successive reinforcements',async()=>{
 vi.stubGlobal('location',{search:'?map=howling'});vi.resetModules();
 const {Match}=await import('../src/game/Match');
 const {BASES}=await import('../src/game/config');
 const dx=BASES.red.x-BASES.blue.x,dy=BASES.red.y-BASES.blue.y,length=Math.hypot(dx,dy);
 const m=new Match({ai:false});m.start();
 const seen=new Map<number,(typeof m.entities)[number]>();
 let firstClash:number|null=null;
 for(let tick=0;tick<240*60;tick++){
  m.step(1/60);
  for(const unit of m.entities)if(unit.kind==='melee'||unit.kind==='ranged')seen.set(unit.id,unit);
  if(firstClash===null&&[...seen.values()].some(u=>u.attacksReleased>0))firstClash=m.time;
  if(tick%60===0)for(const u of m.entities.filter(e=>e.hp>0&&e.formation&&e.targetId!==null)){
   // A live fight must not orbit across the bridge while its lane goal runs away.
   const across=(-(u.x-3100)*dy+(u.y-1700)*dx)/length;
   // Wider friendly spacing permits a broader front, while the lane goal must stay nearby.
   expect(Math.abs(across)).toBeLessThan(130);
   expect(Math.hypot(u.x-u.formation!.goal.x,u.y-u.formation!.goal.y)).toBeLessThan(180);
  }
 }
 expect(m.phase).toBe('playing');expect(m.wave).toBeGreaterThanOrEqual(4);
 expect(firstClash).toBeGreaterThan(40);expect(firstClash).toBeLessThan(65);
 for(const team of ['blue','red'] as const)for(const kind of ['melee','ranged'] as const)
  expect([...seen.values()].some(u=>u.team===team&&u.kind===kind&&u.attacksReleased>0)).toBe(true);
 const live=m.entities.filter(u=>u.hp>0&&(u.kind==='melee'||u.kind==='ranged'));
 for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++)
  expect(Math.hypot(live[i].x-live[j].x,live[i].y-live[j].y)).toBeGreaterThan(14);
});
