import {afterEach,expect,it,vi} from 'vitest';
import {BRIDGE,BRIDGE_SLOTS,BRIDGE_WORLD,BRIDGE_OUTLINE,bridgePoint,bridgeTowerRange,clampBridge,onPlayableBridge} from '../src/game/Bridge';
it('preserves the bridge width and fits the lengthened world',()=>{
 expect(BRIDGE.bridge.halfWidth).toBe(112);
 expect(BRIDGE.bridge.baseHalfWidth).toBe(160);
 expect(BRIDGE.bridge.halfLength).toBe(720);
 for(const p of BRIDGE_OUTLINE){expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(BRIDGE_WORLD.width);expect(p.y).toBeGreaterThan(0);expect(p.y+70).toBeLessThan(BRIDGE_WORLD.height);}
});
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
it('clamps abyss clicks into the bridge and keeps a body inset',()=>{
 for(let x=-100;x<1200;x+=37)for(let y=-100;y<800;y+=37){
  const p=clampBridge({x,y},7);
  expect(onPlayableBridge(p,7)).toBe(true);
  for(const d of [{x:7,y:0},{x:-7,y:0},{x:0,y:7},{x:0,y:-7}])expect(onPlayableBridge({x:p.x+d.x,y:p.y+d.y})).toBe(true);
 }
});
it('runs the bridge match with waves, towers and abyss movement limits',async()=>{
 vi.stubGlobal('location',{search:'?map=howling'});vi.resetModules();
 const {Match}=await import('../src/game/Match');
 const m=new Match({ai:false});m.start();
 expect(m.entities.every(e=>onPlayableBridge(e,e.radius))).toBe(true);
 m.orderMove('blue',{x:0,y:0});
 for(let i=0;i<900;i++){m.step(1/60);expect(m.entities.filter(e=>e.hp>0).every(e=>onPlayableBridge(e))).toBe(true);}
 expect(m.wave).toBeGreaterThan(0);
 expect(m.hero('blue').x).not.toBe(0);
});
it('starts spread minion lanes ahead of the Nexus without occupying its footprint',async()=>{
 vi.stubGlobal('location',{search:'?map=howling'});vi.resetModules();
 const [{Match},{BASES,MINION_EXITS}]=await Promise.all([
  import('../src/game/Match'),import('../src/game/config'),
 ]);
 const m=new Match({ai:false});m.start();
 for(let i=0;i<121;i++)m.step(1/60);
 for(const team of ['blue','red'] as const){
  const units=m.entities.filter(e=>e.team===team&&e.formation).sort((a,b)=>a.formation!.slot-b.formation!.slot);
  expect(units).toHaveLength(6);
  const exit=MINION_EXITS[team];
  const other=BASES[team==='blue'?'red':'blue'];
  const dx=other.x-BASES[team].x,dy=other.y-BASES[team].y,len=Math.hypot(dx,dy);
  const ahead=(p:{x:number;y:number})=>((p.x-exit.x)*dx+(p.y-exit.y)*dy)/len;
  expect(units.every(unit=>ahead(unit)>20)).toBe(true);
  expect(ahead(units[0])-ahead(units[3])).toBeCloseTo(58,0);
  expect(units.every(unit=>onPlayableBridge(unit))).toBe(true);
 }
});
it('keeps every E dash frame on the bridge',async()=>{
 vi.stubGlobal('location',{search:'?map=howling'});vi.resetModules();
 const {Match}=await import('../src/game/Match');
 const m=new Match({ai:false,waves:false});m.start();
 Object.assign(m.hero('blue'),bridgePoint(0));
 const t=m.spawnMinion('red','melee',bridgePoint(12));t.speed=0;
 expect(m.cast('blue','e',t)).toBe(true);
 for(let i=0;i<50;i++){m.step(1/60);expect(onPlayableBridge(m.hero('blue'),7)).toBe(true);}
});
it('covers the bridge width and leaves over 40 units between inner and outer attack circles',()=>{
 const a=bridgePoint(BRIDGE.blue.outerTower[0]),b=bridgePoint(BRIDGE.blue.innerTower[0]);
 const range=bridgeTowerRange(BRIDGE.blue.outerTower[0]);
 for(const side of [-1,1]){
  const edge=bridgePoint(BRIDGE.blue.outerTower[0],side*BRIDGE.bridge.halfWidth);
  expect(Math.hypot(edge.x-a.x,edge.y-a.y)).toBeLessThan(range);
 }
 expect(Math.hypot(a.x-b.x,a.y-b.y)-range-bridgeTowerRange(BRIDGE.blue.innerTower[0])).toBeGreaterThan(40);
});
it('reserves all fourteen mirrored building sites inside the bridge',()=>{
 expect(BRIDGE_SLOTS).toHaveLength(14);
 for(const s of BRIDGE_SLOTS){
  expect(onPlayableBridge(bridgePoint(s.u,s.v))).toBe(true);
  for(const du of [-s.w/2,s.w/2])for(const dv of [-s.h/2,s.h/2])expect(onPlayableBridge(bridgePoint(s.u+du,s.v+dv))).toBe(true);
 }
});
