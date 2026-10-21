/** Deterministic fire variation. Paused match time freezes every paired lamp. */
export function fireFlicker(time:number,station:number):number{
 const phase=station*.071;
 return 1
  +.12*Math.sin(time*5.3+phase)
  +.065*Math.sin(time*12.7+phase*1.63)
  +.025*Math.sin(time*23.1+phase*.47);
}

/** Crystals breathe slowly; their light must not compete with the fire. */
export function crystalBreath(time:number,phase:number):number{
 return 1+.035*Math.sin(time*.82+phase);
}
