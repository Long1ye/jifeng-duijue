import initial from './layout.json';
export type Layout=typeof initial;
export function project(c:Layout,u:number,v:number):[number,number]{const p=c.projection;return [Math.round(p.origin[0]+u*p.along[0]+v*p.across[0]),Math.round(p.origin[1]+u*p.along[1]+v*p.across[1])];}
export function unproject(c:Layout,x:number,y:number):[number,number]{const p=c.projection,dx=x-p.origin[0],dy=y-p.origin[1],d=p.along[0]*p.across[1]-p.along[1]*p.across[0];return [(dx*p.across[1]-dy*p.across[0])/d,(dy*p.along[0]-dx*p.along[1])/d];}
export function halfWidth(c:Layout,u:number){const b=c.bridge,t=Math.max(0,Math.min(1,(Math.abs(u)-b.baseStart)/80));return b.halfWidth+(b.baseHalfWidth-b.halfWidth)*t;}
export function onBridge(c:Layout,u:number,v:number){return Math.abs(u)<=c.bridge.halfLength&&Math.abs(v)<=halfWidth(c,u);}
export function outline(c:Layout){const b=c.bridge;return [[-b.halfLength,-b.baseHalfWidth],[-b.baseStart-80,-b.baseHalfWidth],[-b.baseStart,-b.halfWidth],[b.baseStart,-b.halfWidth],[b.baseStart+80,-b.baseHalfWidth],[b.halfLength,-b.baseHalfWidth],[b.halfLength,b.baseHalfWidth],[b.baseStart+80,b.baseHalfWidth],[b.baseStart,b.halfWidth],[-b.baseStart,b.halfWidth],[-b.baseStart-80,b.baseHalfWidth],[-b.halfLength,b.baseHalfWidth]];}
