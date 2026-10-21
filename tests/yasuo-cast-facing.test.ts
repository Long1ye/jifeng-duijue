import {expect,it} from 'vitest';
import {yasuoCastFacing} from '../src/render/YasuoCastFacing';
it('mirrors W/Q3 left-side casts with a matching foot anchor',()=>{
 for(const angle of [Math.PI*.75,Math.PI,Math.PI*1.25]){
  expect(yasuoCastFacing(angle)).toEqual({flipX:true,originX:80/128,originY:117/127});
 }
});
it('keeps right and vertical casts unmirrored',()=>{
 for(const angle of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2]){
  expect(yasuoCastFacing(angle)).toEqual({flipX:false,originX:48/128,originY:117/127});
 }
});
