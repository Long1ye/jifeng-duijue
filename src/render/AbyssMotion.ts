/** Presentation-only fall into the ravine; no collision or simulation state. */
export function abyssFall(age:number,index:number){
 if(age<0)return {x:0,y:0,scale:0,alpha:0};
 const scale=Math.max(0,1-age/3.2);
 return {x:Math.sin(index*2.4)*age*4,y:12*age+30*age*age,scale,alpha:scale*.7};
}
