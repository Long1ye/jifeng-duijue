import {afterEach,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});

it('keeps both merchant courts off the spawn and Nexus footprints, with matching purchase areas',async()=>{
 vi.stubGlobal('location',{search:'?map=howling'});vi.resetModules();
 const {Match}=await import('../src/game/Match');
 const {SANCTUARY_SHOP_RADIUS,sanctuaryShopPoint}=await import('../src/game/SanctuaryLayout');
 const {BASES,BALANCE}=await import('../src/game/config');
 const {bridgePoint,BRIDGE,onPlayableBridge}=await import('../src/game/Bridge');
 const {onBridgeFootprint}=await import('../src/game/BridgeInteraction');
 const {atShop}=await import('../src/game/Equipment');
 const m=new Match({league:true,ai:false,waves:false});m.start();
 for(const team of ['blue','red'] as const){
  const shop=sanctuaryShopPoint(team),spawn=BASES[team],hero=m.hero(team);
  const nexus=bridgePoint(team==='blue'?BRIDGE.blue.nexus[0]:-BRIDGE.blue.nexus[0]);
  expect(onPlayableBridge(shop,hero.radius)).toBe(true);
  expect(onBridgeFootprint(shop,hero.radius)).toBe(false);
  expect(Math.hypot(shop.x-nexus.x,shop.y-nexus.y)).toBeGreaterThan(200);
  const separation=Math.hypot(shop.x-spawn.x,shop.y-spawn.y);
  expect(separation).toBeGreaterThan(100);
  expect(separation).toBeLessThan(BALANCE.fountainRadius+SANCTUARY_SHOP_RADIUS);
  Object.assign(hero,spawn);expect(atShop(hero)).toBe(true);
  Object.assign(hero,shop);expect(atShop(hero)).toBe(true);expect(m.buyItem(team,1055)).toBe(true);
  expect(m.sellItem(team,0)).toBe(true);
  const exit=bridgePoint(team==='blue'?-590:590);m.orderMove(team,exit);
  for(let tick=0;tick<10*60;tick++)m.step(1/60);
  expect(Math.hypot(hero.x-exit.x,hero.y-exit.y)).toBeLessThan(15);
  expect(onBridgeFootprint(hero,hero.radius)).toBe(false);
  Object.assign(hero,sanctuaryShopPoint(team==='blue'?'red':'blue'));expect(atShop(hero)).toBe(false);
  Object.assign(hero,shop);hero.hp=0;expect(atShop(hero)).toBe(false);
 }
});
