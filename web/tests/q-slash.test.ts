import {expect,it} from 'vitest';
import {qSlashFrame,qLightPoints} from '../src/render/YasuoQSlash';
it('retimes all W frames over the existing Q cast',()=>{
 expect(qSlashFrame(0)).toBe(0);expect(qSlashFrame(.36)).toBe(4);expect(qSlashFrame(.72)).toBe(7);
});
it('aligns the blade with arbitrary projectile angles',()=>{
 for(const a of [0,.173,.73,1.95,3.42,5.89]){
  const p=qLightPoints(50,70,Math.cos(a),Math.sin(a));
  expect(Math.atan2(p.tip.y-p.tail.y,p.tip.x-p.tail.x)).toBeCloseTo(Math.atan2(Math.sin(a),Math.cos(a)),10);
  expect(Math.hypot(p.tip.x-p.tail.x,p.tip.y-p.tail.y)).toBeCloseTo(27);
 }
});
