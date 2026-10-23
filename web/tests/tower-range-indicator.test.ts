import {expect,it,vi} from 'vitest';
import {Match} from '../src/game/Match';
import {basicAttackReach} from '../src/game/UnitMetrics';
import {towerRangeHint} from '../src/render/TowerRangeHint';
import {TowerRangeIndicator} from '../src/render-three/TowerRangeIndicator';
import {ThreeCamera,WORLD_ORIGIN} from '../src/render-three/Coordinates';
import {RenderPositions} from '../src/render/RenderPositions';
import {LineSegments2} from 'three/addons/lines/LineSegments2.js';

it.each(['blue','red'] as const)('shows the enemy boundary for the %s player and updates when entering, retreating or losing vision',team=>{
 const match=new Match({league:true,ai:false,waves:false});match.start();
 const tower=match.tower(team==='blue'?'red':'blue'),hero=match.hero(team),radius=basicAttackReach(tower,hero);
 const view=new TowerRangeIndicator(),camera=new ThreeCamera();
 const frame={match,positions:new RenderPositions(),alpha:1,events:[],localTeam:team};
 try {
  Object.assign(hero,{x:tower.x+radius+50,y:tower.y});view.update(frame,camera);
  expect(view.group.visible).toBe(true);
  const line=view.group.children[0] as LineSegments2;
  const points=line.geometry.getAttribute('instanceStart');
  expect(points.getX(0)+WORLD_ORIGIN.x).toBeCloseTo(tower.x+radius,3);
  expect(points.getZ(0)+WORLD_ORIGIN.y).toBeCloseTo(tower.y,3);
  expect(line.material.color.getHex()).toBe(0xf3ad70);
  expect(towerRangeHint(tower,hero)!.danger).toBe(false);
  hero.x=tower.x+radius-.001;view.update(frame,camera);
  expect(line.material.color.getHex()).toBe(0xff655f);
  expect(towerRangeHint(tower,hero)!.danger).toBe(true);
  expect(towerRangeHint(match.tower(team),hero)).toBeNull();
  view.update(frame,camera,()=>false);expect(view.group.visible).toBe(false);
  hero.x=tower.x+radius+86;view.update(frame,camera);expect(view.group.visible).toBe(false);
  hero.x=tower.x;hero.hp=0;view.update(frame,camera);expect(view.group.visible).toBe(false);
  hero.hp=1;tower.hp=0;view.update(frame,camera);expect(view.group.visible).toBe(false);
  tower.hp=1;match.phase='ended';view.update(frame,camera);expect(view.group.visible).toBe(false);
  const geometryDispose=vi.spyOn(line.geometry,'dispose'),materialDispose=vi.spyOn(line.material,'dispose');
  view.dispose();expect(geometryDispose).toHaveBeenCalledOnce();expect(materialDispose).toHaveBeenCalledOnce();
 }finally{view.dispose();}
});
