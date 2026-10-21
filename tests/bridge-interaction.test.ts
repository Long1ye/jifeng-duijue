import {afterEach,describe,expect,it,vi} from 'vitest';
import {BRIDGE,bridgePoint} from '../src/game/Bridge';
import {bridgeDetour,BRIDGE_FOOTPRINTS,clearBridgeFootprints,onBridgeFootprint} from '../src/game/BridgeInteraction';
import { LANDMARK_SPECS, PAINTED_TOWER_SCALE } from '../src/render-three/PaintedMapLandmarks';

describe('ice bridge interaction footprints',()=>{
  it('blocks the visible front steps of every painted tower',()=>{
    for(const site of BRIDGE_FOOTPRINTS.filter(site=>/tower|inner|outer/.test(site.id))){
      const spec=LANDMARK_SPECS.tower;
      for(const [px,py] of spec.baseline){
        if(px<16||px>328)continue;
        const point={x:site.x+(px-spec.anchor[0])*spec.scale*PAINTED_TOWER_SCALE,
          y:site.y+(py-spec.anchor[1])*spec.scale*PAINTED_TOWER_SCALE*Math.SQRT2};
        expect(onBridgeFootprint(point,11),`${site.id} step ${px},${py}`).toBe(true);
      }
    }
  });
  it('keeps a mobile foot outside every visible stone foundation',()=>{
    for(const site of BRIDGE_FOOTPRINTS){
      const clear=clearBridgeFootprints({x:site.x,y:site.y},7,1);
      expect(onBridgeFootprint(clear,7),site.id).toBe(false);
    }
  });

  it('routes a straight command around the central crystal plinth',()=>{
    const start=bridgePoint(BRIDGE.blue.inhibitor[0]-45);
    const target=bridgePoint(BRIDGE.blue.inhibitor[0]+45);
    const waypoint=bridgeDetour(start,target,7,1);
    expect(waypoint).not.toEqual(target);
    expect(onBridgeFootprint(waypoint,7)).toBe(false);
  });
});

afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
it.each(['hero','melee'] as const)('lets a %s attack a tower while remaining outside its visible foundation',async kind=>{
  vi.stubGlobal('location',{search:'?map=howling'});vi.resetModules();
  const [{Match},{onBridgeFootprint:inside}]=await Promise.all([
    import('../src/game/Match'),import('../src/game/BridgeInteraction'),
  ]);
  const match=new Match({ai:false,waves:false});match.start();
  const tower=match.tower('red');tower.damage=0;
  const start={x:tower.x,y:tower.y+100};
  const actor=kind==='hero'?match.hero('blue'):match.spawnMinion('blue','melee',start);
  Object.assign(actor,start);
  if(kind==='hero')match.orderAttack('blue',tower.id);
  for(let i=0;i<360;i++){
    match.step(1/60);
    expect(inside(actor,actor.radius)).toBe(false);
  }
  expect(actor.attacksReleased).toBeGreaterThan(0);
  expect(tower.hp).toBeLessThan(tower.maxHp);
});
it('lets a hero and minion travel past their own bridge foundations',async()=>{
  vi.stubGlobal('location',{search:'?map=howling'});vi.resetModules();
  const [{Match},{bridgePoint:point,BRIDGE:bridge},{onBridgeFootprint:inside}]=await Promise.all([
    import('../src/game/Match'),import('../src/game/Bridge'),import('../src/game/BridgeInteraction'),
  ]);
  const match=new Match({ai:false,waves:false});match.start();
  match.orderMove('blue',point(-90));
  const minion=match.spawnMinion('blue','melee',point(-550));
  for(let i=0;i<5000;i++){
    match.step(1/60);
    if(i%30===0){
      expect(inside(match.hero('blue'),match.hero('blue').radius)).toBe(false);
      expect(inside(minion,minion.radius)).toBe(false);
    }
  }
  const passed=(unit:{x:number;y:number})=>unit.x>point(bridge.blue.outerTower[0]).x;
  expect(passed(match.hero('blue'))).toBe(true);
  expect(passed(minion)).toBe(true);
});

it('records a visual impact direction without moving the victim in simulation',async()=>{
  vi.stubGlobal('location',{search:'?map=howling'});vi.resetModules();
  const [{Match},{bridgePoint:point}]=await Promise.all([
    import('../src/game/Match'),import('../src/game/Bridge'),
  ]);
  const match=new Match({ai:false,waves:false});match.start();
  const source=match.hero('blue');
  const victim=match.spawnMinion('red','melee',point(-400));
  const before={x:victim.x,y:victim.y};
  match.damage(source,victim,5);
  expect(victim.hitFrom).toEqual({x:source.x,y:source.y});
  expect({x:victim.x,y:victim.y}).toEqual(before);
});
