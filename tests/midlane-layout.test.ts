import {describe,it,expect} from 'vitest';
import config from '../assets/map-studies/midlane-v2/map.json';
import {terrainAt,walkable,tileKey,atlasCells} from '../assets/map-studies/midlane-v2/layout';
describe('modular midlane',()=>{
  it('keeps the central dueling space traversable',()=>{expect(terrainAt(config,512,320)).toBe('lane');expect(walkable(config,...config.spawn as [number,number])).toBe(true);});
  it('separates towers and map edges from walkable ground',()=>{expect(walkable(config,256,438)).toBe(false);expect(walkable(config,-1,320)).toBe(false);});
  it('keeps rotational terrain symmetry',()=>{for(let y=32;y<640;y+=64)for(let x=32;x<1024;x+=64)expect(terrainAt(config,x,y)).toBe(terrainAt(config,1024-x,640-y));});
  it('covers every dual grid transition',()=>{expect(new Set(atlasCells.map(c=>c.join())).size).toBe(16);for(let r=0;r<10;r++)for(let c=0;c<16;c++)expect(tileKey(config,c,r)).toBeLessThan(16);});
});
