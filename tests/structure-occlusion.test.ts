import {describe,expect,it} from 'vitest';
import {structureOcclusionAlpha} from '../src/render/StructureOcclusion';

describe('bridge structure occlusion',()=>{
  const anchor={x:100,y:100};

  it('keeps a distant building fully opaque',()=>{
    expect(structureOcclusionAlpha('nexus',anchor,[{x:300,y:90}])).toBe(1);
  });

  it('reveals an actor behind a tall inhibitor without changing its position',()=>{
    const actor={x:100,y:53};
    expect(structureOcclusionAlpha('inhibitor',anchor,[actor])).toBeLessThan(.5);
    expect(actor).toEqual({x:100,y:53});
  });

  it('reveals an actor behind the larger nexus',()=>{
    expect(structureOcclusionAlpha('nexus',anchor,[{x:100,y:15}])).toBeLessThan(.5);
  });

  it('keeps the building opaque when the actor has cleared its silhouette',()=>{
    expect(structureOcclusionAlpha('inhibitor',anchor,[{x:170,y:53}])).toBe(1);
  });

  it('reveals actors behind a tower without fading distant towers',()=>{
    expect(structureOcclusionAlpha('tower',anchor,[{x:100,y:32}])).toBeLessThan(.5);
    expect(structureOcclusionAlpha('tower',anchor,[{x:160,y:32}])).toBe(1);
  });

  it('thins the foreground brush only when an actor enters it',()=>{
    expect(structureOcclusionAlpha('brush',anchor,[{x:100,y:72}])).toBeLessThan(.5);
    expect(structureOcclusionAlpha('brush',anchor,[{x:100,y:130}])).toBe(1);
  });

  it('does not fade for an actor in front of the structure',()=>{
    expect(structureOcclusionAlpha('nexus',anchor,[{x:100,y:145}])).toBe(1);
  });
});
