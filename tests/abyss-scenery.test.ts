import {describe,it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{}}));
import {abyssLayout,gateLayout} from '../src/render/AbyssScenery';
import {BRIDGE} from '../src/game/Bridge';
import {halfWidth} from '../assets/map-studies/howling-abyss-v1/geometry';

describe('layered abyss scenery',()=>{
 it('places both bridgehead gates beyond playable ends, below actors',()=>{
  const parts=gateLayout();
  expect(parts).toEqual(gateLayout());
  expect(parts).toHaveLength(2);
  expect(parts.every(p=>Math.abs(p.u)>720&&p.depth<1)).toBe(true);
  expect(parts.map(p=>Math.sign(p.u))).toEqual([-1,1]);
 });
 it('keeps all scenery below the bridge and deterministic',()=>{
  const parts=abyssLayout();
  expect(parts).toEqual(abyssLayout());
  expect(parts).toHaveLength(35);
  expect(parts.every(p=>p.depth<.5&&p.alpha<.75)).toBe(true);
 });
 it('separates distant cliffs from playable ground',()=>{
  const cliffs=abyssLayout().filter(p=>p.variant<2);
  expect(cliffs.some(p=>p.v<0)).toBe(true);
  expect(cliffs.some(p=>p.v>0)).toBe(true);
  expect(cliffs.every(p=>Math.abs(p.v)>halfWidth(BRIDGE,p.u)+200&&p.parallax>0)).toBe(true);
 });
 it('anchors supports to the bridge and breaks the central arches',()=>{
  const supports=abyssLayout().filter(p=>p.variant>=2);
  expect(supports).toHaveLength(7);
  expect(supports.every(p=>p.parallax===0)).toBe(true);
  for(const p of supports)expect(p.variant).toBe(Math.abs(p.u)<=200?3:2);
 });
});
