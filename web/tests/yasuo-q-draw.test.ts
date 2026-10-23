import {expect,it} from 'vitest';
import {HERO_ATTACHMENT_SCALE,HERO_EFFECT_SCALE} from '../src/render/Presentation';
import {qDrawPose,qSwordPose,qSwordFlash,Q_FLASH_START,Q_FLASH_DURATION} from '../src/render/YasuoQDraw';
it('retimes all draw frames and mirrors left-facing casts around the foot anchor',()=>{
  expect(qDrawPose(0,0).frame).toBe(0);
  expect(qDrawPose(.36,0).frame).toBe(18);
  expect(qDrawPose(.72,0).frame).toBe(36);
  for(const a of [Math.PI,2.1,-2.1])expect(qDrawPose(.2,a).flipX).toBe(true);
  expect(qDrawPose(.2,0).flipX).toBe(false);
  expect(qDrawPose(.2,Math.PI).originX).toBe(qDrawPose(.2,0).originX);
});
it('flashes once outside the body without traveling',()=>{
  for(const angle of [0,.7,Math.PI,4.5]){
    const a=qSwordFlash(Q_FLASH_START+.02,100,100,angle),b=qSwordFlash(Q_FLASH_START+.12,100,100,angle);
    expect(a.visible).toBe(true);expect(b.visible).toBe(true);
    expect([a.x,a.y]).toEqual([b.x,b.y]);
    const side=qDrawPose(Q_FLASH_START+.02,angle).flipX?-1:1;
    expect(a.x).toBeCloseTo(100+side*16*HERO_EFFECT_SCALE);
    expect(a.y).toBeCloseTo(100-30*HERO_EFFECT_SCALE);
    expect(a.scale).toBe(.65*HERO_ATTACHMENT_SCALE*.8);
    expect([a.originX,a.originY]).toEqual([14/135,8/39]);
    expect(qSwordFlash(.05,100,100,angle).visible).toBe(false);
    expect(qSwordFlash(Q_FLASH_START+Q_FLASH_DURATION+.001,100,100,angle).visible).toBe(false);
  }
});
it('aligns the animated sword to arbitrary angles without eight-way snapping',()=>{
  for(const a of [0,.17,1.23,2.74,-2.13]){
    expect(qSwordPose(.2,Math.cos(a),Math.sin(a)).rotation+Math.atan2(27,112)).toBeCloseTo(a);
  }
  expect(qSwordPose(0,1,0).frame).toBe(0);
  expect(qSwordPose(.72,1,0).frame).toBe(15);
});
it('aligns the short flash with the supplied v2 hand flash',()=>{
  expect(qDrawPose(Q_FLASH_START+.0001,0).frame).toBe(22);
  expect(qSwordFlash(Q_FLASH_START-.001,0,0,0).visible).toBe(false);
  expect(qSwordFlash(Q_FLASH_START+.02,0,0,0).alpha).toBe(1);
  expect(Q_FLASH_DURATION).toBe(.18);
});
