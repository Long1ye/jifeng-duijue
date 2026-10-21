/** Mirror the fixed right-facing slash around its planted-foot anchor. */
export function yasuoCastFacing(facing:number){
 const flipX=Math.cos(facing)<-0.001;
 return {flipX,originX:flipX?1-48/128:48/128,originY:117/127};
}
