import { E } from '../../../../../src/game/YasuoE';

export const DIRECTIONS = [
  { id:'nw', label:'左上 ↖', x:-Math.SQRT1_2, y:-Math.SQRT1_2 },
  { id:'n', label:'正上 ↑', x:0, y:-1 },
  { id:'ne', label:'右上 ↗', x:Math.SQRT1_2, y:-Math.SQRT1_2 },
  { id:'w', label:'正左 ←', x:-1, y:0 },
  { id:'e', label:'正右 →', x:1, y:0 },
  { id:'sw', label:'左下 ↙', x:-Math.SQRT1_2, y:Math.SQRT1_2 },
  { id:'s', label:'正下 ↓', x:0, y:1 },
  { id:'se', label:'右下 ↘', x:Math.SQRT1_2, y:Math.SQRT1_2 },
] as const;
export const END_MS = 1200;
export function sample(ms:number) {
  const t=Math.max(0,ms);
  const progress=Math.max(0,Math.min(1,(t-E.startup*1000)/(E.dash*1000)));
  // Match the half-speed game timing, retaining empty lead/tail frames.
  const fxTime=t-200;
  return { progress, bodyFrame:Math.min(7,Math.floor(t/(E.duration*1000)*8)),
    ringFrame:fxTime>=0&&fxTime<800?Math.floor(fxTime/100):-1,
    phase:t<80?'起手':t<520?'滑行':t<800?'环斩收束':'结束' };
}
