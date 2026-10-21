import {describe,expect,it} from 'vitest';
import {fireFlicker,crystalBreath} from '../src/render/EnvironmentalLight';

describe('environmental light timing',()=>{
 it('keeps opposite rail braziers paired and bounded',()=>{
  for(let i=0;i<600;i++){
   const t=i/60,pulse=fireFlicker(t,330);
   expect(pulse).toBe(fireFlicker(t,330));
   expect(pulse).toBeGreaterThan(.78);
   expect(pulse).toBeLessThan(1.22);
  }
  expect(fireFlicker(1,330)).not.toBe(fireFlicker(1,405));
 });
 it('keeps crystal breathing quieter than fire',()=>{
  for(let i=0;i<300;i++)expect(Math.abs(crystalBreath(i/30,195)-1)).toBeLessThanOrEqual(.0351);
 });
});
