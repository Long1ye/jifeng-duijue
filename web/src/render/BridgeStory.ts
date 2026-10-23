import {BRIDGE,bridgePoint} from '../game/Bridge';

export const STORY_URLS=import.meta.glob('../../assets/map-modules/howling-story-v1/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const storyKey=(name:string)=>`bridge-story-${name}`;
export interface StoryMark {kind:'repair'|'damage';variant:number;u:number;v:number;width:number;height:number;turn:number;zone:'route'|'tower'|'battle'}
/** Authored clusters: a scar, its debris and nearby repair belong to the same event. */
export function storyMarks():StoryMark[]{
 const marks:StoryMark[]=[];
 const add=(kind:StoryMark['kind'],variant:number,u:number,v:number,width:number,height:number,zone:StoryMark['zone'],turn=0)=>marks.push({kind,variant,u,v,width,height,zone,turn});
 for(const side of [-1,1]){
  // Sparse maintained stretches; leave fountains quiet and the walking spine open.
  for(const [u,v] of [[585,26],[455,-26],[377,26]]){
   add('repair',1,side*u,v,13,26,'route');
   add('repair',3,side*(u+13),v,13,26,'route');
  }
  // Enemy-facing tower approach. The rear has repairs; the front has impact scars.
  for(const tower of [195,330]){
   const front=side*(tower-30);
   add('damage',1,front,-20,32,64,'tower');
   add('damage',0,front-side*12,-12,28,56,'tower');
   add('damage',3,front-side*8,9,24,48,'tower');
   const repairU=Math.round(tower/13)*13;
   add('repair',2,side*(repairU+13),26,13,26,'tower');
   add('repair',0,side*(repairU+26),26,13,26,'tower');
  }
  // Off-center battle clusters interrupt selected borders, not the central emblem.
  add('damage',2,side*88,side*20,38,76,'battle');
  add('damage',0,side*65,side*63,30,60,'battle');
  add('damage',3,side*77,side*74,22,44,'battle');
  add('repair',0,side*104,side*52,13,26,'battle');
 }
 return marks;
}
export function drawBridgeStory(ctx:CanvasRenderingContext2D,images:Record<string,HTMLImageElement>){
 const a=BRIDGE.projection.along,b=BRIDGE.projection.across;
 for(const mark of storyMarks()){
  const p=bridgePoint(mark.u,mark.v);
  ctx.save();
  ctx.transform(a[0]*mark.width,a[1]*mark.width,b[0]*mark.height,b[1]*mark.height,p.x,p.y);
  ctx.rotate(mark.turn*Math.PI/2);
  ctx.globalAlpha=mark.kind==='damage'?.82:1;
  ctx.drawImage(images[`${mark.kind}-${mark.variant}`],-.503,-.503,1.006,1.006);
  ctx.restore();
 }
}
