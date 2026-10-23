/** Stable decoration parameters; independent of simulation and frame rate. */
const noise=(a:number,b:number)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
export function edgeSnowPatch(index:number,side:number){
 const a=noise(index,side*19),b=noise(index+71,side*31);
 return {alongJitter:(a-.5)*22,inset:14+b*22,width:88+Math.round(a*64),
  column:Math.floor(b*4),row:a>.76?1:2,alpha:.8+b*.2,
  fringeWidth:38+Math.round(b*26)};
}
export const BRIDGE_SURFACE={stoneVeil:.13,crackAlpha:.25,edgeDepth:22,edgeShade:.16} as const;

/** Shallow missing corners only, not open holes or a changed walkable outline. */
export function edgeChips(){
 const chips=[];
 for(let u=-689,i=0;u<700;u+=26,i++)for(const side of [-1,1]){
  const n=noise(i,side*41);
  if(n<.62)continue;
  chips.push({u:u+(n-.5)*8,side,width:3+n*3,depth:3+noise(i+8,side)*5});
 }
 return chips;
}
