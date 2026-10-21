import {describe,it,expect} from 'vitest';
import {BRIDGE} from '../src/game/Bridge';
import {BRIDGE_SITE_ART,NEXUS_FOOT_ORIGIN_Y,siteArtPoint} from '../src/render/BridgeSiteArt';
import {halfWidth} from '../assets/map-studies/howling-abyss-v1/geometry';

describe('ice bridge site art',()=>{
 it('uses two large nexus cores without shop or spawn scenery',()=>{
  expect(BRIDGE_SITE_ART.map(s=>s.kind)).not.toContain('shop');
  expect(BRIDGE_SITE_ART.filter(s=>s.kind==='nexus')).toHaveLength(1);
  expect(BRIDGE_SITE_ART.filter(s=>s.kind==='nexusRed')).toHaveLength(1);
  expect(BRIDGE.relics).toHaveLength(0);
  expect(BRIDGE_SITE_ART.map(s=>s.kind)).not.toContain('relic');
  expect(BRIDGE_SITE_ART.filter(s=>s.kind.startsWith('nexus')).every(s=>s.size>=220)).toBe(true);
 });
 it('centers both Nexus cores and keeps all scenery on the deck',()=>{
  expect(NEXUS_FOOT_ORIGIN_Y).toBeCloseTo(920/1024);
  for(const site of BRIDGE_SITE_ART){
   expect(Math.abs(site.v)).toBeLessThan(halfWidth(BRIDGE,site.u));
   expect(site.v).toBe(0);
   expect(Number.isFinite(siteArtPoint(site).x)).toBe(true);
   expect(Number.isFinite(siteArtPoint(site).y)).toBe(true);
  }
 });
});
