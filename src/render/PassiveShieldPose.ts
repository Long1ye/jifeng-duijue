const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
/** One-second defensive shell; a broken shield has only a brief visual release. */
export function passiveShieldPose(now:number,startedAt:number,until:number,brokenAt?:number){
 const age=now-startedAt,release=brokenAt===undefined?0:clamp((now-brokenAt)/.14);
 const end=brokenAt===undefined?until:Math.min(until,brokenAt+.14);
 const active=age>=0&&now<end;
 const alpha=active?(brokenAt===undefined?clamp((until-now)/.16):1-release)*(.3+.7*ease(age/.08)):0;
 return {active,alpha,frame:brokenAt===undefined?Math.floor(Math.max(0,age)*12)%8:Math.min(7,6+Math.floor(release*2)),
  scale:.84+.16*ease(age/.1)+release*.12};
}
