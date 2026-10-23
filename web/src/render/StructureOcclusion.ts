import type {Point} from '../game/types';

type StructureKind='nexus'|'inhibitor'|'tower'|'brush';

const VISUAL_BOUNDS:Record<StructureKind,{halfWidth:number;back:number;front:number}>={
  nexus:{halfWidth:120,back:205,front:28},
  inhibitor:{halfWidth:58,back:108,front:12},
  tower:{halfWidth:48,back:172,front:18},
  brush:{halfWidth:90,back:72,front:16},
};

const smoothstep=(edge0:number,edge1:number,value:number):number=>{
  const t=Math.max(0,Math.min(1,(value-edge0)/(edge1-edge0)));
  return t*t*(3-2*t);
};

/** Fade a tall structure only where its sprite can cover a mobile actor. */
export function structureOcclusionAlpha(kind:StructureKind,anchor:Point,actors:readonly Point[]):number {
  const bounds=VISUAL_BOUNDS[kind];
  let strongest=0;
  for(const actor of actors){
    const dx=Math.abs(actor.x-anchor.x)/bounds.halfWidth;
    const behind=anchor.y-actor.y;
    if(dx>=1||behind< -bounds.front||behind>=bounds.back)continue;
    const horizontal=1-smoothstep(.68,1,dx);
    const vertical=smoothstep(-bounds.front,8,behind)*(1-smoothstep(bounds.back*.77,bounds.back,behind));
    strongest=Math.max(strongest,horizontal*vertical);
  }
  return 1-.57*strongest;
}
